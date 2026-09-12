#!/usr/bin/env python3
"""Validate public election-contact evidence and bind it to review artifacts.

This shared boundary treats crawled text, candidate records, and AI output as
untrusted until their exact source, canonical mission, policy, and digest
bindings agree.  Review and promotion use the same checks so discovery cannot
manufacture authorization, and an imported attestation is an entry condition,
not fresh proof of the underlying review.
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse


MAILBOX_LOCAL_RE = r"[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?"
MAILBOX_DOMAIN_RE = r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}"
MAILBOX_RE = re.compile(rf"^(?=.{{3,254}}$)(?=.{{1,64}}@){MAILBOX_LOCAL_RE}@{MAILBOX_DOMAIN_RE}$")
MAILBOX_TOKEN_RE = re.compile(
    rf"(?<![A-Za-z0-9._%+-])({MAILBOX_LOCAL_RE}@{MAILBOX_DOMAIN_RE})(?![\w-]|\.[\w-])"
)
ELECTION_YEAR_RE = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")
REGISTRATION_PURPOSE_RE = re.compile(
    r"(?:apply|application|register|registration|submit|submission|enrol|enroll|"
    r"prijav\w*|podnes\w*|dostav\w*|upis\w*|zahtev\w*|bira[čc]\w*|"
    r"пријав\w*|поднес\w*|достав\w*|упис\w*|захтев\w*|бирач\w*)",
    re.IGNORECASE,
)
HEX_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
CHECK_VALUES = {"supported", "unsupported", "uncertain"}
REVIEW_DECISIONS = {"accept", "reject", "needs_review"}


class ValidationError(ValueError):
    """Raised when a public artifact cannot safely authorize a contact."""


def fail(message: str) -> None:
    raise ValidationError(message)


def canonical_json_bytes(value: Any) -> bytes:
    """Return deterministic JSON bytes and reject non-JSON numeric values."""
    try:
        return json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        fail(f"Value cannot be canonically encoded: {error}")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_json(value: Any) -> str:
    return sha256_bytes(canonical_json_bytes(value))


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} requires an ISO-8601 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        fail(f"{label} has an invalid timestamp")
    if parsed.tzinfo is None:
        fail(f"{label} timestamp requires a timezone")
    return parsed.astimezone(timezone.utc)

def parse_nonfuture_timestamp(value: Any, label: str) -> datetime:
    parsed = parse_timestamp(value, label)
    if parsed > datetime.now(timezone.utc):
        fail(f"{label} must not be in the future")
    return parsed


def load_json(path: Path, label: str) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Cannot read {label} at {path}: {error}")


def distinct_paths(**paths: Path | None) -> None:
    """Refuse accidental input/output or artifact/override path collisions."""
    seen: dict[Path, str] = {}
    for label, path in paths.items():
        if path is None:
            continue
        resolved = path.resolve()
        previous = seen.get(resolved)
        if previous is not None:
            fail(f"{label} path collides with {previous} path: {path}")
        seen[resolved] = label


def atomic_write(path: Path, payload: Any, *, expected_digest: str | None = None) -> None:
    """Atomically write canonical pretty JSON, optionally rejecting a stale baseline."""
    # A promotion writes recipient overrides; reject a concurrent baseline
    # change rather than accidentally replacing another operator's decision.
    if expected_digest is not None:
        current = load_json(path, "override baseline")
        if sha256_json(current) != expected_digest:
            fail(f"Refusing to overwrite {path}; its baseline changed during this run")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
        ) as handle:
            temporary_path = Path(handle.name)
            json.dump(payload, handle, ensure_ascii=False, indent=2, allow_nan=False)
            handle.write("\n")
        os.replace(temporary_path, path)
    except (OSError, TypeError, ValueError) as error:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass
        fail(f"Cannot atomically write {path}: {error}")


def require_string(record: Mapping[str, Any], field: str, label: str) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        fail(f"{label} requires non-empty {field} without surrounding whitespace")
    return value


def require_email(record: Mapping[str, Any], field: str, label: str) -> str:
    value = require_string(record, field, label)
    if not MAILBOX_RE.fullmatch(value) or ".." in value:
        fail(f"{label} has an invalid {field}")
    return value.lower()


def extract_mailboxes(text: str) -> set[str]:
    """Return bounded, syntactically complete mailbox tokens from public text."""
    return {match.group(1).lower() for match in MAILBOX_TOKEN_RE.finditer(text)}


def contains_exact_mailbox(text: str, mailbox: str) -> bool:
    return mailbox.lower() in extract_mailboxes(text)


def election_year_for(election_id: str, label: str) -> str:
    years = set(ELECTION_YEAR_RE.findall(election_id))
    if len(years) != 1:
        fail(f"{label} must contain exactly one four-digit election year")
    return years.pop()


def https_url_host(url: str, label: str) -> str:
    try:
        parsed = urlparse(url)
        port = parsed.port
    except ValueError:
        fail(f"{label} has an invalid URL port")
    host = parsed.hostname
    if (
        parsed.scheme != "https"
        or not host
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or parsed.fragment
    ):
        fail(f"{label} must be an absolute HTTPS URL without credentials, unusual port, or fragment")
    return host.lower().rstrip(".")


def is_mfa_host(host: str) -> bool:
    return host == "mfa.gov.rs" or host.endswith(".mfa.gov.rs")


def _host_variants_match(actual: str, canonical: str) -> bool:
    def without_www(host: str) -> str:
        return host[4:] if host.startswith("www.") else host

    return actual != canonical and without_www(actual) == without_www(canonical) and (
        actual.startswith("www.") or canonical.startswith("www.")
    )


def _source_host_authorized(source_host: str, canonical_host: str, source_chain: list[str]) -> bool:
    if source_host == canonical_host:
        return True
    if not _host_variants_match(source_host, canonical_host):
        return False
    hosts = [https_url_host(url, "Candidate sourceChain entry") for url in source_chain]
    try:
        final_index = max(index for index, host in enumerate(hosts) if host == source_host)
    except ValueError:
        return False
    # A www/bare reconciliation is accepted only when the declared chain shows
    # an official MFA index/country page leading to the exact actual host.
    return any(is_mfa_host(host) and host != source_host for host in hosts[:final_index])


def canonical_stations(payload: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(payload, dict) or not isinstance(payload.get("countries"), list):
        fail("Canonical missions must contain a countries array")
    stations: dict[str, dict[str, Any]] = {}
    for country_index, country in enumerate(payload["countries"]):
        label = f"Canonical country #{country_index + 1}"
        if not isinstance(country, dict):
            fail(f"{label} is malformed")
        country_code = require_string(country, "countryCode", label)
        country_name = country.get("label")
        if not isinstance(country_name, str) or not country_name.strip():
            country_name = country_code
        country_names = [country_name.strip()]
        country_name_cyr = country.get("labelCyr")
        if isinstance(country_name_cyr, str) and country_name_cyr.strip() and country_name_cyr.strip() not in country_names:
            country_names.append(country_name_cyr.strip())
        station_list = country.get("stations")
        if not isinstance(station_list, list):
            fail(f"{label} requires stations")
        for station_index, station in enumerate(station_list):
            station_label = f"{label} station #{station_index + 1}"
            if not isinstance(station, dict):
                fail(f"{station_label} is malformed")
            station_id = require_string(station, "id", station_label)
            if station_id in stations:
                fail(f"Canonical missions repeat station {station_id}")
            website = station.get("website")
            website_host = https_url_host(website, f"{station_label} website") if isinstance(website, str) and website.strip() else None
            stations[station_id] = {
                "countryCode": country_code,
                "country": country_name.strip(),
                "countryNames": country_names,
                "station": copy.deepcopy(station),
                "websiteHost": website_host,
            }
    return stations


def validate_policy(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 2:
        fail("Reviewer policy must be a schemaVersion 2 object")
    if payload.get("mode") != "source_checked_ai":
        fail("Reviewer policy mode must be source_checked_ai")
    if payload.get("requiredAiApprovals") != 1:
        fail("Reviewer policy must require exactly one AI approval")
    if payload.get("escalationRole") != "architect":
        fail("Reviewer policy escalationRole must be architect")
    human_ids = payload.get("humanReviewerIds")
    if not isinstance(human_ids, list) or not all(
        isinstance(item, str) and item.strip() == item and item for item in human_ids
    ) or len(human_ids) != len(set(human_ids)):
        fail("Reviewer policy requires distinct non-empty humanReviewerIds")
    max_age = payload.get("maxSourceAgeHours")
    if type(max_age) is not int or max_age < 1:
        fail("Reviewer policy maxSourceAgeHours must be a positive integer")
    return {
        "schemaVersion": 2,
        "mode": "source_checked_ai",
        "requiredAiApprovals": 1,
        "escalationRole": "architect",
        "humanReviewerIds": list(human_ids),
        "maxSourceAgeHours": max_age,
    }


def validate_overrides(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict) or not isinstance(payload.get("missionOverrides"), dict):
        fail("Overrides must be an object with a missionOverrides object")
    return payload


def _station_identity(station_data: Mapping[str, Any]) -> dict[str, Any]:
    station = station_data["station"]
    identity = {
        "stationId": station["id"],
        "countryCode": station_data["countryCode"],
        "country": station_data["country"],
        "countryNames": list(station_data["countryNames"]),
        "websiteHost": station_data["websiteHost"],
        "isResident": station.get("isResident") if isinstance(station.get("isResident"), bool) else None,
    }
    embassy = station.get("embassy")
    if isinstance(embassy, str) and embassy.strip():
        identity["embassy"] = embassy.strip()
    return identity


def _source_allowlist(source: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "sourceUrl": source["sourceUrl"],
        "finalUrl": source["finalUrl"],
        "fetchedAt": source["fetchedAt"],
        "bodySha256": source["bodySha256"],
        "textSha256": source["textSha256"],
        "text": source["text"],
        "extractorVersion": source["extractorVersion"],
    }


def _validate_source(
    source_id: str,
    source: Any,
    station_data: Mapping[str, Any],
    source_chain: list[str],
    label: str,
) -> dict[str, Any]:
    # Crawled pages are public evidence, not authority.  Retain only a complete
    # source whose declared MFA-to-mission chain reaches the canonical station.
    if not isinstance(source, dict):
        fail(f"{label} source {source_id} must be an object")
    source_url = require_string(source, "sourceUrl", f"{label} source")
    final_url = require_string(source, "finalUrl", f"{label} source")
    source_host = https_url_host(source_url, f"{label} sourceUrl")
    final_host = https_url_host(final_url, f"{label} finalUrl")
    fetched_at = require_string(source, "fetchedAt", f"{label} source")
    parse_timestamp(fetched_at, f"{label} source fetchedAt")
    body_hash = require_string(source, "bodySha256", f"{label} source")
    text_hash = require_string(source, "textSha256", f"{label} source")
    if not HEX_SHA256_RE.fullmatch(body_hash) or not HEX_SHA256_RE.fullmatch(text_hash):
        fail(f"{label} source requires lowercase SHA-256 hashes")
    text = source.get("text")
    if not isinstance(text, str) or not text.strip():
        fail(f"{label} source requires complete non-empty public text")
    if sha256_bytes(text.encode("utf-8")) != text_hash:
        fail(f"{label} source textSha256 does not match source text")
    if source.get("extractorVersion") != "1":
        fail(f"{label} source extractorVersion must be 1")
    expected_id = sha256_json({"sourceUrl": source_url, "textSha256": text_hash})
    if source_id != expected_id:
        fail(f"{label} sourceId does not bind sourceUrl and textSha256")
    if not source_chain or source_chain[-1] != final_url or source_url not in source_chain:
        fail(f"{label} sourceChain must contain sourceUrl and end at finalUrl")
    canonical_host = station_data["websiteHost"]
    if not isinstance(canonical_host, str):
        fail(f"{label} canonical station has no HTTPS website to authorize candidate source evidence")
    chain_hosts = [https_url_host(chain_url, f"{label} sourceChain") for chain_url in source_chain]
    if not is_mfa_host(chain_hosts[0]):
        fail(f"{label} sourceChain must begin with an official MFA index or country URL")
    if any(
        not (
            is_mfa_host(chain_host)
            or chain_host == canonical_host
            or _host_variants_match(chain_host, canonical_host)
        )
        for chain_host in chain_hosts
    ):
        fail(f"{label} sourceChain contains a non-authoritative host")
    if not _source_host_authorized(final_host, canonical_host, source_chain):
        fail(f"{label} final source host is not the canonical mission host")
    if source_host != final_host and not _source_host_authorized(source_host, canonical_host, source_chain):
        fail(f"{label} sourceUrl host is not authorized by the canonical mission chain")
    return _source_allowlist(
        {
            "sourceUrl": source_url,
            "finalUrl": final_url,
            "fetchedAt": fetched_at,
            "bodySha256": body_hash,
            "textSha256": text_hash,
            "text": text,
            "extractorVersion": "1",
        }
    )


def _candidate_evidence_digest(candidate: Mapping[str, Any], station_identity: Mapping[str, Any], source: Mapping[str, Any]) -> str:
    return sha256_json(
        {
            "candidateId": candidate["candidateId"],
            "electionId": candidate["electionId"],
            "electionYear": candidate["electionYear"],
            "countryCode": candidate["countryCode"],
            "stationId": candidate["stationId"],
            "email": candidate["email"],
            "title": candidate["title"],
            "electionContext": candidate["electionContext"],
            "sourceQuote": candidate["sourceQuote"],
            "sourceId": candidate["sourceId"],
            "sourceChain": candidate["sourceChain"],
            "canonicalStation": station_identity,
            "sourceTextSha256": source["textSha256"],
        }
    )


def validate_candidate_document(
    payload: Any, stations: Mapping[str, Mapping[str, Any]]
) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        fail("Candidates must be a schemaVersion 1 object")
    election_id = require_string(payload, "electionId", "Candidates")
    election_year = election_year_for(election_id, "Candidates electionId")
    if require_string(payload, "electionYear", "Candidates") != election_year:
        fail("Candidates electionYear does not match electionId")
    parse_timestamp(require_string(payload, "generatedAt", "Candidates"), "Candidates generatedAt")
    raw_sources_value = payload.get("sources", {})
    raw_sources = raw_sources_value if isinstance(raw_sources_value, dict) else {}
    raw_candidates = payload.get("candidates")
    if not isinstance(raw_candidates, list):
        fail("Candidates must contain a candidates array")
    candidates: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    groups: dict[str, list[dict[str, Any]]] = {}
    incomplete: dict[str, str] = {}

    def mark_incomplete(candidate: Mapping[str, Any], reason: str) -> None:
        # Invalid evidence does not become a partially trusted candidate: retain
        # the station as incomplete so a later crawl can recover it.
        station_id = candidate.get("stationId")
        if isinstance(station_id, str) and station_id in stations:
            incomplete.setdefault(station_id, reason)

    for index, raw_candidate in enumerate(raw_candidates):
        label = f"Candidate #{index + 1}"
        if not isinstance(raw_candidate, dict):
            continue
        source_id = raw_candidate.get("sourceId")
        source_chain = raw_candidate.get("sourceChain")
        if not (
            isinstance(source_id, str)
            and HEX_SHA256_RE.fullmatch(source_id)
            and isinstance(source_chain, list)
            and source_chain
            and all(isinstance(url, str) and url.strip() == url and url for url in source_chain)
        ):
            mark_incomplete(raw_candidate, "candidate evidence is unbound and must be refetched")
            continue
        try:
            candidate_id = require_string(raw_candidate, "candidateId", label)
            if candidate_id in seen_ids:
                fail(f"Candidates repeat candidateId {candidate_id}")
            candidate_election_id = require_string(raw_candidate, "electionId", label)
            candidate_election_year = require_string(raw_candidate, "electionYear", label)
            if candidate_election_id != election_id or candidate_election_year != election_year:
                fail(f"{label} election binding does not match candidate document")
            station_id = require_string(raw_candidate, "stationId", label)
            station_data = stations.get(station_id)
            if station_data is None:
                fail(f"{label} references unknown station {station_id}")
            country_code = require_string(raw_candidate, "countryCode", label)
            if country_code != station_data["countryCode"]:
                fail(f"{label} countryCode does not match canonical station")
            for chain_url in source_chain:
                https_url_host(chain_url, f"{label} sourceChain")
            source = _validate_source(source_id, raw_sources.get(source_id), station_data, source_chain, label)
            email = require_email(raw_candidate, "email", label)
            title = require_string(raw_candidate, "title", label)
            election_context = require_string(raw_candidate, "electionContext", label)
            source_quote = require_string(raw_candidate, "sourceQuote", label)
            if not contains_exact_mailbox(source_quote, email) or not contains_exact_mailbox(source["text"], email):
                fail(f"{label} source quote and source text must visibly contain its exact email mailbox")
            if source_quote not in source["text"]:
                fail(f"{label} sourceQuote must be exact text from its complete source")
            if election_context not in source["text"]:
                fail(f"{label} electionContext must be exact text from its complete source")
            if election_year not in source["text"]:
                fail(f"{label} complete source text does not visibly contain electionYear")
        except ValidationError:
            mark_incomplete(raw_candidate, "candidate evidence is incomplete and must be refetched")
            continue
        seen_ids.add(candidate_id)
        candidate = {
            "candidateId": candidate_id,
            "electionId": election_id,
            "electionYear": election_year,
            "countryCode": country_code,
            "stationId": station_id,
            "email": email,
            "title": title,
            "electionContext": election_context,
            "sourceQuote": source_quote,
            "sourceId": source_id,
            "sourceChain": list(source_chain),
            "source": source,
            "canonicalStation": _station_identity(station_data),
        }
        candidate["evidenceDigest"] = _candidate_evidence_digest(candidate, candidate["canonicalStation"], source)
        candidates.append(candidate)
        groups.setdefault(station_id, []).append(candidate)
    pending = payload.get("pendingStationIds")
    if pending is not None:
        if not isinstance(pending, list) or not all(isinstance(item, str) and item for item in pending):
            fail("Candidates pendingStationIds must be an array of station IDs")
        if len(pending) != len(set(pending)):
            fail("Candidates pendingStationIds repeats a station ID")
        for station_id in pending:
            if station_id not in stations:
                fail(f"Candidates pendingStationIds contains unknown station {station_id}")
    document = {
        "schemaVersion": 1,
        "electionId": election_id,
        "electionYear": election_year,
        "generatedAt": payload["generatedAt"],
        "pendingStationIds": list(pending) if pending is not None else [],
        "incompleteStationIds": sorted(incomplete),
        "sources": raw_sources,
    }
    return document, candidates, groups


def public_election_notices(payload: Any, canonical_payload: Any) -> dict[str, dict[str, str]]:
    """Project source-bound notice links without granting recipient approval.

    Older candidate artifacts have no notices. New records reuse the existing
    source validation; malformed records must never become public links.
    """
    if not isinstance(payload, dict):
        fail("Notice input must be a candidate artifact")
    records = payload.get("notices", [])
    if not isinstance(records, list):
        fail("Candidate notices must be an array")
    if not records:
        return {}
    election_id = require_string(payload, "electionId", "Notices")
    election_year = election_year_for(election_id, "Notices electionId")
    if payload.get("electionYear") != election_year:
        fail("Notices electionYear does not match electionId")
    stations = canonical_stations(canonical_payload)
    sources = payload.get("sources", {})
    if not isinstance(sources, dict):
        fail("Notices require source snapshots")
    result: dict[str, dict[str, str]] = {}
    for record in records:
        if not isinstance(record, dict):
            fail("Notice must be an object")
        station_id = require_string(record, "stationId", "Notice")
        station = stations.get(station_id)
        if station is None or record.get("electionId") != election_id or record.get("electionYear") != election_year:
            fail(f"Notice {station_id} has invalid station/election scope")
        source_id = require_string(record, "sourceId", "Notice")
        chain = record.get("sourceChain")
        if not isinstance(chain, list) or not all(isinstance(url, str) for url in chain):
            fail(f"Notice {station_id} requires its official source chain")
        source = _validate_source(source_id, sources.get(source_id), station, chain, f"Notice {station_id}")
        title = require_string(record, "title", "Notice")
        context = require_string(record, "electionContext", "Notice")
        if title not in source["text"] or context not in source["text"] or election_year not in context:
            fail(f"Notice {station_id} lacks exact election context")
        observed_at = require_string(record, "observedAt", "Notice")
        if parse_nonfuture_timestamp(observed_at, "Notice observedAt") > parse_timestamp(source["fetchedAt"], "Notice source fetchedAt"):
            fail(f"Notice {station_id} observation is newer than its source")
        if record.get("sourceUrl") != source["sourceUrl"]:
            fail(f"Notice {station_id} does not match its source URL")
        emails = record.get("emails")
        if not isinstance(emails, list) or any(
            not isinstance(email, str) or not contains_exact_mailbox(source["text"], email)
            for email in emails
        ):
            fail(f"Notice {station_id} contains an email absent from its source")
        status = "email-extracted" if emails else "no-email-extracted"
        if record.get("emailStatus") != status:
            fail(f"Notice {station_id} has inconsistent email status")
        public = {
            "url": source["finalUrl"], "title": title,
            "electionYear": election_year, "observedAt": observed_at,
            "emailStatus": status,
        }
        # Prefer the latest observation, then the non-/lat/ notice variant.
        prior = result.get(station_id)
        def preference(item):
            return (item["observedAt"], "/lat/" not in item["url"], item["url"])
        if prior is None or preference(public) > preference(prior):
            result[station_id] = public
    return result


def current_authority(overrides: Mapping[str, Any], station_id: str) -> dict[str, Any] | None:
    record = overrides["missionOverrides"].get(station_id)
    if record is None:
        return None
    if not isinstance(record, dict):
        fail(f"Override for {station_id} must be an object")
    email_value = record.get("electionEmail")
    if email_value is None:
        return None
    if not isinstance(email_value, str) or not MAILBOX_RE.fullmatch(email_value) or ".." in email_value:
        fail(f"Override for {station_id} has an invalid electionEmail")
    provenance = record.get("_electionContactProvenance")
    authority: dict[str, Any] = {"email": email_value.lower()}
    if isinstance(provenance, dict):
        authorization = provenance.get("authorization")
        if isinstance(authorization, dict):
            authorization_type = authorization.get("type")
            if isinstance(authorization_type, str) and authorization_type:
                authority["authorizationType"] = authorization_type
        for field in ("electionId", "electionYear", "candidateId", "candidateSetDigest", "evidenceDigest"):
            value = provenance.get(field)
            if isinstance(value, str) and value:
                authority[field] = value
    return authority


def _candidate_packet(candidate: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "candidateId": candidate["candidateId"],
        "evidenceDigest": candidate["evidenceDigest"],
        "electionId": candidate["electionId"],
        "electionYear": candidate["electionYear"],
        "email": candidate["email"],
        "sourceId": candidate["sourceId"],
        "source": {
            "sourceUrl": candidate["source"]["sourceUrl"],
            "finalUrl": candidate["source"]["finalUrl"],
            "textSha256": candidate["source"]["textSha256"],
        },
        "sourceQuote": candidate["sourceQuote"],
        "electionContext": candidate["electionContext"],
        "sourceChain": list(candidate["sourceChain"]),
        "canonicalStation": copy.deepcopy(candidate["canonicalStation"]),
    }


def _packet_source(source: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "sourceUrl": source["sourceUrl"],
        "finalUrl": source["finalUrl"],
        "fetchedAt": source["fetchedAt"],
        "textSha256": source["textSha256"],
        "text": source["text"],
        "extractorVersion": source["extractorVersion"],
    }


def _candidate_set_digest(
    station_id: str, election_id: str, candidates: Iterable[Mapping[str, Any]], authority: Mapping[str, Any] | None
) -> str:
    authority_binding = None
    if authority is not None:
        authority_binding = {
            field: authority[field]
            for field in (
                "email",
                "authorizationType",
                "electionId",
                "electionYear",
                "candidateId",
                "candidateSetDigest",
                "evidenceDigest",
            )
            if field in authority
        }
    return sha256_json(
        {
            "stationId": station_id,
            "electionId": election_id,
            "candidateEvidenceDigests": sorted(candidate["evidenceDigest"] for candidate in candidates),
            "currentAuthority": authority_binding,
        }
    )


MODEL_RESPONSE_SCHEMA = {
    "name": "source_checked_election_review",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "candidateId",
            "stationId",
            "electionId",
            "electionYear",
            "candidateSetDigest",
            "evidenceDigest",
            "asOf",
            "decision",
            "validity",
            "checks",
            "citations",
            "rationale",
            "resolvesReviewIds",
        ],
        "properties": {
            "candidateId": {"type": "string", "minLength": 1},
            "stationId": {"type": "string", "minLength": 1},
            "electionId": {"type": "string", "minLength": 1},
            "electionYear": {"type": "string", "pattern": "^[0-9]{4}$"},
            "candidateSetDigest": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
            "evidenceDigest": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
            "asOf": {"type": "string", "minLength": 20},
            "decision": {"type": "string", "enum": sorted(REVIEW_DECISIONS)},
            "validity": {
                "type": "object",
                "additionalProperties": False,
                "required": ["deadlineText", "validUntil"],
                "properties": {
                    "deadlineText": {"type": ["string", "null"], "minLength": 1, "maxLength": 1000},
                    "validUntil": {"type": ["string", "null"], "minLength": 20},
                },
            },
            "checks": {
                "type": "object",
                "additionalProperties": False,
                "required": ["currentElection", "registrationRecipient", "stationScope"],
                "properties": {
                    "currentElection": {"type": "string", "enum": sorted(CHECK_VALUES)},
                    "registrationRecipient": {"type": "string", "enum": sorted(CHECK_VALUES)},
                    "stationScope": {"type": "string", "enum": sorted(CHECK_VALUES)},
                },
            },
            "citations": {
                "type": "array",
                "maxItems": 12,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["check", "sourceId", "quote"],
                    "properties": {
                        "check": {
                            "type": "string",
                            "enum": ["currentElection", "registrationRecipient", "stationScope"],
                        },
                        "sourceId": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
                        "quote": {"type": "string", "minLength": 1, "maxLength": 4000},
                    },
                },
            },
            "rationale": {"type": "string", "minLength": 1, "maxLength": 4000},
            "resolvesReviewIds": {
                "type": "array",
                "items": {"type": "string", "minLength": 1, "maxLength": 128},
                "maxItems": 64,
            },
        },
    },
}


def _prior_review_allowlist(review: Mapping[str, Any]) -> dict[str, Any]:
    return {
        field: copy.deepcopy(review[field])
        for field in (
            "reviewId",
            "reviewRole",
            "reviewStatus",
            "reviewedAt",
            "asOf",
            "candidateId",
            "electionId",
            "electionYear",
            "candidateSetDigest",
            "evidenceDigest",
            "decision",
            "validity",
            "checks",
            "citations",
            "rationale",
            "resolvesReviewIds",
        )
        if field in review
    }


def build_packets(
    candidate_payload: Any,
    canonical_payload: Any,
    policy_payload: Any,
    overrides_payload: Any,
    station_ids: Iterable[str] | None = None,
    prior_reviews: Iterable[Mapping[str, Any]] = (),
    as_of: str | None = None,
) -> dict[str, Any]:
    """Build the immutable public review packet document from current inputs."""
    # Packets snapshot the exact policy, canonical data, sources, and current
    # override authority that a review is allowed to evaluate.
    stations = canonical_stations(canonical_payload)
    policy = validate_policy(policy_payload)
    overrides = validate_overrides(overrides_payload)
    candidate_document, candidates, groups = validate_candidate_document(candidate_payload, stations)
    packet_as_of = as_of or utc_now()
    parse_nonfuture_timestamp(packet_as_of, "Packet asOf")
    if station_ids is None:
        selected = sorted(candidate_document["pendingStationIds"])
    else:
        selected = list(station_ids)
        if len(selected) != len(set(selected)):
            fail("A station can be selected only once")
        for station_id in selected:
            if station_id not in stations:
                fail(f"Selected station {station_id} is not canonical")
    prior_by_station: dict[str, list[dict[str, Any]]] = {}
    for review in prior_reviews:
        if isinstance(review, Mapping) and isinstance(review.get("stationId"), str):
            prior_by_station.setdefault(review["stationId"], []).append(_prior_review_allowlist(review))
    packets: list[dict[str, Any]] = []
    for station_id in sorted(selected):
        station_candidates = groups.get(station_id, [])
        if not station_candidates:
            continue
        if station_id in candidate_document["incompleteStationIds"]:
            continue
        authority = current_authority(overrides, station_id)
        candidate_set_digest = _candidate_set_digest(
            station_id, candidate_document["electionId"], station_candidates, authority
        )
        source_ids = sorted({candidate["sourceId"] for candidate in station_candidates})
        source_by_id = {candidate["sourceId"]: candidate["source"] for candidate in station_candidates}
        relevant_priors = [
            review
            for review in prior_by_station.get(station_id, [])
            if review.get("candidateSetDigest") == candidate_set_digest
        ]
        packets.append(
            {
                "stationId": station_id,
                "candidateSetDigest": candidate_set_digest,
                "asOf": packet_as_of,
                "candidates": [_candidate_packet(candidate) for candidate in sorted(station_candidates, key=lambda item: item["candidateId"])],
                "sources": {
                    source_id: _packet_source(source_by_id[source_id])
                    for source_id in source_ids
                },
                "currentAuthority": copy.deepcopy(authority),
                "priorReviews": sorted(relevant_priors, key=lambda item: item.get("reviewId", "")),
            }
        )
    return {
        "schemaVersion": 2,
        "asOf": packet_as_of,
        "policyDigest": sha256_json(policy),
        "canonicalDigest": sha256_json(canonical_payload),
        "responseSchema": copy.deepcopy(MODEL_RESPONSE_SCHEMA),
        "packets": packets,
    }


def packet_index(packet_document: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    packets = packet_document.get("packets")
    if not isinstance(packets, list):
        fail("Packet document requires packets array")
    indexed: dict[str, dict[str, Any]] = {}
    for index, packet in enumerate(packets):
        label = f"Packet #{index + 1}"
        if not isinstance(packet, dict):
            fail(f"{label} must be an object")
        station_id = require_string(packet, "stationId", label)
        if station_id in indexed:
            fail(f"Packet document repeats station {station_id}")
        candidate_set_digest = require_string(packet, "candidateSetDigest", label)
        if not HEX_SHA256_RE.fullmatch(candidate_set_digest):
            fail(f"{label} candidateSetDigest must be SHA-256")
        packet_as_of = require_string(packet, "asOf", label)
        parse_nonfuture_timestamp(packet_as_of, f"{label} asOf")
        candidates = packet.get("candidates")
        sources = packet.get("sources")
        if not isinstance(candidates, list) or not candidates or not isinstance(sources, dict):
            fail(f"{label} requires non-empty candidates and sources")
        indexed[station_id] = packet
    return indexed


def validate_packet_document(
    packet_document: Any,
    candidate_payload: Any,
    canonical_payload: Any,
    policy_payload: Any,
    overrides_payload: Any,
) -> dict[str, Any]:
    """Verify packet policy/canonical bindings and every public packet field."""
    if not isinstance(packet_document, dict) or packet_document.get("schemaVersion") != 2:
        fail("Packet document must be a schemaVersion 2 object")
    packet_as_of = require_string(packet_document, "asOf", "Packet document")
    parse_nonfuture_timestamp(packet_as_of, "Packet document asOf")
    provided = packet_index(packet_document)
    expected = build_packets(
        candidate_payload,
        canonical_payload,
        policy_payload,
        overrides_payload,
        provided,
        as_of=packet_as_of,
    )
    for field in ("policyDigest", "canonicalDigest"):
        if packet_document.get(field) != expected[field]:
            fail(f"Packet document {field} is stale or forged")
    if packet_document.get("responseSchema") != MODEL_RESPONSE_SCHEMA:
        fail("Packet document responseSchema is malformed")
    expected_index = packet_index(expected)
    if not set(provided).issubset(expected_index):
        fail("Packet document includes a station absent from current candidates")
    for station_id, packet in provided.items():
        expected_packet = expected_index[station_id]
        for field in ("stationId", "candidateSetDigest", "asOf", "candidates", "sources", "currentAuthority"):
            if packet.get(field) != expected_packet.get(field):
                fail(f"Packet for {station_id} does not match current source-bound evidence")
        if not isinstance(packet.get("priorReviews"), list):
            fail(f"Packet for {station_id} requires priorReviews array")
    return packet_document


def _packet_candidates(packet: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    candidates = packet.get("candidates")
    if not isinstance(candidates, list):
        fail("Packet requires candidates")
    indexed: dict[str, Mapping[str, Any]] = {}
    for candidate in candidates:
        if not isinstance(candidate, dict):
            fail("Packet candidate is malformed")
        candidate_id = require_string(candidate, "candidateId", "Packet candidate")
        if candidate_id in indexed:
            fail(f"Packet repeats candidate {candidate_id}")
        indexed[candidate_id] = candidate
    return indexed


def _validate_citation(
    citation: Any,
    packet: Mapping[str, Any],
    candidate: Mapping[str, Any],
    review_label: str,
    decision: str,
) -> tuple[str, str]:
    if not isinstance(citation, dict):
        fail(f"{review_label} citation is malformed")
    check = citation.get("check")
    source_id = citation.get("sourceId")
    quote = citation.get("quote")
    if check not in {"currentElection", "registrationRecipient", "stationScope"}:
        fail(f"{review_label} citation has an unknown check")
    if not isinstance(source_id, str) or not isinstance(quote, str) or not quote.strip() or quote != quote.strip():
        fail(f"{review_label} citation requires exact sourceId and quote")
    if decision == "accept":
        sources = packet.get("sources")
        source = sources.get(source_id) if isinstance(sources, dict) else None
        if not isinstance(source, dict) or not isinstance(source.get("text"), str) or quote not in source["text"]:
            fail(f"{review_label} citation quote is not exact public source text")
    return check, quote

def _scope_citation_is_explicit(quote: str, candidate: Mapping[str, Any]) -> bool:
    identity = candidate.get("canonicalStation")
    if not isinstance(identity, dict) or identity.get("isResident") is not False:
        return True
    country_names = identity.get("countryNames")
    if not isinstance(country_names, list):
        return False
    return any(
        isinstance(country_name, str)
        and len(country_name.strip().rstrip("аеиоуaeiou")) >= 3
        and country_name.strip().rstrip("аеиоуaeiou").casefold() in quote.casefold()
        for country_name in country_names
    )


def review_binds_packet(review: Any, packet: Mapping[str, Any]) -> bool:
    """Whether a review can affect the packet's current candidate evidence."""
    if not isinstance(review, dict):
        return False
    candidate_id = review.get("candidateId")
    if not isinstance(candidate_id, str):
        return False
    candidate = _packet_candidates(packet).get(candidate_id)
    if candidate is None:
        return False
    return (
        all(
            review.get(field) == (packet.get("candidateSetDigest") if field == "candidateSetDigest" else candidate.get(field))
            for field in ("electionId", "electionYear", "candidateSetDigest", "evidenceDigest")
        )
        and "asOf" in review
        and "validity" in review
    )


