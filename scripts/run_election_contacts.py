#!/usr/bin/env python3
"""Run one serialized, staged election-contact workflow with audit recovery.

Discovery writes source evidence, review produces or imports only attested AI
evidence, and promotion first writes a readiness dry-run.  The default run has
durable discovery/report side effects but never changes recipient overrides;
``--apply`` is a separate final phase limited to groups eligible in this run.
Every phase is recorded in a per-run directory so an interrupted workflow can
be inspected and safely resumed by a later run rather than guessed at.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence


ROOT = Path(__file__).resolve().parent.parent


class RunnerError(RuntimeError):
    """A workflow phase could not complete safely."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + secrets.token_hex(6)


DEFAULT_MAX_DEPTH = 2
DEEP_RETRY_MAX_DEPTH = 6
DEFAULT_MAX_PAGES = 80
DEEP_RETRY_MAX_PAGES = 240


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run bounded election-contact discovery, packet export, and promotion readiness. "
            "Full refresh is explicit; there are no automatic broad retries."
        )
    )
    parser.add_argument("--election-id", required=True, help="Election identifier recorded in all evidence.")
    parser.add_argument("--mode", choices=("incremental", "full", "deep-retry"), default="incremental")
    parser.add_argument("--station", action="append", default=[], help="Limit work to a canonical station ID; repeatable.")
    parser.add_argument(
        "--notice-url",
        action="append",
        default=[],
        metavar="STATION_ID=HTTPS_URL",
        help="Add one official mission notice URL for a selected station; repeatable.",
    )
    parser.add_argument("--max-hosts", type=int, default=5, help="Bound distinct mission hosts (0 means all only in full mode).")
    parser.add_argument(
        "--max-pages",
        type=int,
        help="Bound public pages fetched by discovery (default: 240 for deep-retry, otherwise 80).",
    )
    parser.add_argument("--timeout", type=float, default=15.0, help="Per-request timeout in seconds.")
    review_mode = parser.add_mutually_exclusive_group()
    review_mode.add_argument("--review", action="store_true", help="Call the configured ELECTION_AI_* endpoint for a primary review.")
    review_mode.add_argument("--import-reviews", type=Path, help="Import reviews collected from actual harness invocations.")
    parser.add_argument(
        "--attest-import",
        action="store_true",
        help="Attest locally that --import-reviews came from actual harness invocations.",
    )
    parser.add_argument("--apply", action="store_true", help="Promote only groups eligible in this run's dry-run.")
    args = parser.parse_args(argv)
    args.max_pages = args.max_pages if args.max_pages is not None else (
        DEEP_RETRY_MAX_PAGES if args.mode == "deep-retry" else DEFAULT_MAX_PAGES
    )
    args.max_depth = DEEP_RETRY_MAX_DEPTH if args.mode == "deep-retry" else DEFAULT_MAX_DEPTH
    if args.max_hosts < 0:
        parser.error("--max-hosts must be zero or greater")
    if args.max_pages <= 0:
        parser.error("--max-pages must be greater than zero")
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    if args.max_hosts == 0 and args.mode != "full":
        parser.error("--max-hosts 0 is permitted only with --mode full")
    if args.mode == "deep-retry" and not args.station:
        parser.error("--mode deep-retry requires at least one --station")
    if args.notice_url and not args.station:
        parser.error("--notice-url requires at least one --station")
    selected_stations = set(args.station)
    for notice_url in args.notice_url:
        station_id, separator, url = notice_url.partition("=")
        if not separator or not station_id or not url:
            parser.error("--notice-url must use STATION_ID=HTTPS_URL")
        if station_id not in selected_stations:
            parser.error(f"--notice-url station {station_id!r} must be selected with --station")
    if args.attest_import and args.import_reviews is None:
        parser.error("--attest-import requires --import-reviews")
    if args.import_reviews is not None and not args.attest_import:
        parser.error("--import-reviews requires --attest-import")
    if args.apply and not (args.review or args.import_reviews is not None):
        parser.error("--apply requires --review or --import-reviews with --attest-import")
    return args


def resolved(path: Path) -> Path:
    return path.resolve(strict=False)


def assert_distinct_paths(paths: dict[str, Path]) -> None:
    names = list(paths)
    for index, name in enumerate(names):
        for other_name in names[index + 1 :]:
            if resolved(paths[name]) == resolved(paths[other_name]):
                raise RunnerError(f"Refusing aliased workflow paths: {name} and {other_name}")


