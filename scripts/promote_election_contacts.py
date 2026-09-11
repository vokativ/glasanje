#!/usr/bin/env python3
"""Promote human-approved, election-specific public contact evidence to overrides."""

import argparse
import copy
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from election_contact_contract import (
    ContractError,
    election_authority_is_expired,
    parse_utc_timestamp,
    require_mailbox,
    validate_election_authority,
    validate_evidence_snapshot,
    validate_human_approval,
)

ADVISORY_DECISIONS = {"accept", "needs_human"}
REVIEW_DECISIONS = ADVISORY_DECISIONS | {"reject"}


ELECTION_YEAR_RE = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")




ValidationError = ContractError


def fail(message: str) -> None:
    raise ValidationError(message)


def load_json(path: Path, label: str) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Cannot read {label} at {path}: {error}")


def write_json_atomically(path: Path, payload: Any) -> None:
    temp_path = path.with_name(f".{path.name}.tmp")
    try:
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_path, path)
    except OSError as error:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass
        fail(f"Cannot write overrides at {path}: {error}")


def require_string(record: dict[str, Any], field: str, label: str) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value or value != value.strip():
        fail(f"{label} requires a non-empty {field} without surrounding whitespace")
    return value


def require_candidate_mailbox(record: dict[str, Any], field: str, label: str) -> str:
    return require_mailbox(record.get(field), label)


def require_timestamp(value: str, label: str) -> None:
    parse_utc_timestamp(value, label)


def election_year_for(election_id: str, label: str) -> str:
    years = {match.group(1) for match in ELECTION_YEAR_RE.finditer(election_id)}
    if len(years) != 1:
        fail(f"{label} must contain exactly one four-digit election year")
    return years.pop()


def has_election_year(text: str, election_year: str) -> bool:
    return bool(re.search(rf"(?<!\d){re.escape(election_year)}(?!\d)", text))



def records_from(payload: Any, field: str, label: str) -> list[dict[str, Any]]:
    if not isinstance(payload, dict) or not isinstance(payload.get(field), list):
        fail(f"{label} must be an object with a {field} array")
    records = payload[field]
    if not all(isinstance(record, dict) for record in records):
        fail(f"{label} contains a non-object record")
    return records


def normalized_https_host(url: str, label: str) -> str:
    parsed = urlparse(url)
    try:
        port = parsed.port
    except ValueError:
        fail(f"{label} has an invalid port")
    host = parsed.hostname
    if (
        parsed.scheme != "https"
        or not host
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
    ):
        fail(f"{label} must be an absolute HTTPS URL without credentials")
    return host.lower().rstrip(".")


def parse_source(url: str, supplied_host: str, label: str) -> str:
    host = normalized_https_host(url, f"{label} sourceUrl")
    if host != "mfa.gov.rs" and not host.endswith(".mfa.gov.rs"):
        fail(f"{label} sourceUrl must be hosted by MFA or an MFA mission subdomain")
    if supplied_host.lower().rstrip(".") != host:
        fail(f"{label} sourceHost does not match sourceUrl")
    return host


def canonical_website_host(station: dict[str, Any], label: str) -> str | None:
    website = station.get("website")
    if not isinstance(website, str) or not website:
        return None
    return normalized_https_host(website, f"{label} canonical mission website")


def canonical_stations(payload: Any) -> dict[str, tuple[str, dict[str, Any]]]:
    if not isinstance(payload, dict) or not isinstance(payload.get("countries"), list):
        fail("Canonical missions data must contain a countries array")
    stations: dict[str, tuple[str, dict[str, Any]]] = {}
    for country in payload["countries"]:
        if not isinstance(country, dict):
            fail("Canonical missions data contains a malformed country")
        country_code = country.get("countryCode")
        station_list = country.get("stations")
        if not isinstance(country_code, str) or not isinstance(station_list, list):
            fail("Canonical missions data contains a malformed country record")
        for station in station_list:
            if not isinstance(station, dict) or not isinstance(station.get("id"), str):
                fail("Canonical missions data contains a malformed station")
            station_id = station["id"]
            if station_id in stations:
                fail(f"Canonical missions data repeats station {station_id}")
            stations[station_id] = (country_code, station)
    return stations