def _validate_review_record(
    review: Any,
    packets: Mapping[str, Mapping[str, Any]],
    *,
    required_role: str | None,
    allow_attested_import: bool,
    expected_as_of: str | None = None,
    reject_expired_acceptance: bool = False,
) -> dict[str, Any]:
    if not isinstance(review, dict):
        fail("AI review must be an object")
    label = f"AI review {review.get('reviewId', '<unknown>')}"
    review_id = require_string(review, "reviewId", label)
    if review.get("reviewerType") != "ai":
        fail(f"{label} reviewerType must be ai")
    role = require_string(review, "reviewRole", label)
    if role not in {"primary", "architect"} or (required_role is not None and role != required_role):
        fail(f"{label} has an unauthorized reviewRole")
    if review.get("reviewStatus") != "completed":
        fail(f"{label} must be completed")
    parse_timestamp(review.get("reviewedAt"), f"{label} reviewedAt")
    as_of = require_string(review, "asOf", label)
    parse_nonfuture_timestamp(as_of, f"{label} asOf")
    if expected_as_of is not None and as_of != expected_as_of:
        fail(f"{label} asOf does not match its review document")
    station_id = require_string(review, "stationId", label)
    packet = packets.get(station_id)
    if packet is None:
        fail(f"{label} does not bind a current candidate station")
    candidate_id = require_string(review, "candidateId", label)
    candidate = _packet_candidates(packet).get(candidate_id)
    if candidate is None:
        fail(f"{label} does not bind a current candidate")
    for field in ("electionId", "electionYear", "candidateSetDigest", "evidenceDigest"):
        expected = packet.get("candidateSetDigest") if field == "candidateSetDigest" else candidate.get(field)
        if review.get(field) != expected:
            fail(f"{label} {field} is stale or forged")
    decision = review.get("decision")
    if decision not in REVIEW_DECISIONS:
        fail(f"{label} has an invalid decision")
    invocation = review.get("invocation")
    # Only a configured endpoint or an explicitly attested harness artifact may
    # supply AI provenance; a locally shaped response cannot self-authorize.
    if not isinstance(invocation, dict):
        fail(f"{label} requires invocation provenance")
    transport = invocation.get("transport")
    invocation_id = invocation.get("invocationId")
    requested_model = invocation.get("requestedModel")
    reported_model = invocation.get("reportedModel")
    identity_source = invocation.get("identitySource")
    if not isinstance(invocation_id, str) or not invocation_id.strip() or not isinstance(requested_model, str) or not requested_model.strip():
        fail(f"{label} invocation requires real invocationId and requestedModel")
    if transport == "endpoint":
        if identity_source != "endpoint_response" or not isinstance(reported_model, str) or not reported_model.strip():
            fail(f"{label} endpoint provenance must preserve actual response model identity")
    elif transport == "harness_import":
        if not allow_attested_import or identity_source != "operator_attestation":
            fail(f"{label} imported harness review requires explicit operator attestation")
        if reported_model is not None and (not isinstance(reported_model, str) or not reported_model.strip()):
            fail(f"{label} reportedModel must be a non-empty model or null")
    else:
        fail(f"{label} has an unsupported invocation transport")
    validity = review.get("validity")
    if not isinstance(validity, dict) or set(validity) != {"deadlineText", "validUntil"}:
        fail(f"{label} requires source-bound validity")
    deadline_text = validity.get("deadlineText")
    valid_until = validity.get("validUntil")
    if deadline_text is not None and (
        not isinstance(deadline_text, str) or not deadline_text.strip() or deadline_text != deadline_text.strip() or len(deadline_text) > 1000
    ):
        fail(f"{label} validity deadlineText must be a bounded exact source excerpt or null")
    if valid_until is not None and (not isinstance(valid_until, str) or not valid_until.strip() or valid_until != valid_until.strip()):
        fail(f"{label} validity validUntil must be an RFC3339 timestamp or null")
    if valid_until is not None:
        parse_timestamp(valid_until, f"{label} validity validUntil")
        if deadline_text is None:
            fail(f"{label} validity validUntil requires its exact deadlineText")
    if deadline_text is not None and decision == "accept":
        sources = packet.get("sources")
        candidate_source = sources.get(candidate["sourceId"]) if isinstance(sources, dict) else None
        if not isinstance(candidate_source, dict) or not isinstance(candidate_source.get("text"), str) or deadline_text not in candidate_source["text"]:
            fail(f"{label} validity deadlineText is not exact candidate source text")
    checks = review.get("checks")
    if not isinstance(checks, dict) or set(checks) != {"currentElection", "registrationRecipient", "stationScope"} or any(
        value not in CHECK_VALUES for value in checks.values()
    ):
        fail(f"{label} requires complete supported/unsupported/uncertain checks")
    citations = review.get("citations")
    if not isinstance(citations, list):
        fail(f"{label} requires citations array")
    citation_checks: dict[str, list[str]] = {}
    for citation in citations:
        check, quote = _validate_citation(citation, packet, candidate, label, decision)
        citation_checks.setdefault(check, []).append(quote)
    rationale = review.get("rationale")
    if not isinstance(rationale, str) or not rationale.strip() or len(rationale) > 4000:
        fail(f"{label} requires a bounded rationale")
    resolves = review.get("resolvesReviewIds")
    if not isinstance(resolves, list) or not all(isinstance(item, str) and item.strip() == item and item for item in resolves):
        fail(f"{label} requires resolvesReviewIds array")
    if len(resolves) != len(set(resolves)):
        fail(f"{label} resolvesReviewIds repeats an ID")
    if decision == "accept":
        if any(checks[name] != "supported" for name in checks):
            fail(f"{label} accept requires all checks supported")
        if set(citation_checks) != {"currentElection", "registrationRecipient", "stationScope"}:
            fail(f"{label} accept requires exact citations for all checks")
        if not any(candidate["electionYear"] in quote for quote in citation_checks["currentElection"]):
            fail(f"{label} currentElection citation does not visibly contain election year")
        if not any(
            contains_exact_mailbox(quote, candidate["email"]) and REGISTRATION_PURPOSE_RE.search(quote)
            for quote in citation_checks["registrationRecipient"]
        ):
            fail(f"{label} registrationRecipient citation lacks exact email mailbox and registration purpose")
        if not any(_scope_citation_is_explicit(quote, candidate) for quote in citation_checks["stationScope"]):
            fail(f"{label} stationScope citation cannot infer nonresident coverage from host")
        if reject_expired_acceptance and valid_until is not None and parse_timestamp(valid_until, f"{label} validity validUntil") <= datetime.now(timezone.utc):
            fail(f"{label} accept has a known passed validity deadline")
    normalized = {
        "reviewId": review_id,
        "reviewerType": "ai",
        "reviewRole": role,
        "reviewStatus": "completed",
        "reviewedAt": review["reviewedAt"],
        "asOf": as_of,
        "invocation": {
            "transport": transport,
            "invocationId": invocation_id,
            "requestedModel": requested_model,
            "reportedModel": reported_model,
            "identitySource": identity_source,
        },
        "stationId": station_id,
        "candidateId": candidate_id,
        "electionId": review["electionId"],
        "electionYear": review["electionYear"],
        "candidateSetDigest": review["candidateSetDigest"],
        "evidenceDigest": review["evidenceDigest"],
        "decision": decision,
        "validity": {"deadlineText": deadline_text, "validUntil": valid_until},
        "checks": {name: checks[name] for name in ("currentElection", "registrationRecipient", "stationScope")},
        "citations": [
            {"check": citation["check"], "sourceId": citation["sourceId"], "quote": citation["quote"]}
            for citation in citations
        ],
        "rationale": rationale.strip(),
        "resolvesReviewIds": list(resolves),
    }
    return normalized


