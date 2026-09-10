#!/usr/bin/env python3
"""Advisory-only AI review of publicly evidenced election-email candidates."""

import argparse
import ipaddress
import copy
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlparse


DEFAULT_INPUT = Path("data/election_candidates.json")
DEFAULT_OUTPUT = Path("data/election_ai_reviews.json")
REQUIRED_ENVIRONMENT = (
    "ELECTION_AI_BASE_URL",
    "ELECTION_AI_API_KEY",
    "ELECTION_AI_MODEL",
)
DECISIONS = {"accept", "reject", "needs_human"}
CHECK_NAMES = (
    "emailVisible",
    "quoteContainsEmail",
    "sourceUrlIsHttps",
    "sourceUrlHostMatchesSourceHost",
    "electionContextPresent",
    "stationIdentityPresent",
    "observedAtPresent",
)

RESPONSE_SCHEMA = {
    "name": "election_candidate_review",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "candidateId",
            "electionId",
            "decision",
            "confidence",
            "evidenceChecks",
            "rationale",
        ],
        "properties": {
            "candidateId": {"type": "string", "minLength": 1},
            "electionId": {"type": "string", "minLength": 1},
            "decision": {"type": "string", "enum": sorted(DECISIONS)},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "evidenceChecks": {
                "type": "object",
                "additionalProperties": False,
                "required": list(CHECK_NAMES),
                "properties": {name: {"type": "boolean"} for name in CHECK_NAMES},
            },
            "rationale": {"type": "string", "minLength": 1, "maxLength": 2000},
        },
    },
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Advisory-only AI review of election-email candidates."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Candidate JSON input")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Review JSON output")
    parser.add_argument("--timeout", type=float, default=30.0, help="Per-request timeout in seconds")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    return args


def required_configuration() -> tuple[str, str, str]:
    missing = [name for name in REQUIRED_ENVIRONMENT if not os.environ.get(name, "").strip()]
    if missing:
        raise ValueError("Missing required environment variables: " + ", ".join(missing))
    return tuple(os.environ[name].strip() for name in REQUIRED_ENVIRONMENT)  # type: ignore[return-value]


def valid_url_host(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
    except ValueError:
        try:
            ascii_host = host.encode("idna").decode("ascii")
        except UnicodeError:
            return False
        labels = ascii_host[:-1].split(".") if ascii_host.endswith(".") else ascii_host.split(".")
        return bool(
            ascii_host
            and len(ascii_host) <= 253
            and labels
            and all(
                0 < len(label) <= 63
                and label[0] != "-"
                and label[-1] != "-"
                and all(character.isascii() and (character.isalnum() or character == "-") for character in label)
                for label in labels
            )
        )
    return True


def validate_ai_base_url(base_url: str) -> None:
    try:
        parsed = urlparse(base_url)
        port = parsed.port
    except ValueError as error:
        raise ValueError("ELECTION_AI_BASE_URL must be a valid absolute HTTPS URL") from error
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.hostname
        or not valid_url_host(parsed.hostname)
        or parsed.fragment
        or (port is not None and not 1 <= port <= 65535)
    ):
        raise ValueError(
            "ELECTION_AI_BASE_URL must be an absolute HTTPS URL with a valid host, no credentials, and no fragment"
        )


def validate_output_path(path: Path) -> None:
    if path.resolve() == Path("data/overrides.json").resolve():
        raise ValueError("Refusing to write data/overrides.json; AI review is advisory only")



def read_candidates(path: Path) -> tuple[dict[str, Any], list[Any]]:
    with path.open("r", encoding="utf-8") as handle:
        document = json.load(handle)
    if not isinstance(document, dict):
        raise ValueError("Candidate input must be a JSON object")
    candidates = document.get("candidates")
    if not isinstance(candidates, list):
        raise ValueError("Candidate input must contain a candidates array")
    return document, candidates


def string_field(candidate: Mapping[str, Any], name: str) -> str | None:
    value = candidate.get(name)
    return value.strip() if isinstance(value, str) and value.strip() else None


def first_string_field(candidate: Mapping[str, Any], *names: str) -> str | None:
    for name in names:
        value = string_field(candidate, name)
        if value is not None:
            return value
    return None


def public_evidence(candidate: Mapping[str, Any]) -> tuple[dict[str, str] | None, str | None]:
    """Select the only candidate fields that may be sent to the AI endpoint."""
    evidence = {
        "candidateId": string_field(candidate, "candidateId"),
        "electionId": string_field(candidate, "electionId"),
        "email": string_field(candidate, "email"),
        "sourceQuote": first_string_field(candidate, "sourceQuote", "quote"),
        "sourceUrl": string_field(candidate, "sourceUrl"),
        "electionContext": first_string_field(candidate, "electionContext", "title"),
        "observedAt": string_field(candidate, "observedAt"),
        "countryCode": string_field(candidate, "countryCode"),
        "country": string_field(candidate, "country"),
        "stationId": string_field(candidate, "stationId"),
        "stationName": string_field(candidate, "stationName"),
        "sourceHost": string_field(candidate, "sourceHost"),
    }
    required_fields = (
        "candidateId",
        "electionId",
        "email",
        "sourceQuote",
        "sourceUrl",
        "electionContext",
        "observedAt",
        "countryCode",
        "stationId",
        "sourceHost",
    )
    if any(evidence[name] is None for name in required_fields):
        return None, "invalid_candidate_evidence"

    parsed_source = urlparse(evidence["sourceUrl"] or "")
    if parsed_source.scheme != "https" or not parsed_source.netloc:
        return None, "invalid_candidate_evidence"
    if (evidence["sourceHost"] or "").lower() != (parsed_source.hostname or "").lower():
        return None, "invalid_candidate_evidence"
    if (evidence["email"] or "").lower() not in (evidence["sourceQuote"] or "").lower():
        return None, "invalid_candidate_evidence"

    return {name: value for name, value in evidence.items() if value is not None}, None