def validate_candidates(payload: Any, stations: dict[str, tuple[str, dict[str, Any]]]) -> dict[str, dict[str, Any]]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 2:
        fail("Candidates must be a schemaVersion 2 object")
    election_id = require_string(payload, "electionId", "Candidates")
    election_year = election_year_for(election_id, "Candidates electionId")
    if require_string(payload, "electionYear", "Candidates") != election_year:
        fail("Candidates electionYear does not match candidates electionId")
    generated_at = require_string(payload, "generatedAt", "Candidates")
    require_timestamp(generated_at, "Candidates generatedAt")
    candidates: dict[str, dict[str, Any]] = {}
    for index, candidate in enumerate(records_from(payload, "candidates", "Candidates")):
        label = f"Candidate #{index + 1}"
        candidate_id = require_string(candidate, "candidateId", label)
        if candidate_id in candidates:
            fail(f"Duplicate candidateId {candidate_id}")
        candidate_election_id = require_string(candidate, "electionId", label)
        if candidate_election_id != election_id:
            fail(f"{label} electionId does not match candidates electionId")
        candidate_election_year = require_string(candidate, "electionYear", label)
        if candidate_election_year != election_year:
            fail(f"{label} electionYear does not match candidates electionId")
        country_code = require_string(candidate, "countryCode", label)
        station_id = require_string(candidate, "stationId", label)
        email = require_candidate_mailbox(candidate, "email", label)
        selected_for_promotion = candidate.get("selectedForPromotion")
        if type(selected_for_promotion) is not bool:
            fail(f"{label} requires boolean selectedForPromotion")
        title = require_string(candidate, "title", label)
        election_context = require_string(candidate, "electionContext", label)
        source_quote = require_string(candidate, "sourceQuote", label)
        if not (
            has_election_year(election_context, candidate_election_year)
            or has_election_year(source_quote, candidate_election_year)
        ):
            fail(f"{label} electionContext or sourceQuote does not visibly contain electionYear")
        source_url = require_string(candidate, "sourceUrl", label)
        source_host_value = candidate.get("sourceHost")
        if (
            not isinstance(source_host_value, str)
            or not source_host_value
            or source_host_value != source_host_value.strip()
        ):
            fail(f"{label} requires a non-empty sourceHost without surrounding whitespace")
        observed_at = require_string(candidate, "observedAt", label)
        require_timestamp(observed_at, f"{label} observedAt")
        visible_email = re.compile(
            rf"(?<![A-Za-z0-9_.%+-]){re.escape(email)}(?![A-Za-z0-9-]|\.[A-Za-z0-9-])",
            re.IGNORECASE,
        )
        if not visible_email.search(source_quote):
            fail(f"{label} sourceQuote does not visibly contain its exact email")
        source_host = parse_source(source_url, source_host_value, label)
        station_entry = stations.get(station_id)
        if station_entry is None:
            fail(f"{label} references an unknown station")
        canonical_country, station = station_entry
        if country_code != canonical_country:
            fail(f"{label} countryCode does not resolve to station {station_id}")
        canonical_host = canonical_website_host(station, label)
        if canonical_host is not None and source_host != canonical_host:
            fail(f"{label} sourceHost does not match the station's canonical mission website")
        evidence_snapshot = validate_evidence_snapshot(
            candidate.get("evidenceSnapshot"), f"{label} evidenceSnapshot"
        )
        expected_evidence = {
            "sourceUrl": source_url,
            "sourceHost": source_host,
            "title": title,
            "electionContext": election_context,
            "sourceQuote": source_quote,
            "email": email,
        }
        if evidence_snapshot["capturedAt"] != observed_at or evidence_snapshot["content"] != expected_evidence:
            fail(f"{label} evidenceSnapshot must bind the exact candidate evidence")
        candidates[candidate_id] = {
            "candidateId": candidate_id,
            "electionId": candidate_election_id,
            "electionYear": candidate_election_year,
            "countryCode": country_code,
            "stationId": station_id,
            "email": email,
            "title": title,
            "electionContext": election_context,
            "sourceQuote": source_quote,
            "sourceUrl": source_url,
            "sourceHost": source_host,
            "observedAt": observed_at,
            "selectedForPromotion": selected_for_promotion,
            "evidenceSnapshot": {
                key: value for key, value in evidence_snapshot.items() if key != "_parsedCapturedAt"
            },
        }
    return candidates