def _historical_review_record(review: Any) -> dict[str, Any]:
    if not isinstance(review, dict):
        fail("Historical AI review must be an object")
    require_string(review, "reviewId", "Historical AI review")
    canonical_json_bytes(review)
    return copy.deepcopy(review)


def validate_review_document(
    payload: Any,
    packet_document: Mapping[str, Any],
    *,
    required_role: str | None = None,
    allow_attested_import: bool = False,
    allow_historical: bool = False,
) -> dict[str, Any]:
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 2:
        fail("AI reviews must be a schemaVersion 2 object")
    document_as_of = payload.get("asOf")
    if document_as_of is not None:
        if not isinstance(document_as_of, str) or not document_as_of.strip():
            fail("AI reviews asOf must be an RFC3339 timestamp")
        parse_nonfuture_timestamp(document_as_of, "AI reviews asOf")
    elif not allow_historical:
        fail("AI reviews requires an asOf timestamp")
    for field in ("policyDigest", "canonicalDigest"):
        if payload.get(field) != packet_document.get(field) and not allow_historical:
            fail(f"AI reviews {field} is stale or forged")
    reviews = payload.get("reviews")
    if not isinstance(reviews, list):
        fail("AI reviews must contain reviews array")
    packets = packet_index(packet_document)
    normalized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for review in reviews:
        station_id = review.get("stationId") if isinstance(review, dict) else None
        packet = packets.get(station_id) if isinstance(station_id, str) else None
        if packet is not None and review_binds_packet(review, packet):
            normalized_review = _validate_review_record(
                review,
                packets,
                required_role=required_role,
                allow_attested_import=allow_attested_import,
                expected_as_of=document_as_of if not allow_historical else None,
                reject_expired_acceptance=not allow_historical,
            )
        elif allow_historical:
            normalized_review = _historical_review_record(review)
        else:
            normalized_review = _validate_review_record(
                review,
                packets,
                required_role=required_role,
                allow_attested_import=allow_attested_import,
                expected_as_of=document_as_of,
                reject_expired_acceptance=True,
            )
        review_id = normalized_review["reviewId"]
        if review_id in seen_ids:
            fail(f"AI reviews repeat reviewId {review_id}")
        seen_ids.add(review_id)
        normalized.append(normalized_review)
    return {
        "schemaVersion": 2,
        "asOf": packet_document["asOf"],
        "policyDigest": packet_document["policyDigest"],
        "canonicalDigest": packet_document["canonicalDigest"],
        "reviews": sorted(normalized, key=lambda item: item["reviewId"]),
    }


