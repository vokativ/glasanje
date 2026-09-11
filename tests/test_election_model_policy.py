"""Behavior regressions for source-checked AI election-contact authorization."""

from __future__ import annotations
import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
COMMON_PATH = ROOT / "scripts" / "election_contact_common.py"
PROMOTION = ROOT / "scripts" / "promote_election_contacts.py"
REVIEW = ROOT / "scripts" / "review_election_candidates.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


COMMON = load_module("election_contact_common_model_policy", COMMON_PATH)


class ElectionModelPolicyTests(unittest.TestCase):
    def fixture_documents(self) -> tuple[dict, dict, dict, dict]:
        canonical = {
            "schemaVersion": 1,
            "countries": [
                {
                    "countryCode": "AT",
                    "label": "Austrija",
                    "stations": [
                        {
                            "id": "st-test",
                            "website": "https://vienna.mfa.gov.rs",
                            "isResident": True,
                            "embassy": "Ambasada Republike Srbije u Austriji",
                        }
                    ],
                }
            ],
        }
        policy = {
            "schemaVersion": 2,
            "mode": "source_checked_ai",
            "requiredAiApprovals": 1,
            "escalationRole": "architect",
            "humanReviewerIds": [],
            "maxSourceAgeHours": 24,
        }
        quote = "For the 2026 parliamentary election, submit registration to izbori.vienna@mfa.gov.rs."
        source_url = "https://vienna.mfa.gov.rs/elections/2026"
        text_hash = COMMON.sha256_bytes(quote.encode("utf-8"))
        source_id = COMMON.sha256_json({"sourceUrl": source_url, "textSha256": text_hash})
        candidates = {
            "schemaVersion": 1,
            "electionId": "2026-parliamentary",
            "electionYear": "2026",
            "generatedAt": COMMON.utc_now(),
            "pendingStationIds": ["st-test"],
            "sources": {
                source_id: {
                    "sourceUrl": source_url,
                    "finalUrl": source_url,
                    "fetchedAt": COMMON.utc_now(),
                    "bodySha256": "0" * 64,
                    "textSha256": text_hash,
                    "text": quote,
                    "extractorVersion": "1",
                }
            },
            "candidates": [
                {
                    "candidateId": "candidate-test",
                    "electionId": "2026-parliamentary",
                    "electionYear": "2026",
                    "countryCode": "AT",
                    "stationId": "st-test",
                    "email": "izbori.vienna@mfa.gov.rs",
                    "title": quote,
                    "electionContext": quote,
                    "sourceQuote": quote,
                    "sourceId": source_id,
                    "sourceChain": ["https://www.mfa.gov.rs/directory/austria", source_url],
                }
            ],
        }
        overrides = {"missionOverrides": {}, "countryOverrides": {}}
        return canonical, policy, candidates, overrides

    def accepted_review(
        self,
        packet: dict,
        *,
        decision: str = "accept",
        role: str = "primary",
        resolves: list[str] | None = None,
        requested_model: str = "slow",
        invocation_id: str | None = None,
    ) -> dict:
        candidate = packet["candidates"][0]
        quote = candidate["sourceQuote"]
        checks = {
            "currentElection": "supported",
            "registrationRecipient": "supported",
            "stationScope": "supported",
        }
        if decision != "accept":
            checks = {name: "uncertain" for name in checks}
        review = {
            "reviewerType": "ai",
            "reviewRole": role,
            "reviewStatus": "completed",
            "reviewedAt": COMMON.utc_now(),
            "asOf": packet["asOf"],
            "invocation": {
                "transport": "harness_import",
                "invocationId": invocation_id or f"real-harness-{role}-{decision}",
                "requestedModel": requested_model,
                "reportedModel": None,
                "identitySource": "operator_attestation",
            },
            "stationId": packet["stationId"],
            "candidateId": candidate["candidateId"],
            "electionId": candidate["electionId"],
            "electionYear": candidate["electionYear"],
            "candidateSetDigest": packet["candidateSetDigest"],
            "evidenceDigest": candidate["evidenceDigest"],
            "decision": decision,
            "validity": {"deadlineText": None, "validUntil": None},
            "checks": checks,
            "citations": (
                [
                    {"check": "currentElection", "sourceId": candidate["sourceId"], "quote": quote},
                    {"check": "registrationRecipient", "sourceId": candidate["sourceId"], "quote": quote},
                    {"check": "stationScope", "sourceId": candidate["sourceId"], "quote": quote},
                ]
                if decision == "accept"
                else []
            ),
            "rationale": "The official notice explicitly identifies the current election and submission mailbox.",
            "resolvesReviewIds": resolves or [],
        }
        review["reviewId"] = COMMON.make_review_id(review)
        return review

    def write_fixture(
        self,
        directory: Path,
        *,
        review: dict,
        overrides_payload: dict | None = None,
        candidates_payload: dict | None = None,
    ) -> tuple[Path, Path, Path, Path, Path]:
        canonical, policy, candidates, overrides = self.fixture_documents()
        if overrides_payload is not None:
            overrides = overrides_payload
        if candidates_payload is not None:
            candidates = candidates_payload
        packets = COMMON.build_packets(candidates, canonical, policy, overrides)
        review_document = {
            "schemaVersion": 2,
            "asOf": packets["asOf"],
            "policyDigest": packets["policyDigest"],
            "canonicalDigest": packets["canonicalDigest"],
            "reviews": [review(packets["packets"][0])],
        }
        paths = [directory / name for name in ("canonical.json", "policy.json", "candidates.json", "overrides.json", "reviews.json")]
        for path, value in zip(paths, (canonical, policy, candidates, overrides, review_document), strict=True):
            path.write_text(json.dumps(value), encoding="utf-8")
        return tuple(paths)  # type: ignore[return-value]

    def promote(self, *paths: Path, extra: list[str] | None = None) -> subprocess.CompletedProcess[str]:
        canonical, policy, candidates, overrides, reviews = paths
        return subprocess.run(
            [
                sys.executable,
                str(PROMOTION),
                "--candidates",
                str(candidates),
                "--reviews",
                str(reviews),
                "--reviewers",
                str(policy),
                "--canonical",
                str(canonical),
                "--overrides",
                str(overrides),
                "--station",
                "st-test",
                *(extra or []),
            ],
            check=False,
            text=True,
            capture_output=True,
        )

    def test_zero_human_attested_import_promotes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=lambda packet: self.accepted_review(packet, requested_model="configured-architect-route")
            )
            result = self.promote(*paths)
            self.assertEqual(result.returncode, 0, result.stderr)
            overrides = json.loads(paths[3].read_text(encoding="utf-8"))
            provenance = overrides["missionOverrides"]["st-test"]["_electionContactProvenance"]
            self.assertEqual(overrides["missionOverrides"]["st-test"]["electionEmail"], "izbori.vienna@mfa.gov.rs")
            self.assertEqual(provenance["authorization"]["type"], "ai")
            self.assertNotIn("humanApprovals", provenance)

    def test_stale_digest_fails_closed_without_override_write(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(Path(temporary), review=self.accepted_review)
            review_document = json.loads(paths[4].read_text(encoding="utf-8"))
            review_document["reviews"][0]["candidateSetDigest"] = "f" * 64
            paths[4].write_text(json.dumps(review_document), encoding="utf-8")
            result = self.promote(*paths)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(json.loads(paths[3].read_text(encoding="utf-8"))["missionOverrides"], {})

    def test_contrary_primary_review_is_held_until_architect_resolves_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=lambda packet: self.accepted_review(packet, decision="needs_review")
            )
            report = Path(temporary) / "report.json"
            result = self.promote(*paths, extra=["--dry-run", "--report", str(report)])
            self.assertEqual(result.returncode, 0, result.stderr)
            held = json.loads(report.read_text(encoding="utf-8"))["held"]
            self.assertEqual(held[0]["stationId"], "st-test")
            self.assertIn("architect", held[0]["reason"])
            self.assertEqual(json.loads(paths[3].read_text(encoding="utf-8"))["missionOverrides"], {})


    def test_mixed_legacy_catalog_exports_only_fresh_pending_group(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        canonical["countries"].append(
            {
                "countryCode": "BH",
                "label": "Bahrein",
                "stations": [{"id": "st-legacy", "website": "", "isResident": True}],
            }
        )
        candidates["candidates"].append(
            {
                "candidateId": "legacy-unbound",
                "countryCode": "BH",
                "stationId": "st-legacy",
                "email": "legacy@example.test",
            }
        )

        packets = COMMON.build_packets(candidates, canonical, policy, overrides)

        self.assertEqual([packet["stationId"] for packet in packets["packets"]], ["st-test"])
        document, _, _ = COMMON.validate_candidate_document(candidates, COMMON.canonical_stations(canonical))
        self.assertEqual(document["incompleteStationIds"], ["st-legacy"])

    def test_new_election_same_email_requires_and_records_fresh_authorization(self) -> None:
        overrides = {
            "missionOverrides": {
                "st-test": {
                    "electionEmail": "izbori.vienna@mfa.gov.rs",
                    "_electionContactProvenance": {"electionId": "2025-parliamentary"},
                }
            }
        }
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(Path(temporary), review=self.accepted_review, overrides_payload=overrides)
            result = self.promote(*paths)
            self.assertEqual(result.returncode, 0, result.stderr)
            provenance = json.loads(paths[3].read_text(encoding="utf-8"))["missionOverrides"]["st-test"][
                "_electionContactProvenance"
            ]
            self.assertEqual(provenance["electionId"], "2026-parliamentary")

    def test_architect_rejection_blocks_until_an_accept_explicitly_resolves_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(Path(temporary), review=self.accepted_review)
            canonical, policy, candidates, overrides = self.fixture_documents()
            packet = COMMON.build_packets(candidates, canonical, policy, overrides)["packets"][0]
            rejected = self.accepted_review(packet, decision="reject", role="architect")
            review_document = json.loads(paths[4].read_text(encoding="utf-8"))
            review_document["reviews"].append(rejected)
            paths[4].write_text(json.dumps(review_document), encoding="utf-8")

            report = Path(temporary) / "report.json"
            result = self.promote(*paths, extra=["--dry-run", "--report", str(report)])

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("architect", json.loads(report.read_text(encoding="utf-8"))["held"][0]["reason"])

    def test_provenance_uses_the_architect_review_that_resolved_the_conflict(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=lambda packet: self.accepted_review(packet, decision="needs_review")
            )
            canonical, policy, candidates, overrides = self.fixture_documents()
            packet = COMMON.build_packets(candidates, canonical, policy, overrides)["packets"][0]
            review_document = json.loads(paths[4].read_text(encoding="utf-8"))
            primary_id = review_document["reviews"][0]["reviewId"]
            unresolved = self.accepted_review(packet, role="architect", invocation_id="architect-unresolved")
            resolving = self.accepted_review(
                packet,
                role="architect",
                resolves=[primary_id],
                invocation_id="architect-resolving",
            )
            review_document["reviews"].extend([unresolved, resolving])
            paths[4].write_text(json.dumps(review_document), encoding="utf-8")

            result = self.promote(*paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            provenance = json.loads(paths[3].read_text(encoding="utf-8"))["missionOverrides"]["st-test"][
                "_electionContactProvenance"
            ]
            self.assertEqual(provenance["authorization"]["reviewId"], resolving["reviewId"])
    def test_fresh_same_email_evidence_is_not_blocked_by_a_stale_duplicate_page(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        stale_url = "https://vienna.mfa.gov.rs/elections/2026-english"
        quote = candidates["candidates"][0]["sourceQuote"]
        text_hash = COMMON.sha256_bytes(quote.encode("utf-8"))
        stale_id = COMMON.sha256_json({"sourceUrl": stale_url, "textSha256": text_hash})
        candidates["sources"][stale_id] = {
            "sourceUrl": stale_url,
            "finalUrl": stale_url,
            "fetchedAt": "2000-01-01T00:00:00Z",
            "bodySha256": "1" * 64,
            "textSha256": text_hash,
            "text": quote,
            "extractorVersion": "1",
        }
        stale_candidate = dict(candidates["candidates"][0])
        stale_candidate.update(
            {
                "candidateId": "z-stale-duplicate",
                "sourceId": stale_id,
                "sourceChain": ["https://www.mfa.gov.rs/directory/austria", stale_url],
            }
        )
        candidates["candidates"].append(stale_candidate)

        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=self.accepted_review, candidates_payload=candidates
            )
            result = self.promote(*paths)

            self.assertEqual(result.returncode, 0, result.stderr)

    def test_stale_distinct_email_competitor_holds_the_selected_group(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        stale_url = "https://vienna.mfa.gov.rs/elections/2026-conflict"
        quote = "For the 2026 parliamentary election, submit registration to other.vienna@mfa.gov.rs."
        text_hash = COMMON.sha256_bytes(quote.encode("utf-8"))
        stale_id = COMMON.sha256_json({"sourceUrl": stale_url, "textSha256": text_hash})
        candidates["sources"][stale_id] = {
            "sourceUrl": stale_url,
            "finalUrl": stale_url,
            "fetchedAt": "2000-01-01T00:00:00Z",
            "bodySha256": "2" * 64,
            "textSha256": text_hash,
            "text": quote,
            "extractorVersion": "1",
        }
        stale_candidate = dict(candidates["candidates"][0])
        stale_candidate.update(
            {
                "candidateId": "z-stale-conflict",
                "email": "other.vienna@mfa.gov.rs",
                "title": quote,
                "electionContext": quote,
                "sourceQuote": quote,
                "sourceId": stale_id,
                "sourceChain": ["https://www.mfa.gov.rs/directory/austria", stale_url],
            }
        )
        candidates["candidates"].append(stale_candidate)

        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=self.accepted_review, candidates_payload=candidates
            )
            report = Path(temporary) / "report.json"
            result = self.promote(*paths, extra=["--dry-run", "--report", str(report)])

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("competing candidate source", json.loads(report.read_text(encoding="utf-8"))["held"][0]["reason"])

    def test_fresh_current_review_supersedes_stale_history_but_stale_only_holds(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        old_packet = COMMON.build_packets(candidates, canonical, policy, overrides)["packets"][0]
        stale_review = self.accepted_review(old_packet, invocation_id="old-evidence")
        source = candidates["sources"][candidates["candidates"][0]["sourceId"]]
        source["text"] += "\nThis notice was updated without changing the registration mailbox."
        source["textSha256"] = COMMON.sha256_bytes(source["text"].encode("utf-8"))
        fresh_source_id = COMMON.sha256_json(
            {"sourceUrl": source["sourceUrl"], "textSha256": source["textSha256"]}
        )
        del candidates["sources"][candidates["candidates"][0]["sourceId"]]
        candidates["sources"][fresh_source_id] = source
        candidates["candidates"][0]["sourceId"] = fresh_source_id

        with tempfile.TemporaryDirectory() as temporary:
            paths = self.write_fixture(
                Path(temporary), review=self.accepted_review, candidates_payload=candidates
            )
            review_document = json.loads(paths[4].read_text(encoding="utf-8"))
            review_document["reviews"].append(stale_review)
            paths[4].write_text(json.dumps(review_document), encoding="utf-8")

            fresh_report = Path(temporary) / "fresh-report.json"
            fresh = self.promote(*paths, extra=["--dry-run", "--report", str(fresh_report)])
            self.assertEqual(fresh.returncode, 0, fresh.stderr)
            self.assertEqual(json.loads(fresh_report.read_text(encoding="utf-8"))["eligibleStationIds"], ["st-test"])

            review_document["reviews"] = [stale_review]
            paths[4].write_text(json.dumps(review_document), encoding="utf-8")
            stale_report = Path(temporary) / "stale-report.json"
            stale = self.promote(*paths, extra=["--dry-run", "--report", str(stale_report)])
            self.assertEqual(stale.returncode, 0, stale.stderr)
            self.assertIn("only stale review bindings", json.loads(stale_report.read_text(encoding="utf-8"))["held"][0]["reason"])

    def test_mailbox_tokens_accept_terminal_punctuation_but_not_domain_extensions(self) -> None:
        mailbox = "izbori.vienna@mfa.gov.rs"
        self.assertEqual(COMMON.extract_mailboxes(f"Submit to {mailbox}."), {mailbox})
        self.assertFalse(COMMON.contains_exact_mailbox(f"Submit to {mailbox}.evil", mailbox))
        canonical, policy, candidates, overrides = self.fixture_documents()
        self.assertEqual(len(COMMON.build_packets(candidates, canonical, policy, overrides)["packets"]), 1)



    def test_substring_mailboxes_cannot_authorize_candidate_or_citation(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        candidate = candidates["candidates"][0]
        fake_quote = "For the 2026 parliamentary election, submit registration to xizbori.vienna@mfa.gov.rs."
        source = candidates["sources"][candidate["sourceId"]]
        source["text"] = fake_quote
        source["textSha256"] = COMMON.sha256_bytes(fake_quote.encode("utf-8"))
        fake_source_id = COMMON.sha256_json(
            {"sourceUrl": source["sourceUrl"], "textSha256": source["textSha256"]}
        )
        del candidates["sources"][candidate["sourceId"]]
        candidates["sources"][fake_source_id] = source
        candidate.update(
            {"title": fake_quote, "electionContext": fake_quote, "sourceQuote": fake_quote, "sourceId": fake_source_id}
        )
        candidate_document, candidate_records, _ = COMMON.validate_candidate_document(
            candidates, COMMON.canonical_stations(canonical)
        )
        self.assertEqual(candidate_records, [])
        self.assertEqual(candidate_document["incompleteStationIds"], ["st-test"])
        self.assertEqual(COMMON.build_packets(candidates, canonical, policy, overrides)["packets"], [])

        canonical, policy, candidates, overrides = self.fixture_documents()
        candidate = candidates["candidates"][0]
        fake_quote = "For the 2026 parliamentary election, submit registration to xizbori.vienna@mfa.gov.rs."
        source = candidates["sources"][candidate["sourceId"]]
        source["text"] += "\n" + fake_quote
        source["textSha256"] = COMMON.sha256_bytes(source["text"].encode("utf-8"))
        source_id = COMMON.sha256_json({"sourceUrl": source["sourceUrl"], "textSha256": source["textSha256"]})
        del candidates["sources"][candidate["sourceId"]]
        candidates["sources"][source_id] = source
        candidate["sourceId"] = source_id
        packet_document = COMMON.build_packets(candidates, canonical, policy, overrides)
        review = self.accepted_review(packet_document["packets"][0])
        for citation in review["citations"]:
            if citation["check"] == "registrationRecipient":
                citation["quote"] = fake_quote
        review_document = {
            "schemaVersion": 2,
            "asOf": packet_document["asOf"],
            "policyDigest": packet_document["policyDigest"],
            "canonicalDigest": packet_document["canonicalDigest"],
            "reviews": [review],
        }
        with self.assertRaises(COMMON.ValidationError):
            COMMON.validate_review_document(review_document, packet_document, allow_attested_import=True)


    def test_delayed_import_replays_identical_authentic_review_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            paths = self.write_fixture(directory, review=self.accepted_review)
            canonical, policy, candidates, overrides = (
                json.loads(path.read_text(encoding="utf-8")) for path in paths[:4]
            )
            delayed_as_of = (datetime.now(timezone.utc).replace(microsecond=0) - timedelta(days=1)).isoformat().replace(
                "+00:00", "Z"
            )
            packet = COMMON.build_packets(candidates, canonical, policy, overrides, as_of=delayed_as_of)["packets"][0]
            imported_document = {
                "schemaVersion": 2,
                "asOf": delayed_as_of,
                "policyDigest": COMMON.sha256_json(policy),
                "canonicalDigest": COMMON.sha256_json(canonical),
                "reviews": [self.accepted_review(packet, invocation_id="genuine-delayed-import")],
            }
            imported = directory / "imported.json"
            payload = (json.dumps(imported_document, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            paths[4].write_bytes(payload)
            imported.write_bytes(payload)
            before = paths[4].read_bytes()

            result = subprocess.run(
                [
                    sys.executable,
                    str(REVIEW),
                    "--input",
                    str(paths[2]),
                    "--output",
                    str(paths[4]),
                    "--canonical",
                    str(paths[0]),
                    "--reviewers",
                    str(paths[1]),
                    "--overrides",
                    str(paths[3]),
                    "--role",
                    "primary",
                    "--import-reviews",
                    str(imported),
                    "--attest-import",
                ],
                check=False,
                text=True,
                capture_output=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(paths[4].read_bytes(), before)

    def test_delayed_import_preserves_each_review_as_of_in_mixed_history(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            paths = self.write_fixture(directory, review=lambda packet: self.accepted_review(packet, invocation_id="existing-review"))
            canonical, policy, candidates, overrides = (
                json.loads(path.read_text(encoding="utf-8")) for path in paths[:4]
            )
            existing_document = json.loads(paths[4].read_text(encoding="utf-8"))
            existing_as_of = existing_document["reviews"][0]["asOf"]
            delayed_as_of = (datetime.now(timezone.utc).replace(microsecond=0) - timedelta(days=1)).isoformat().replace(
                "+00:00", "Z"
            )
            packet = COMMON.build_packets(candidates, canonical, policy, overrides, as_of=delayed_as_of)["packets"][0]
            imported_document = {
                "schemaVersion": 2,
                "asOf": delayed_as_of,
                "policyDigest": COMMON.sha256_json(policy),
                "canonicalDigest": COMMON.sha256_json(canonical),
                "reviews": [self.accepted_review(packet, invocation_id="delayed-review")],
            }
            imported = directory / "imported.json"
            imported.write_text(json.dumps(imported_document), encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(REVIEW),
                    "--input",
                    str(paths[2]),
                    "--output",
                    str(paths[4]),
                    "--canonical",
                    str(paths[0]),
                    "--reviewers",
                    str(paths[1]),
                    "--overrides",
                    str(paths[3]),
                    "--role",
                    "primary",
                    "--import-reviews",
                    str(imported),
                    "--attest-import",
                ],
                check=False,
                text=True,
                capture_output=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            merged = json.loads(paths[4].read_text(encoding="utf-8"))
            self.assertEqual(merged["asOf"], delayed_as_of)
            self.assertEqual({review["asOf"] for review in merged["reviews"]}, {existing_as_of, delayed_as_of})
    def test_new_accept_rejects_known_passed_source_deadline(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        packets = COMMON.build_packets(candidates, canonical, policy, overrides)
        review = self.accepted_review(packets["packets"][0])
        review["validity"] = {
            "deadlineText": review["citations"][0]["quote"],
            "validUntil": "2000-01-01T00:00:00Z",
        }
        review["reviewId"] = COMMON.make_review_id(review)
        document = {
            "schemaVersion": 2,
            "asOf": packets["asOf"],
            "policyDigest": packets["policyDigest"],
            "canonicalDigest": packets["canonicalDigest"],
            "reviews": [review],
        }

        with self.assertRaises(COMMON.ValidationError):
            COMMON.validate_review_document(document, packets, allow_attested_import=True)

    def test_nonresident_scope_requires_covered_country_in_source_citation(self) -> None:
        canonical, policy, candidates, overrides = self.fixture_documents()
        canonical["countries"][0]["label"] = "Surinam"
        canonical["countries"][0]["stations"][0]["isResident"] = False
        packets = COMMON.build_packets(candidates, canonical, policy, overrides)
        review = self.accepted_review(packets["packets"][0])
        document = {
            "schemaVersion": 2,
            "asOf": packets["asOf"],
            "policyDigest": packets["policyDigest"],
            "canonicalDigest": packets["canonicalDigest"],
            "reviews": [review],
        }

        with self.assertRaises(COMMON.ValidationError):
            COMMON.validate_review_document(document, packets, allow_attested_import=True)

if __name__ == "__main__":
    unittest.main()