def acquire_lock(path: Path):
    # One lock covers every durable artifact below; concurrent runs could
    # otherwise copy stale candidates or overwrite review/audit state.
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        handle.close()
        raise RunnerError(f"Another election-contact workflow owns {path}") from error
    return handle


def atomic_copy(source: Path, destination: Path) -> None:
    # Replacing a completed temporary file keeps a crash from exposing a
    # partially copied durable artifact.
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=f".{destination.name}.", delete=False) as handle:
        temporary = Path(handle.name)
        with source.open("rb") as input_handle:
            shutil.copyfileobj(input_handle, handle)
    try:
        os.replace(temporary, destination)
    except OSError:
        temporary.unlink(missing_ok=True)
        raise


def atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        temporary = Path(handle.name)
    try:
        os.replace(temporary, path)
    except OSError:
        temporary.unlink(missing_ok=True)
        raise


def copy_if_present(source: Path, destination: Path) -> None:
    if source.exists():
        atomic_copy(source, destination)


def read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise RunnerError(f"Cannot read {label} at {path}: {error}") from error
    if not isinstance(value, dict):
        raise RunnerError(f"{label} at {path} must be a JSON object")
    return value


def review_binding(document: dict[str, Any], label: str) -> tuple[int, str, str]:
    schema_version = document.get("schemaVersion")
    policy_digest = document.get("policyDigest")
    canonical_digest = document.get("canonicalDigest")
    if not isinstance(schema_version, int) or not isinstance(policy_digest, str) or not isinstance(canonical_digest, str):
        raise RunnerError(f"{label} has an invalid review-document binding")
    return schema_version, policy_digest, canonical_digest

def review_records_by_id(document: dict[str, Any], label: str) -> dict[str, dict[str, Any]]:
    records = document.get("reviews")
    if not isinstance(records, list) or not all(isinstance(record, dict) for record in records):
        raise RunnerError(f"{label} must contain a reviews array")
    indexed: dict[str, dict[str, Any]] = {}
    for record in records:
        review_id = record.get("reviewId")
        if not isinstance(review_id, str) or not review_id:
            raise RunnerError(f"{label} contains a review without an immutable reviewId")
        prior = indexed.get(review_id)
        if prior is not None and prior != record:
            raise RunnerError(f"{label} contains conflicting immutable reviewId {review_id}")
        indexed[review_id] = record
    return indexed


def merge_reviews(durable: Path, reviewed: Path) -> None:
    """Persist only review records sharing the current document binding."""
    # Reviews are immutable evidence.  Refuse cross-snapshot merges rather than
    # making a historical approval appear to apply to new candidates.
    if not reviewed.exists():
        raise RunnerError(f"Review phase did not create {reviewed}")
    current = read_json(reviewed, "run reviews")
    current_binding = review_binding(current, "Run reviews")
    current_records = review_records_by_id(current, "Run reviews")
    if not durable.exists():
        atomic_copy(reviewed, durable)
        return
    prior = read_json(durable, "durable reviews")
    if review_binding(prior, "Durable reviews") != current_binding:
        raise RunnerError(
            "Refusing to merge review documents with different bindings; retain historical reviews separately"
        )
    previous_records = review_records_by_id(prior, "Durable reviews")
    merged = dict(previous_records)
    for review_id, record in current_records.items():
        prior_record = merged.get(review_id)
        if prior_record is not None and prior_record != record:
            raise RunnerError(f"Conflicting immutable reviewId {review_id}")
        merged[review_id] = record
    payload = dict(current)
    payload["reviews"] = [merged[review_id] for review_id in sorted(merged)]
    atomic_json(durable, payload)


def run_phase(name: str, command: list[str], audit: dict[str, Any], cwd: Path) -> None:
    audit["phases"].append({"name": name, "command": command})
    print(f"Running {name}: {' '.join(command)}", flush=True)
    try:
        subprocess.run(command, check=True, cwd=cwd)
    except (OSError, subprocess.CalledProcessError) as error:
        raise RunnerError(f"{name} failed; no later workflow phase was run: {error}") from error


def print_worklist(candidates_path: Path, station_filter: set[str] | None = None) -> list[str]:
    candidates = read_json(candidates_path, "candidates")
    station_ids = candidates.get("pendingStationIds")
    if not isinstance(station_ids, list) or not all(isinstance(station_id, str) and station_id for station_id in station_ids):
        raise RunnerError("Candidates must contain a pendingStationIds array")
    worklist = sorted(set(station_ids) if station_filter is None else set(station_ids) & station_filter)
    rendered = ", ".join(worklist) if worklist else "none"
    print(f"Worklist ({len(worklist)} pending station group(s)): {rendered}", flush=True)
    return worklist