def validate_reviews(payload: Any, candidates: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    reviews: dict[str, dict[str, Any]] = {}
    for index, review in enumerate(records_from(payload, "reviews", "AI reviews")):
        label = f"AI review #{index + 1}"
        candidate_id = require_string(review, "candidateId", label)
        election_id = require_string(review, "electionId", label)
        decision = require_string(review, "decision", label)
        review_status = require_string(review, "reviewStatus", label)
        candidate = candidates.get(candidate_id)
        if candidate is None:
            fail(f"{label} references an unknown candidate")
        if election_id != candidate["electionId"]:
            fail(f"{label} electionId does not match candidate {candidate_id}")
        if candidate_id in reviews:
            fail(f"Duplicate AI review for candidate {candidate_id}")
        if review_status != "completed":
            fail(f"{label} did not complete")
        if decision not in REVIEW_DECISIONS:
            fail(f"{label} has an unknown decision")
        reviews[candidate_id] = {"decision": decision}
    return reviews


def validate_reviewer_policy(payload: Any) -> tuple[set[str], int]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        fail("Reviewer policy must be a schemaVersion 1 object")
    reviewer_ids = payload.get("reviewerIds")
    if not isinstance(reviewer_ids, list) or not all(
        isinstance(reviewer_id, str) and reviewer_id and reviewer_id == reviewer_id.strip()
        for reviewer_id in reviewer_ids
    ):
        fail("Reviewer policy must contain non-empty reviewerIds")
    if len(reviewer_ids) != len(set(reviewer_ids)):
        fail("Reviewer policy repeats a reviewerId")
    required_human_approvals = payload.get("requiredHumanApprovals")
    if (
        type(required_human_approvals) is not int
        or required_human_approvals < 1
        or required_human_approvals > len(reviewer_ids)
    ):
        fail("Reviewer policy requires requiredHumanApprovals within reviewerIds")
    return set(reviewer_ids), required_human_approvals


def validate_approvals(
    payload: Any,
    candidates: dict[str, dict[str, Any]],
    allowed_reviewer_ids: set[str],
    now: datetime,
) -> dict[str, list[dict[str, str]]]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 2:
        fail("Approvals must be a schemaVersion 2 object")
    approvals: dict[str, list[dict[str, str]]] = {candidate_id: [] for candidate_id in candidates}
    approval_fields = {
        "candidateId",
        "electionId",
        "reviewerId",
        "reviewerType",
        "decision",
        "approvedAt",
        "expiresAt",
        "evidenceSha256",
    }
    for index, approval in enumerate(records_from(payload, "approvals", "Approvals")):
        label = f"Approval #{index + 1}"
        if set(approval) != approval_fields:
            fail(f"{label} must contain exactly {sorted(approval_fields)}")
        candidate_id = require_string(approval, "candidateId", label)
        election_id = require_string(approval, "electionId", label)
        candidate = candidates.get(candidate_id)
        if candidate is None:
            fail(f"{label} references an unknown candidate")
        if election_id != candidate["electionId"]:
            fail(f"{label} electionId does not match candidate {candidate_id}")
        reviewer_id = require_string(approval, "reviewerId", label)
        if reviewer_id not in allowed_reviewer_ids:
            fail(f"{label} reviewerId is not in the reviewed allow-list")
        validated = validate_human_approval(
            {
                key: approval[key]
                for key in (
                    "reviewerId",
                    "reviewerType",
                    "decision",
                    "approvedAt",
                    "expiresAt",
                    "evidenceSha256",
                )
            },
            label,
            candidate["evidenceSnapshot"]["sha256"],
            now,
            allow_expired=True,
        )
        approvals[candidate_id].append(validated)
    return approvals


def election_authority(
    candidate: dict[str, Any], approvals: list[dict[str, str]]
) -> dict[str, Any]:
    return {
        "candidateId": candidate["candidateId"],
        "electionId": candidate["electionId"],
        "electionYear": candidate["electionYear"],
        "countryCode": candidate["countryCode"],
        "stationId": candidate["stationId"],
        "email": candidate["email"],
        "evidenceSnapshot": candidate["evidenceSnapshot"],
        "approvals": approvals,
    }


def promote(args: argparse.Namespace) -> int:
    now = datetime.now(timezone.utc)
    stations = canonical_stations(load_json(args.canonical, "canonical missions"))
    candidates = validate_candidates(load_json(args.candidates, "candidates"), stations)
    selected_by_station_election: dict[tuple[str, str], str] = {}
    selected_by_station: dict[str, str] = {}
    for candidate_id, candidate in candidates.items():
        if not candidate["selectedForPromotion"]:
            continue
        key = (candidate["stationId"], candidate["electionId"])
        previous_candidate = selected_by_station_election.setdefault(key, candidate_id)
        if previous_candidate != candidate_id:
            fail(
                f"Ambiguous selected candidates for station {candidate['stationId']} "
                f"and election {candidate['electionId']}"
            )
        previous_station_candidate = selected_by_station.setdefault(candidate["stationId"], candidate_id)
        if previous_station_candidate != candidate_id:
            fail(f"Ambiguous selected candidates for station {candidate['stationId']}")
    reviews = (
        validate_reviews(load_json(args.reviews, "AI reviews"), candidates)
        if args.reviews is not None
        else {}
    )
    allowed_reviewer_ids, required_human_approvals = validate_reviewer_policy(
        load_json(args.reviewers, "reviewer policy")
    )
    approvals = validate_approvals(
        load_json(args.approvals, "approvals"),
        candidates,
        allowed_reviewer_ids,
        now,
    )
    overrides = load_json(args.overrides, "overrides")
    if (
        not isinstance(overrides, dict)
        or overrides.get("_schemaVersion") != 2
        or not isinstance(overrides.get("missionOverrides"), dict)
    ):
        fail("Overrides must be a schemaVersion 2 object with missionOverrides")

    updated = copy.deepcopy(overrides)
    mission_overrides = updated["missionOverrides"]
    promoted = 0
    for candidate_id, candidate in candidates.items():
        if not candidate["selectedForPromotion"]:
            continue
        review = reviews.get(candidate_id)
        if review is not None and review["decision"] not in ADVISORY_DECISIONS:
            fail(
                f"Selected candidate {candidate_id} was skipped because its advisory "
                f"review decision is {review['decision']}"
            )
        human_approvals = approvals[candidate_id]
        if any(
            parse_utc_timestamp(
                approval["expiresAt"], f"Selected candidate {candidate_id} approval expiresAt"
            )
            <= now
            for approval in human_approvals
        ):
            fail(f"Selected candidate {candidate_id} was skipped because an approval has expired")
        reviewer_ids = {approval["reviewerId"] for approval in human_approvals}
        if (
            len(human_approvals) != required_human_approvals
            or len(reviewer_ids) != required_human_approvals
        ):
            fail(
                f"Selected candidate {candidate_id} was skipped because it requires exactly "
                f"{required_human_approvals} distinct current human approval(s)"
            )
        previous = mission_overrides.get(candidate["stationId"])
        if previous is not None and not isinstance(previous, dict):
            fail(f"Override for {candidate['stationId']} is malformed")
        patch = copy.deepcopy(previous) if previous else {}
        previous_authority = patch.get("electionAuthority")
        if previous_authority is not None:
            validated_previous = validate_election_authority(
                previous_authority,
                f"Override for {candidate['stationId']} electionAuthority",
                now,
                allow_expired=True,
            )
            if (
                validated_previous["stationId"] != candidate["stationId"]
                or validated_previous["countryCode"] != candidate["countryCode"]
            ):
                fail(
                    f"Override for {candidate['stationId']} electionAuthority is bound to "
                    "another station or country"
                )
            if (
                not election_authority_is_expired(validated_previous, now)
                and validated_previous["electionId"] != candidate["electionId"]
            ):
                fail(
                    f"Override for {candidate['stationId']} already has current authority "
                    f"for election {validated_previous['electionId']}"
                )
        authority = election_authority(candidate, human_approvals)
        patch["electionAuthority"] = validate_election_authority(
            authority, f"Candidate {candidate_id} electionAuthority", now
        )
        mission_overrides[candidate["stationId"]] = patch
        if mission_overrides[candidate["stationId"]] != overrides["missionOverrides"].get(
            candidate["stationId"]
        ):
            promoted += 1

    if updated != overrides:
        write_json_atomically(args.overrides, updated)
    print(f"Promoted {promoted} election-specific contact(s).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidates", type=Path, default=Path("data/election_candidates.json"))
    parser.add_argument("--reviews", type=Path, help="Optional advisory AI reviews JSON")
    parser.add_argument("--approvals", type=Path, default=Path("data/election_approvals.json"))
    parser.add_argument("--reviewers", type=Path, default=Path("data/election_reviewers.json"))
    parser.add_argument("--canonical", type=Path, default=Path("data/missions_canonical.json"))
    parser.add_argument("--overrides", type=Path, default=Path("data/overrides.json"))
    args = parser.parse_args()
    try:
        return promote(args)
    except ValidationError as error:
        print(f"Promotion aborted: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