def make_review_id(review: Mapping[str, Any]) -> str:
    """Stable collision-resistant review ID from genuine invocation/binding data."""
    invocation = review.get("invocation") if isinstance(review.get("invocation"), Mapping) else {}
    return sha256_json(
        {
            "invocationId": invocation.get("invocationId"),
            "transport": invocation.get("transport"),
            "reviewRole": review.get("reviewRole"),
            "stationId": review.get("stationId"),
            "candidateId": review.get("candidateId"),
            "candidateSetDigest": review.get("candidateSetDigest"),
            "evidenceDigest": review.get("evidenceDigest"),
            "decision": review.get("decision"),
        }
    )


def merge_review_documents(
    existing: Mapping[str, Any] | None, incoming: Mapping[str, Any], packet_document: Mapping[str, Any]
) -> dict[str, Any]:
    """Merge current reviews with immutable historical records."""
    # Historical records remain auditable, but only incoming records bound to
    # these packets can affect the current promotion decision.
    incoming_valid = validate_review_document(incoming, packet_document, allow_attested_import=True)
    existing_valid = (
        validate_review_document(existing, packet_document, allow_attested_import=True, allow_historical=True)
        if existing is not None
        else {
            "schemaVersion": 2,
            "asOf": packet_document["asOf"],
            "policyDigest": packet_document["policyDigest"],
            "canonicalDigest": packet_document["canonicalDigest"],
            "reviews": [],
        }
    )
    merged: dict[str, dict[str, Any]] = {review["reviewId"]: review for review in existing_valid["reviews"]}
    for review in incoming_valid["reviews"]:
        prior = merged.get(review["reviewId"])
        if prior is not None and prior != review:
            fail(f"Review ID collision for {review['reviewId']}")
        merged[review["reviewId"]] = review
    return {
        "schemaVersion": 2,
        "asOf": packet_document["asOf"],
        "policyDigest": packet_document["policyDigest"],
        "canonicalDigest": packet_document["canonicalDigest"],
        "reviews": sorted(merged.values(), key=lambda item: item["reviewId"]),
    }


def source_is_fresh(source: Mapping[str, Any], max_age_hours: int, now: datetime | None = None) -> bool:
    fetched = parse_timestamp(source.get("fetchedAt"), "Candidate source fetchedAt")
    reference = now or datetime.now(timezone.utc)
    return fetched <= reference and reference - fetched <= timedelta(hours=max_age_hours)

def review_validity_has_expired(review: Mapping[str, Any], now: datetime | None = None) -> bool:
    validity = review.get("validity")
    if not isinstance(validity, Mapping):
        return False
    valid_until = validity.get("validUntil")
    if not isinstance(valid_until, str):
        return False
    return parse_timestamp(valid_until, "AI review validity validUntil") <= (now or datetime.now(timezone.utc))


def station_is_suppressed(overrides: Mapping[str, Any], station_id: str, election_id: str) -> bool:
    record = overrides["missionOverrides"].get(station_id)
    if not isinstance(record, dict):
        return False
    suppression = record.get("_electionContactSuppression")
    if not isinstance(suppression, dict):
        return False
    suppressed_election = suppression.get("electionId")
    return suppressed_election is None or suppressed_election == election_id