def read_dry_run(path: Path) -> tuple[list[str], list[dict[str, Any]], list[str]]:
    report = read_json(path, "promotion dry-run report")
    eligible = report.get("eligibleStationIds")
    held = report.get("held")
    unchanged = report.get("unchangedStationIds")
    if (
        not isinstance(eligible, list)
        or not all(isinstance(station_id, str) and station_id for station_id in eligible)
        or not isinstance(held, list)
        or not all(isinstance(item, dict) for item in held)
        or not isinstance(unchanged, list)
        or not all(isinstance(station_id, str) and station_id for station_id in unchanged)
    ):
        raise RunnerError("Promotion dry-run report has an invalid eligibility schema")
    return sorted(set(eligible)), held, sorted(set(unchanged))


def run_workflow(args: argparse.Namespace, root: Path = ROOT) -> Path:
    data_dir = root / "data"
    run_id = new_run_id()
    run_dir = data_dir / "election_runs" / run_id
    paths = {
        "durable candidates": data_dir / "election_candidates.json",
        "durable reviews": data_dir / "election_ai_reviews.json",
        "crawl state": data_dir / "election_crawl_state.json",
        "review policy": data_dir / "election_reviewers.json",
        "canonical missions": data_dir / "missions_canonical.json",
        "MFA registry": data_dir / "mfa_representations.json",
        "overrides": data_dir / "overrides.json",
        "run candidates": run_dir / "candidates.json",
        "run reviews": run_dir / "reviews.json",
        "review packets": run_dir / "review-packets.json",
        "discovery report": run_dir / "discovery-report.json",
        "promotion report": run_dir / "promotion-dry-run.json",
        "audit": run_dir / "run.json",
        "workflow lock": data_dir / ".election_contacts.lock",
    }
    assert_distinct_paths(paths)
    if args.import_reviews is not None and resolved(args.import_reviews) in {
        resolved(path) for path in paths.values()
    }:
        raise RunnerError("Imported reviews must not alias workflow state or an artifact destination")

    audit: dict[str, Any] = {
        "schemaVersion": 1,
        "runId": run_id,
        "startedAt": utc_now(),
        "electionId": args.election_id,
        "mode": args.mode,
        "stations": list(args.station),
        "noticeUrls": list(args.notice_url),
        "limits": {
            "maxHosts": args.max_hosts,
            "maxPages": args.max_pages,
            "maxDepth": args.max_depth,
            "timeout": args.timeout,
        },
        "reviewRoute": "endpoint" if args.review else "attested_import" if args.import_reviews else "packet_export",
        "applyRequested": args.apply,
        "artifacts": {name: str(path.relative_to(root)) for name, path in paths.items() if name not in {"workflow lock"}},
        "phases": [],
    }
    lock = acquire_lock(paths["workflow lock"])
    # The run directory is a staged audit boundary.  Its creation under the
    # workflow lock makes artifacts from overlapping runs distinguishable.
    try:
        run_dir.mkdir(parents=True, exist_ok=False)
        copy_if_present(paths["durable candidates"], paths["run candidates"])
        if args.review or args.import_reviews is not None:
            copy_if_present(paths["durable reviews"], paths["run reviews"])
        crawler = [
            sys.executable,
            str(root / "scripts" / "discover_election_contacts.py"),
            "--election-id", args.election_id,
            "--output", str(paths["run candidates"]),
            "--state", str(paths["crawl state"]),
            "--report", str(paths["discovery report"]),
            "--missions", str(paths["canonical missions"]),
            "--registry", str(paths["MFA registry"]),
            "--overrides", str(paths["overrides"]),
            "--mode", args.mode,
            "--max-hosts", str(args.max_hosts),
            "--max-pages", str(args.max_pages),
            "--timeout", str(args.timeout),
        ]
        if args.mode == "deep-retry":
            crawler.extend(("--max-depth", str(DEEP_RETRY_MAX_DEPTH)))
        for station_id in args.station:
            crawler.extend(("--station", station_id))
        for notice_url in args.notice_url:
            crawler.extend(("--notice-url", notice_url))
        run_phase("discovery", crawler, audit, root)
        # Discovery succeeds only after its run-local artifacts exist; copying
        # candidates here is the default workflow's deliberate durable update.
        if not paths["run candidates"].exists() or not paths["discovery report"].exists():
            raise RunnerError("Discovery succeeded without writing its required run artifacts")
        atomic_copy(paths["run candidates"], paths["durable candidates"])
        worklist = print_worklist(paths["run candidates"], set(args.station) if args.station else None)
        if not worklist:
            zero_readiness = {
                "eligibleStationIds": [],
                "held": [],
                "unchangedStationIds": [],
            }
            atomic_json(paths["promotion report"], zero_readiness)
            audit["promotion"] = zero_readiness
            audit["status"] = "completed"
            audit["completedAt"] = utc_now()
            atomic_json(paths["audit"], audit)
            print("No selected pending station groups; review and promotion were skipped.", flush=True)
            print(f"Run artifacts: {run_dir}", flush=True)
            return run_dir


        review = [
            sys.executable,
            str(root / "scripts" / "review_election_candidates.py"),
            "--input", str(paths["run candidates"]),
            "--output", str(paths["run reviews"]),
            "--canonical", str(paths["canonical missions"]),
            "--reviewers", str(paths["review policy"]),
            "--overrides", str(paths["overrides"]),
            "--role", "primary",
        ]
        for station_id in worklist:
            review.extend(("--station", station_id))
        if args.import_reviews is not None:
            review.extend(("--import-reviews", str(args.import_reviews), "--attest-import"))
        elif not args.review:
            review.extend(("--export-packet", str(paths["review packets"])))
        review.extend(("--timeout", str(args.timeout)))
        run_phase("review packet export" if not (args.review or args.import_reviews) else "review", review, audit, root)
        # Packet export is an offline handoff, not a review.  Only the explicit
        # review routes may add durable AI evidence.
        if not args.review and args.import_reviews is None and not paths["review packets"].exists():
            raise RunnerError("Packet export succeeded without writing the review packet artifact")
        if args.review or args.import_reviews is not None:
            merge_reviews(paths["durable reviews"], paths["run reviews"])

        promotion = [
            sys.executable,
            str(root / "scripts" / "promote_election_contacts.py"),
            "--candidates", str(paths["run candidates"]),
            "--reviewers", str(paths["review policy"]),
            "--canonical", str(paths["canonical missions"]),
            "--overrides", str(paths["overrides"]),
        ]
        if args.review or args.import_reviews is not None:
            promotion.extend(("--reviews", str(paths["run reviews"])))
        dry_run = [
        # Dry-run records current eligibility without changing overrides.  Apply
        # is built separately below from this run's eligible station IDs.
            *promotion,
            *(argument for station_id in worklist for argument in ("--station", station_id)),
            "--dry-run",
            "--report",
            str(paths["promotion report"]),
        ]
        run_phase("promotion dry-run", dry_run, audit, root)
        eligible, held, unchanged = read_dry_run(paths["promotion report"])
        eligible = [station_id for station_id in eligible if station_id in worklist]
        held = [item for item in held if item.get("stationId") in worklist]
        unchanged = [station_id for station_id in unchanged if station_id in worklist]
        audit["promotion"] = {
            "eligibleStationIds": eligible,
            "held": held,
            "unchangedStationIds": unchanged,
        }
        print(
            f"Promotion readiness: {len(eligible)} eligible, {len(held)} held, {len(unchanged)} unchanged.",
            flush=True,
        )
        if held:
            print("Held stations: " + ", ".join(str(item.get("stationId", "unknown")) for item in held), flush=True)

        if args.apply and eligible:
            # Promotion revalidates current inputs; the dry-run narrows scope
            # but is not itself authorization to overwrite an override.
            apply_command = list(promotion)
            for station_id in eligible:
                apply_command.extend(("--station", station_id))
            run_phase("promotion apply", apply_command, audit, root)
            audit["appliedStationIds"] = eligible
            print("Promoted station groups: " + ", ".join(eligible), flush=True)
        elif args.apply:
            audit["appliedStationIds"] = []
            print("No station groups were eligible; overrides were not changed.", flush=True)

        audit["status"] = "completed"
        audit["completedAt"] = utc_now()
        atomic_json(paths["audit"], audit)
        print(f"Run artifacts: {run_dir}", flush=True)
        return run_dir
    except Exception as error:
        # Preserve the completed phase list and failure reason so operators can
        # distinguish a partial durable run from a clean completed one.
        audit["status"] = "failed"
        audit["failedAt"] = utc_now()
        audit["failure"] = str(error)
        try:
            atomic_json(paths["audit"], audit)
        except OSError:
            pass
        raise
    finally:
        fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
        lock.close()


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        run_workflow(args)
    except RunnerError as error:
        print(f"election-contact workflow: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
