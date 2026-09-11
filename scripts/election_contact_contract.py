"""Strict, shared validation for time-bound election contact authority."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

UTC_TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$"
)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
MAILBOX_RE = re.compile(
    r"^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@"
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$"
)


def is_valid_mailbox(value: Any) -> bool:
    """Return whether a public mailbox has the pipeline's strict ASCII syntax."""
    return (
        isinstance(value, str)
        and value == value.strip()
        and bool(MAILBOX_RE.fullmatch(value))
        and ".." not in value
    )


def require_mailbox(value: Any, label: str) -> str:
    """Validate and normalize a public mailbox used by election evidence."""
    if not is_valid_mailbox(value):
        raise ContractError(f"{label} has an invalid email")
    return value.lower()




class ContractError(ValueError):
    """Raised when election contact authority cannot be proven safely."""


def _require_string(record: dict[str, Any], field: str, label: str) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value or value != value.strip():
        raise ContractError(f"{label} requires a non-empty {field} without surrounding whitespace")
    return value


def parse_utc_timestamp(value: Any, label: str) -> datetime:
    """Parse an RFC 3339 UTC instant; offsets and date-only values are rejected."""
    if not isinstance(value, str) or not UTC_TIMESTAMP_RE.fullmatch(value):
        raise ContractError(f"{label} must be an ISO-8601 UTC timestamp ending in Z")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as error:
        raise ContractError(f"{label} has an invalid UTC timestamp") from error
    if parsed.tzinfo != timezone.utc:
        raise ContractError(f"{label} must be in UTC")
    return parsed


def evidence_snapshot_hash(evidence: Any) -> str:
    """Return the stable SHA-256 fingerprint for a JSON evidence snapshot."""
    try:
        encoded = json.dumps(
            evidence,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise ContractError("Evidence snapshot must be canonical JSON") from error
    return hashlib.sha256(encoded).hexdigest()


def validate_evidence_snapshot(snapshot: Any, label: str) -> dict[str, Any]:
    """Validate a self-hashing, time-stamped source-evidence snapshot."""
    if not isinstance(snapshot, dict):
        raise ContractError(f"{label} must be an object")
    required_fields = {"capturedAt", "content", "sha256"}
    if set(snapshot) != required_fields:
        raise ContractError(f"{label} must contain exactly {sorted(required_fields)}")
    captured_at = parse_utc_timestamp(snapshot["capturedAt"], f"{label} capturedAt")
    content = snapshot["content"]
    if not isinstance(content, dict) or not content:
        raise ContractError(f"{label} content must be a non-empty object")
    supplied_hash = snapshot["sha256"]
    if not isinstance(supplied_hash, str) or not SHA256_RE.fullmatch(supplied_hash):
        raise ContractError(f"{label} sha256 must be a lowercase SHA-256 digest")
    expected_hash = evidence_snapshot_hash(
        {"capturedAt": snapshot["capturedAt"], "content": content}
    )
    if supplied_hash != expected_hash:
        raise ContractError(f"{label} sha256 does not match its evidence")
    return {
        "capturedAt": snapshot["capturedAt"],
        "content": content,
        "sha256": supplied_hash,
        "_parsedCapturedAt": captured_at,
    }


def validate_human_approval(
    approval: Any,
    label: str,
    evidence_sha256: str,
    now: datetime | None = None,
    allow_expired: bool = False,
) -> dict[str, str]:
    """Validate a human approval that is bound to unmodified evidence and expires."""
    if not isinstance(approval, dict):
        raise ContractError(f"{label} must be an object")
    required_fields = {
        "reviewerId",
        "reviewerType",
        "decision",
        "approvedAt",
        "expiresAt",
        "evidenceSha256",
    }
    if set(approval) != required_fields:
        raise ContractError(f"{label} must contain exactly {sorted(required_fields)}")
    reviewer_id = _require_string(approval, "reviewerId", label)
    if approval["reviewerType"] != "human":
        raise ContractError(f"{label} must be an explicit human approval")
    if approval["decision"] != "approve":
        raise ContractError(f"{label} must approve the contact")
    approved_at = parse_utc_timestamp(approval["approvedAt"], f"{label} approvedAt")
    expires_at = parse_utc_timestamp(approval["expiresAt"], f"{label} expiresAt")
    if approved_at >= expires_at:
        raise ContractError(f"{label} expiresAt must be after approvedAt")
    if approval["evidenceSha256"] != evidence_sha256:
        raise ContractError(f"{label} is not bound to this evidence snapshot")
    instant = now or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        raise ContractError("Approval validation requires a timezone-aware current instant")
    if not allow_expired and expires_at <= instant.astimezone(timezone.utc):
        raise ContractError(f"{label} has expired")
    return {
        "reviewerId": reviewer_id,
        "reviewerType": "human",
        "decision": "approve",
        "approvedAt": approval["approvedAt"],
        "expiresAt": approval["expiresAt"],
        "evidenceSha256": evidence_sha256,
    }


def election_authority_is_expired(
    authority: dict[str, Any], now: datetime | None = None
) -> bool:
    """Return whether a structurally valid authority has any expired approval."""
    instant = now or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        raise ContractError("Authority expiry evaluation requires a timezone-aware current instant")
    return any(
        parse_utc_timestamp(
            approval["expiresAt"], "Election authority approval expiresAt"
        )
        <= instant.astimezone(timezone.utc)
        for approval in authority["approvals"]
    )


def validate_election_authority(
    authority: Any,
    label: str,
    now: datetime | None = None,
    allow_expired: bool = False,
) -> dict[str, Any]:
    """Validate an evidence-bound authority persisted in a mission override."""
    if not isinstance(authority, dict):
        raise ContractError(f"{label} must be an object")
    required_fields = {
        "candidateId",
        "electionId",
        "electionYear",
        "countryCode",
        "stationId",
        "email",
        "evidenceSnapshot",
        "approvals",
    }
    if set(authority) != required_fields:
        raise ContractError(f"{label} must contain exactly {sorted(required_fields)}")
    candidate_id = _require_string(authority, "candidateId", label)
    election_id = _require_string(authority, "electionId", label)
    election_year = _require_string(authority, "electionYear", label)
    country_code = _require_string(authority, "countryCode", label)
    station_id = _require_string(authority, "stationId", label)
    email = require_mailbox(authority.get("email"), label)
    snapshot = validate_evidence_snapshot(authority["evidenceSnapshot"], f"{label} evidenceSnapshot")
    evidence_email = require_mailbox(
        snapshot["content"].get("email"), f"{label} evidenceSnapshot content"
    )
    if email != evidence_email:
        raise ContractError(
            f"{label} email must match evidenceSnapshot.content.email"
        )
    approvals = authority["approvals"]
    if not isinstance(approvals, list) or not approvals:
        raise ContractError(f"{label} requires at least one approval")
    validated_approvals = [
        validate_human_approval(
            approval,
            f"{label} approval #{index + 1}",
            snapshot["sha256"],
            now,
            allow_expired,
        )
        for index, approval in enumerate(approvals)
    ]
    reviewer_ids = [approval["reviewerId"] for approval in validated_approvals]
    if len(reviewer_ids) != len(set(reviewer_ids)):
        raise ContractError(f"{label} repeats a reviewer approval")
    return {
        "candidateId": candidate_id,
        "electionId": election_id,
        "electionYear": election_year,
        "countryCode": country_code,
        "stationId": station_id,
        "email": email,
        "evidenceSnapshot": {
            key: value for key, value in snapshot.items() if key != "_parsedCapturedAt"
        },
        "approvals": validated_approvals,
    }