def local_evidence_checks(evidence: Mapping[str, str] | None) -> dict[str, bool]:
    if evidence is None:
        return {name: False for name in CHECK_NAMES}
    source_url = urlparse(evidence["sourceUrl"])
    return {
        "emailVisible": evidence["email"].lower() in evidence["sourceQuote"].lower(),
        "quoteContainsEmail": evidence["email"].lower() in evidence["sourceQuote"].lower(),
        "sourceUrlIsHttps": source_url.scheme == "https" and bool(source_url.netloc),
        "sourceUrlHostMatchesSourceHost": source_url.hostname.lower() == evidence["sourceHost"].lower(),
        "electionContextPresent": bool(evidence["electionContext"]),
        "stationIdentityPresent": bool(evidence["countryCode"] and evidence["stationId"]),
        "observedAtPresent": bool(evidence["observedAt"]),
    }


def error_review(
    candidate: Any,
    model: str,
    error: str,
    evidence: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    candidate_mapping = candidate if isinstance(candidate, Mapping) else {}
    return {
        "candidate": copy.deepcopy(candidate),
        "candidateId": string_field(candidate_mapping, "candidateId") or "",
        "electionId": string_field(candidate_mapping, "electionId") or "",
        "decision": "needs_human",
        "confidence": 0,
        "evidenceChecks": local_evidence_checks(evidence),
        "rationale": "AI review requires human review because the candidate or AI response could not be validated.",
        "model": model,
        "reviewedAt": utc_now(),
        "reviewStatus": "error",
        "error": error,
    }


def chat_completions_url(base_url: str) -> str:
    return base_url.rstrip("/") if base_url.rstrip("/").endswith("/chat/completions") else base_url.rstrip("/") + "/chat/completions"


def request_review(base_url: str, api_key: str, model: str, evidence: Mapping[str, str], timeout: float) -> dict[str, Any]:
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_schema", "json_schema": RESPONSE_SCHEMA},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Review only the public institutional evidence supplied by the user. "
                    "Do not infer facts, contacts, or source authority. Return needs_human if any "
                    "required evidence is insufficient or inconsistent. This is advisory only."
                ),
            },
            {
                "role": "user",
                "content": json.dumps({"publicCandidateEvidence": evidence}, ensure_ascii=False, separators=(",", ":")),
            },
        ],
    }
    request = Request(
        chat_completions_url(base_url),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        response_document = json.load(response)
    choices = response_document.get("choices") if isinstance(response_document, dict) else None
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise ValueError("invalid_api_response")
    message = choices[0].get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str):
        raise ValueError("invalid_api_response")
    decoded = json.loads(content)
    if not isinstance(decoded, dict):
        raise ValueError("invalid_api_response")
    return decoded


def validated_review(candidate: Any, model: str, evidence: Mapping[str, str], response: Any) -> dict[str, Any] | None:
    if not isinstance(response, dict):
        return None
    candidate_id = evidence["candidateId"]
    election_id = evidence["electionId"]
    decision = response.get("decision")
    confidence = response.get("confidence")
    checks = response.get("evidenceChecks")
    rationale = response.get("rationale")
    if (
        response.get("candidateId") != candidate_id
        or response.get("electionId") != election_id
        or decision not in DECISIONS
        or isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0 <= confidence <= 1
        or not isinstance(rationale, str)
        or not rationale.strip()
        or not isinstance(checks, dict)
        or set(checks) != set(CHECK_NAMES)
        or any(not isinstance(checks[name], bool) for name in CHECK_NAMES)
    ):
        return None

    expected_checks = local_evidence_checks(evidence)
    if any(not checks[name] for name, expected in expected_checks.items() if expected):
        return None
    if decision == "accept" and not all(checks.values()):
        return None

    return {
        "candidate": copy.deepcopy(candidate),
        "candidateId": candidate_id,
        "electionId": election_id,
        "decision": decision,
        "confidence": confidence,
        "evidenceChecks": {name: checks[name] for name in CHECK_NAMES},
        "rationale": rationale.strip(),
        "model": model,
        "reviewedAt": utc_now(),
        "reviewStatus": "completed",
    }


def atomic_write(path: Path, document: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    temporary_path.replace(path)


def main() -> int:
    args = parse_args()
    try:
        base_url, api_key, model = required_configuration()
        validate_ai_base_url(base_url)
        validate_output_path(args.output)
        candidate_document, candidates = read_candidates(args.input)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"review_election_candidates: {error}", file=sys.stderr)
        return 2

    reviews: list[dict[str, Any]] = []
    for candidate in candidates:
        if not isinstance(candidate, Mapping):
            reviews.append(error_review(candidate, model, "invalid_candidate_evidence"))
            continue
        evidence, evidence_error = public_evidence(candidate)
        if evidence_error or evidence is None:
            reviews.append(error_review(candidate, model, evidence_error or "invalid_candidate_evidence"))
            continue
        try:
            response = request_review(base_url, api_key, model, evidence, args.timeout)
            review = validated_review(candidate, model, evidence, response)
            if review is None:
                reviews.append(error_review(candidate, model, "invalid_api_response", evidence))
            else:
                reviews.append(review)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            reviews.append(error_review(candidate, model, "ai_request_failed", evidence))

    atomic_write(
        args.output,
        {
            "schemaVersion": 1,
            "reviewedAt": utc_now(),
            "model": model,
            "sourceCandidateSchemaVersion": candidate_document.get("schemaVersion"),
            "reviews": reviews,
        },
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
