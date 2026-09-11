#!/usr/bin/env python3
"""Promote source-checked AI election-contact reviews into the override authority record.

This is a guarded publication step, not source verification: freshness, packet binding,
conflicts, suppression, and review roles must already satisfy the policy before a
mailbox can become election-specific authority.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any, Mapping

try:
    from election_contact_common import (
        MAILBOX_RE,
        ValidationError,
        atomic_write,
        build_packets,
        canonical_stations,
        current_authority,
        review_binds_packet,
        review_validity_has_expired,
        distinct_paths,
        fail,
        load_json,
        sha256_json,
        source_is_fresh,
        station_is_suppressed,
        utc_now,
        validate_candidate_document,
        validate_overrides,
        validate_policy,
        validate_review_document,
    )
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from election_contact_common import (
        MAILBOX_RE,
        ValidationError,
        atomic_write,
        build_packets,
        canonical_stations,
        current_authority,
        review_binds_packet,
        review_validity_has_expired,
        distinct_paths,
        fail,
        load_json,
        sha256_json,
        source_is_fresh,
        station_is_suppressed,
        utc_now,
        validate_candidate_document,
        validate_overrides,
        validate_policy,
        validate_review_document,
    )




def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote source-checked AI election recipients; no human-quorum bypass exists."
    )
    parser.add_argument("--candidates", type=Path, default=Path("data/election_candidates.json"))
    parser.add_argument("--reviews", type=Path, help="Completed v2 source-checked AI reviews")
    parser.add_argument("--reviewers", type=Path, default=Path("data/election_reviewers.json"))
    parser.add_argument("--canonical", type=Path, default=Path("data/missions_canonical.json"))
    parser.add_argument("--overrides", type=Path, default=Path("data/overrides.json"))
    parser.add_argument("--station", action="append", default=[], metavar="STATION_ID")
    parser.add_argument("--dry-run", action="store_true", help="Report eligibility without modifying overrides")
    parser.add_argument("--report", type=Path, help="Required JSON report path with --dry-run")
    parser.add_argument(
        "--deactivate-station",
        action="append",
        default=[],
        metavar="STATION_ID",
        help="Explicitly remove a current election authority and suppress automatic same-election re-promotion",
    )
    args = parser.parse_args()
    if args.dry_run and args.report is None:
        parser.error("--dry-run requires --report")
    if args.report is not None and not args.dry_run:
        parser.error("--report is only available with --dry-run")
    if args.deactivate_station and (args.station or args.dry_run or args.reviews is not None):
        parser.error("--deactivate-station cannot be combined with --station, --reviews, or --dry-run")
    return args


def _deactivate(args: argparse.Namespace) -> int:
    # Deactivation removes current authority and records a same-election suppression.
    # It prevents an automated re-promotion from immediately undoing an explicit
    # withdrawal; a later election or reviewed policy change is handled elsewhere.
    distinct_paths(canonical=args.canonical, overrides=args.overrides)
    stations = canonical_stations(load_json(args.canonical, "canonical missions"))
    overrides = validate_overrides(load_json(args.overrides, "overrides"))
    if len(args.deactivate_station) != len(set(args.deactivate_station)):
        fail("A station can be selected for deactivation only once")
    baseline = sha256_json(overrides)
    updated = copy.deepcopy(overrides)
    mission_overrides = updated["missionOverrides"]
    for station_id in args.deactivate_station:
        if station_id not in stations:
            fail(f"Selected station {station_id} is not canonical")
        prior = mission_overrides.get(station_id)
        if not isinstance(prior, dict):
            fail(f"Selected station {station_id} has no active election authority to deactivate")
        email = prior.get("electionEmail")
        if not isinstance(email, str) or not MAILBOX_RE.fullmatch(email) or ".." in email:
            fail(f"Selected station {station_id} has no active election authority to deactivate")
        patch = copy.deepcopy(prior)
        del patch["electionEmail"]
        provenance = patch.get("_electionContactProvenance")
        election_id = provenance.get("electionId") if isinstance(provenance, dict) else None
        patch["_electionContactSuppression"] = {
            "schemaVersion": 2,
            "electionId": election_id if isinstance(election_id, str) and election_id else None,
            "deactivatedAt": utc_now(),
        }
        mission_overrides[station_id] = patch
    atomic_write(args.overrides, updated, expected_digest=baseline)
    print(f"Deactivated {len(args.deactivate_station)} election-specific contact(s).")
    return 0


def _reviews_by_station(
    reviews: Mapping[str, Any], packet_by_station: Mapping[str, Mapping[str, Any]]
) -> tuple[dict[str, list[dict[str, Any]]], set[str]]:
    # Reviews authorize only the immutable packet they inspected. A review for the
    # same election but a different packet is retained as stale evidence so callers
    # hold it for renewed review instead of silently discarding that safety signal.
    grouped: dict[str, list[dict[str, Any]]] = {}
    stale_active_stations: set[str] = set()
    for review in reviews.get("reviews", []):
        if not isinstance(review, dict):
            continue
        station_id = review.get("stationId")
        packet = packet_by_station.get(station_id) if isinstance(station_id, str) else None
        if packet is None:
            continue
        if review_binds_packet(review, packet):
            grouped.setdefault(station_id, []).append(review)
            continue
        packet_candidates = packet.get("candidates")
        election_id = packet_candidates[0].get("electionId") if isinstance(packet_candidates, list) and packet_candidates else None
        if review.get("electionId") == election_id:
            stale_active_stations.add(station_id)
    return grouped, stale_active_stations


def _hold(station_id: str, reason: str) -> dict[str, str]:
    return {"stationId": station_id, "reason": reason}


def _evaluate_station(
    station_id: str,
    *,
    groups: Mapping[str, list[dict[str, Any]]],
    incomplete_station_ids: set[str],
    stale_review_station_ids: set[str],
    packet_index: Mapping[str, Mapping[str, Any]],
    reviews: Mapping[str, list[dict[str, Any]]],
    overrides: Mapping[str, Any],
    policy: Mapping[str, Any],
    election_id: str,
) -> tuple[str, dict[str, Any] | None, dict[str, Any] | None]:
    """Return eligibility without treating a candidate or review as current authority.

    Fresh unambiguous evidence needs a primary acceptance. Competing mailboxes,
    same-election changes, or contrary reviews require an architect acceptance that
    resolves every contrary review before the override may change.
    """
    if station_id in incomplete_station_ids:
        return "held", _hold(station_id, "selected candidate group has incomplete evidence and must be refetched"), None
    candidates = groups.get(station_id, [])
    if not candidates:
        return "held", _hold(station_id, "no source-bound candidate evidence for selected station"), None
    # Suppression is checked before freshness or review quality: an explicit
    # withdrawal is authoritative for this election until deliberately superseded.
    if station_is_suppressed(overrides, station_id, election_id):
        return "held", _hold(station_id, "station is explicitly suppressed from automatic same-election promotion"), None
    emails = {candidate["email"] for candidate in candidates}
    authority = current_authority(overrides, station_id)
    if (
        len(emails) == 1
        and authority is not None
        and authority.get("electionId") == election_id
        and authority["email"] in emails
    ):
        return "unchanged", None, None
    max_age = policy["maxSourceAgeHours"]
    if len(emails) > 1:
        if any(not source_is_fresh(candidate["source"], max_age) for candidate in candidates):
            return "held", _hold(station_id, f"competing candidate source is older than policy maxSourceAgeHours={max_age}"), None
        promotable_candidates = candidates
    else:
        promotable_candidates = [
            candidate for candidate in candidates if source_is_fresh(candidate["source"], max_age)
        ]
        if not promotable_candidates:
            return "held", _hold(station_id, f"candidate source is older than policy maxSourceAgeHours={max_age}"), None
    packet = packet_index.get(station_id)
    if packet is None:
        return "held", _hold(station_id, "candidate station has no complete immutable packet"), None
    station_reviews = reviews.get(station_id, [])
    if not station_reviews:
        if station_id in stale_review_station_ids:
            return "held", _hold(station_id, "current candidate group has only stale review bindings and must be reviewed again"), None
        return "held", _hold(station_id, "missing completed primary source-checked review"), None
    primary = [review for review in station_reviews if review["reviewRole"] == "primary"]
    candidate_by_id = {candidate["candidateId"]: candidate for candidate in promotable_candidates}
    contrary_reviews = [review for review in station_reviews if review["decision"] != "accept"]
    same_election_change = (
        authority is not None and authority.get("electionId") == election_id and authority["email"] not in emails
    )
    requires_architect = len(emails) > 1 or same_election_change or bool(contrary_reviews)
    if not requires_architect:
        accepted = [
            review
            for review in primary
            if review["decision"] == "accept"
            and review["candidateId"] in candidate_by_id
            and not review_validity_has_expired(review)
        ]
        if not accepted:
            expired = any(
                review["decision"] == "accept"
                and review["candidateId"] in candidate_by_id
                and review_validity_has_expired(review)
                for review in primary
            )
            reason = "primary acceptance has a known passed validity deadline" if expired else "primary review did not accept the fresh unambiguous candidate"
            return "held", _hold(station_id, reason), None
        authorization_review = min(accepted, key=lambda review: review["reviewId"])
        return "eligible", candidate_by_id[authorization_review["candidateId"]], authorization_review
    architects = [
        review
        for review in station_reviews
        if review["reviewRole"] == "architect"
        and review["decision"] == "accept"
        and review["candidateId"] in candidate_by_id
        and not review_validity_has_expired(review)
    ]
    if not architects:
        expired = any(
            review["reviewRole"] == "architect"
            and review["decision"] == "accept"
            and review["candidateId"] in candidate_by_id
            and review_validity_has_expired(review)
            for review in station_reviews
        )
        reason = "architect acceptance has a known passed validity deadline" if expired else "conflict, address change, or contrary bound review requires architect acceptance"
        return "held", _hold(station_id, reason), None
    architect_emails = {candidate_by_id[review["candidateId"]]["email"] for review in architects}
    if len(architect_emails) != 1:
        return "held", _hold(station_id, "architect acceptances do not select one normalized email"), None
    selected_email = architect_emails.pop()
    contrary_ids = {review["reviewId"] for review in contrary_reviews}
    contrary_ids.update(
        review["reviewId"]
        for review in primary
        if review["decision"] == "accept"
        and review["candidateId"] in candidate_by_id
        and candidate_by_id[review["candidateId"]]["email"] != selected_email
    )
    resolving = [
        review
        for review in architects
        if candidate_by_id[review["candidateId"]]["email"] == selected_email
        and contrary_ids.issubset(set(review["resolvesReviewIds"]))
    ]
    if not resolving:
        return "held", _hold(station_id, "architect acceptance does not resolve every contrary bound review"), None
    authorization_review = min(resolving, key=lambda review: review["reviewId"])
    return "eligible", candidate_by_id[authorization_review["candidateId"]], authorization_review


def _promotion_provenance(candidate: Mapping[str, Any], review: Mapping[str, Any], packet: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": 2,
        "authorization": {"type": "ai", "reviewId": review["reviewId"], "reviewRole": review["reviewRole"]},
        "candidateId": candidate["candidateId"],
        "electionId": candidate["electionId"],
        "electionYear": candidate["electionYear"],
        "countryCode": candidate["countryCode"],
        "stationId": candidate["stationId"],
        "email": candidate["email"],
        "sourceId": candidate["sourceId"],
        "sourceUrl": candidate["source"]["sourceUrl"],
        "finalUrl": candidate["source"]["finalUrl"],
        "sourceChain": list(candidate["sourceChain"]),
        "candidateSetDigest": packet["candidateSetDigest"],
        "evidenceDigest": candidate["evidenceDigest"],
        "citations": copy.deepcopy(review["citations"]),
        "review": {
            "reviewedAt": review["reviewedAt"],
            "asOf": review["asOf"],
            "validity": copy.deepcopy(review["validity"]),
            "decision": review["decision"],
            "checks": copy.deepcopy(review["checks"]),
            "invocation": copy.deepcopy(review["invocation"]),
            "resolvesReviewIds": list(review["resolvesReviewIds"]),
        },
        "promotedAt": utc_now(),
    }


def promote(args: argparse.Namespace) -> int:
    distinct_paths(
        candidates=args.candidates,
        reviews=args.reviews,
        reviewers=args.reviewers,
        canonical=args.canonical,
        overrides=args.overrides,
        report=args.report,
    )
    candidate_payload = load_json(args.candidates, "candidates")
    canonical_payload = load_json(args.canonical, "canonical missions")
    policy_payload = load_json(args.reviewers, "reviewer policy")
    overrides = validate_overrides(load_json(args.overrides, "overrides"))
    stations = canonical_stations(canonical_payload)
    policy = validate_policy(policy_payload)
    candidate_document, _, groups = validate_candidate_document(candidate_payload, stations)
    if args.station:
        selected_station_ids = list(args.station)
        if len(selected_station_ids) != len(set(selected_station_ids)):
            fail("A station can be selected only once")
        for station_id in selected_station_ids:
            if station_id not in stations:
                fail(f"Selected station {station_id} is not canonical")
    else:
        selected_station_ids = list(candidate_document["pendingStationIds"])
    packet_document = build_packets(
        candidate_payload,
        canonical_payload,
        policy_payload,
        overrides,
        selected_station_ids,
    )
    packet_by_station = {packet["stationId"]: packet for packet in packet_document["packets"]}
    if args.reviews is None:
        review_document: dict[str, Any] = {
            "schemaVersion": 2,
            "asOf": packet_document["asOf"],
            "policyDigest": packet_document["policyDigest"],
            "canonicalDigest": packet_document["canonicalDigest"],
            "reviews": [],
        }
    else:
        review_document = validate_review_document(
            load_json(args.reviews, "AI reviews"), packet_document, allow_attested_import=True, allow_historical=True
        )
    reviews_by_station, stale_review_station_ids = _reviews_by_station(review_document, packet_by_station)
    eligible: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    held: list[dict[str, str]] = []
    unchanged: list[str] = []
    for station_id in sorted(selected_station_ids):
        state, selected, authorization_review = _evaluate_station(
            station_id,
            groups=groups,
            incomplete_station_ids=set(candidate_document["incompleteStationIds"]),
            stale_review_station_ids=stale_review_station_ids,
            packet_index=packet_by_station,
            reviews=reviews_by_station,
            overrides=overrides,
            policy=policy,
            election_id=candidate_document["electionId"],
        )
        if state == "eligible":
            assert selected is not None and authorization_review is not None
            eligible.append((station_id, selected, authorization_review))
        elif state == "unchanged":
            unchanged.append(station_id)
        else:
            assert selected is not None
            held.append(selected)
    report = {
        "eligibleStationIds": [station_id for station_id, _, _ in eligible],
        "held": held,
        "unchangedStationIds": unchanged,
    }
    if args.dry_run:
        assert args.report is not None
        atomic_write(args.report, report)
        print(json.dumps(report, ensure_ascii=False, separators=(",", ":")))
        return 0
    if held:
        fail("Selected promotion batch is not eligible: " + "; ".join(item["reason"] for item in held))
    if not eligible:
        print("Promoted 0 election-specific contact(s); selected authority was already unchanged.")
        return 0
    # Capture the exact input version before preparing the patch. atomic_write's
    # expected digest protects this single overrides file from a concurrent update;
    # it cannot make source fetches, candidate evidence, and reviews one transaction.
    baseline = sha256_json(overrides)
    updated = copy.deepcopy(overrides)
    mission_overrides = updated["missionOverrides"]
    for station_id, candidate, review in eligible:
        packet = packet_by_station[station_id]
        previous = mission_overrides.get(station_id)
        if previous is not None and not isinstance(previous, dict):
            fail(f"Override for {station_id} must be an object")
        patch = copy.deepcopy(previous) if isinstance(previous, dict) else {}
        # Preserve the prior provenance for later audit rather than overwriting the
        # record that explains why the previous election-specific mailbox was chosen.
        old_provenance = patch.get("_electionContactProvenance")
        if isinstance(old_provenance, dict):
            patch["_previousElectionContactProvenance"] = copy.deepcopy(old_provenance)
        patch["electionEmail"] = candidate["email"]
        patch["_electionContactProvenance"] = _promotion_provenance(candidate, review, packet)
        mission_overrides[station_id] = patch
    atomic_write(args.overrides, updated, expected_digest=baseline)
    print(f"Promoted {len(eligible)} election-specific contact(s).")
    return 0


def main() -> int:
    args = parse_args()
    try:
        if args.deactivate_station:
            return _deactivate(args)
        return promote(args)
    except (ValidationError, OSError, json.JSONDecodeError) as error:
        print(f"Promotion aborted: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
