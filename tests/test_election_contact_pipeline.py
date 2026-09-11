"""Contract tests for election-contact discovery, review, and promotion."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIRECTORY = REPOSITORY_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIRECTORY))
from election_contact_contract import evidence_snapshot_hash
BUILD_SCRIPT = SCRIPTS_DIRECTORY / "build_canonical_dataset.py"
DISCOVERY_SCRIPT = SCRIPTS_DIRECTORY / "discover_election_contacts.py"
REVIEW_SCRIPT = SCRIPTS_DIRECTORY / "review_election_candidates.py"
PROMOTION_SCRIPT = SCRIPTS_DIRECTORY / "promote_election_contacts.py"


def load_script_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


DISCOVERY = load_script_module("election_contact_discovery_for_tests", DISCOVERY_SCRIPT)
REVIEW = load_script_module("election_contact_review_for_tests", REVIEW_SCRIPT)
PROMOTION = load_script_module("election_contact_promotion_for_tests", PROMOTION_SCRIPT)


class ElectionContactPipelineTests(unittest.TestCase):
    def test_discovery_emits_an_unselected_v2_evidence_proposal(self) -> None:
        payload = self._run_discovery_fixture(
            """
            <html><head><title>Izbori 2026</title></head><body>
              <h1>Obaveštenje o parlamentarnim izborima 2026. godine</h1>
              <p>Za glasanje u inostranstvu na izborima 2026, prijavu pošaljite na
                 izbori.vienna@mfa.gov.rs.</p>
            </body></html>
            """
        )

        self.assertEqual(payload["schemaVersion"], 2)
        candidate = payload["candidates"][0]
        self.assertFalse(candidate["selectedForPromotion"])
        self.assertEqual(candidate["evidenceSnapshot"]["capturedAt"], candidate["observedAt"])
        self.assertEqual(
            candidate["evidenceSnapshot"]["content"],
            {
                "sourceUrl": candidate["sourceUrl"],
                "sourceHost": candidate["sourceHost"],
                "title": candidate["title"],
                "electionContext": candidate["electionContext"],
                "sourceQuote": candidate["sourceQuote"],
                "email": candidate["email"],
            },
        )
        self.assertEqual(
            candidate["evidenceSnapshot"]["sha256"],
            PROMOTION.validate_evidence_snapshot(
                candidate["evidenceSnapshot"], "candidate evidence"
            )["sha256"],
        )

    def test_review_refuses_legacy_or_tampered_candidate_evidence(self) -> None:
        candidate = self._candidate()
        candidate["evidenceSnapshot"]["sha256"] = "0" * 64
        evidence, error = REVIEW.public_evidence(candidate)

        self.assertIsNone(evidence)
        self.assertEqual(error, "invalid_candidate_evidence")

        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "legacy-candidates.json"
            output_path = Path(directory) / "reviews.json"
            self._write_json(input_path, {"schemaVersion": 1, "candidates": []})
            with (
                mock.patch.dict(
                    REVIEW.os.environ,
                    {
                        "ELECTION_AI_BASE_URL": "https://review.example.test",
                        "ELECTION_AI_API_KEY": "local-test-key",
                        "ELECTION_AI_MODEL": "local-test-model",
                    },
                    clear=True,
                ),
                mock.patch.object(
                    REVIEW.sys,
                    "argv",
                    [str(REVIEW_SCRIPT), "--input", str(input_path), "--output", str(output_path)],
                ),
                mock.patch.object(REVIEW, "request_review") as request_review,
            ):
                status = REVIEW.main()

            self.assertEqual(status, 2)
            request_review.assert_not_called()
            self.assertFalse(output_path.exists())

    def test_promotion_fails_closed_when_selection_is_ambiguous(self) -> None:
        first = self._candidate(candidate_id="vienna-first", selected=True)
        second = self._candidate(
            candidate_id="vienna-second",
            selected=True,
            source_url="https://vienna.mfa.gov.rs/konzularne-usluge/izbori-duplicate",
        )
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), [first, second], [])
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2)
            self.assertEqual(self._read_json(paths["overrides"]), self._empty_overrides())

    def test_promotion_fails_closed_for_tampered_evidence_or_expired_approval(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            tampered = self._candidate(selected=True)
            tampered["evidenceSnapshot"]["sha256"] = "0" * 64
            paths = self._write_promotion_fixture(Path(directory), [tampered], [])
            result = self._run_promotion(paths)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(self._read_json(paths["overrides"]), self._empty_overrides())

        with tempfile.TemporaryDirectory() as directory:
            candidate = self._candidate(selected=True)
            expired = self._approval(candidate, expires_at="2026-09-01T10:00:00Z")
            paths = self._write_promotion_fixture(Path(directory), [candidate], [expired])
            result = self._run_promotion(paths)
            self.assertEqual(result.returncode, 2)
            self.assertIn("Selected candidate", result.stderr)
            self.assertIn("approval has expired", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), self._empty_overrides())

    def test_unselected_evidence_never_creates_current_authority(self) -> None:
        candidate = self._candidate(selected=False)
        approval = self._approval(candidate)
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), [candidate], [approval])
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0)
            self.assertEqual(self._read_json(paths["overrides"]), self._empty_overrides())

    def test_selected_human_approval_promotes_idempotently_without_writing_website(self) -> None:
        candidate = self._candidate(selected=True)
        approval = self._approval(candidate)
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(
                Path(directory), [candidate], [approval], canonical_website=None
            )
            first = self._run_promotion(paths)
            self.assertEqual(first.returncode, 0, first.stderr)
            promoted = self._read_json(paths["overrides"])
            patch = promoted["missionOverrides"]["embassy-vienna"]
            authority = patch["electionAuthority"]
            self.assertEqual(authority["candidateId"], candidate["candidateId"])
            self.assertEqual(authority["countryCode"], candidate["countryCode"])
            self.assertEqual(authority["stationId"], candidate["stationId"])
            self.assertEqual(authority["email"], candidate["email"])
            self.assertNotIn("website", patch)

            second = self._run_promotion(paths)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), promoted)

    def test_expired_authority_is_replaced_by_selected_current_authority(self) -> None:
        candidate = self._candidate(selected=True)
        approval = self._approval(candidate)
        old_candidate = self._candidate(candidate_id="expired-authority", selected=False)
        old_approval = self._approval(old_candidate, expires_at="2026-09-01T10:00:00Z")
        old_authority = PROMOTION.election_authority(
            old_candidate,
            [
                {
                    key: old_approval[key]
                    for key in (
                        "reviewerId",
                        "reviewerType",
                        "decision",
                        "approvedAt",
                        "expiresAt",
                        "evidenceSha256",
                    )
                }
            ],
        )
        old_authority["electionId"] = "parliamentary-2025"
        old_authority["electionYear"] = "2025"
        overrides = {
            "_schemaVersion": 2,
            "missionOverrides": {
                "embassy-vienna": {"electionAuthority": old_authority}
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(
                Path(directory), [candidate], [approval], overrides=overrides
            )
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            authority = self._read_json(paths["overrides"])["missionOverrides"][
                "embassy-vienna"
            ]["electionAuthority"]
            self.assertEqual(authority["candidateId"], candidate["candidateId"])
            self.assertEqual(authority["electionId"], candidate["electionId"])

    def test_expired_unselected_approval_does_not_block_selected_promotion(self) -> None:
        selected = self._candidate(candidate_id="current-authority", selected=True)
        historical = self._candidate(candidate_id="historical-authority", selected=False)
        approvals = [
            self._approval(selected),
            self._approval(historical, expires_at="2026-09-01T10:00:00Z"),
        ]
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), [selected, historical], approvals)
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            authority = self._read_json(paths["overrides"])["missionOverrides"][
                "embassy-vienna"
            ]["electionAuthority"]
            self.assertEqual(authority["candidateId"], selected["candidateId"])

    def test_checked_in_legacy_records_are_explicitly_inactive(self) -> None:
        candidates = self._read_json(REPOSITORY_ROOT / "data" / "election_candidates.json")
        overrides = self._read_json(REPOSITORY_ROOT / "data" / "overrides.json")

        self.assertEqual(candidates["schemaVersion"], 2)
        self.assertEqual(candidates["candidates"], [])
        self.assertEqual(candidates["legacyCandidateArchive"]["status"], "inactive")
        legacy_promotions = [
            patch["_legacyElectionContact"]
            for patch in overrides["missionOverrides"].values()
            if isinstance(patch, dict) and "_legacyElectionContact" in patch
        ]
        self.assertEqual(len(legacy_promotions), 31)
        self.assertTrue(all(record["status"] == "inactive" for record in legacy_promotions))
        self.assertTrue(
            all(
                patch.get("electionAuthority") is None
                for patch in overrides["missionOverrides"].values()
                if isinstance(patch, dict)
            )
        )

    def test_builder_projects_evidence_bound_authority_and_valid_fallback_mailbox(self) -> None:
        authority = self._builder_authority()
        result, canonical = self._run_dataset_builder(authority)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(canonical)
        station = canonical["countries"][0]["stations"][0]
        self.assertEqual(station["missionEmail"], "general@mission.example.test")
        self.assertNotIn("email", station)
        self.assertEqual(
            station["electionAuthority"],
            {
                "candidateId": authority["candidateId"],
                "electionId": authority["electionId"],
                "electionYear": authority["electionYear"],
                "email": authority["email"],
                "sourceUrl": authority["evidenceSnapshot"]["content"]["sourceUrl"],
                "expiresAt": authority["approvals"][0]["expiresAt"],
                "evidenceSha256": authority["evidenceSnapshot"]["sha256"],
            },
        )

    def test_builder_rejects_mismatched_authority_evidence(self) -> None:
        authority = self._builder_authority()
        authority["email"] = "different@mission.example.test"

        result, canonical = self._run_dataset_builder(authority)

        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(canonical)
        self.assertIn(
            "email must match evidenceSnapshot.content.email",
            result.stderr,
        )

    def test_builder_rejects_authority_bound_to_another_station_or_country(self) -> None:
        authority = self._builder_authority()
        authority["stationId"] = "other-station"
        result, canonical = self._run_dataset_builder(authority)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(canonical)
        self.assertIn("bound to station other-station", result.stderr)

        authority = self._builder_authority()
        authority["countryCode"] = "KE"
        result, canonical = self._run_dataset_builder(authority)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(canonical)
        self.assertIn("bound to country KE", result.stderr)

    def test_builder_uses_shared_strict_email_validation_for_authority(self) -> None:
        authority = self._builder_authority()
        malformed_email = "izbori..addis@mission.example.test"
        authority["email"] = malformed_email
        snapshot = authority["evidenceSnapshot"]
        snapshot["content"]["email"] = malformed_email
        snapshot["sha256"] = evidence_snapshot_hash(
            {"capturedAt": snapshot["capturedAt"], "content": snapshot["content"]}
        )
        authority["approvals"][0]["evidenceSha256"] = snapshot["sha256"]

        result, canonical = self._run_dataset_builder(authority)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(canonical)
        self.assertIn("invalid email", result.stderr)

    def test_builder_treats_expired_valid_authority_as_inactive(self) -> None:
        authority = self._builder_authority(expires_at="2026-09-02T10:00:00Z")
        result, canonical = self._run_dataset_builder(authority)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(canonical)
        self.assertIsNone(canonical["countries"][0]["stations"][0]["electionAuthority"])

    def test_builder_omits_station_without_a_valid_general_mailbox(self) -> None:
        result, canonical = self._run_dataset_builder(
            listed_emails=["not-an-email", "still-not-an-email"]
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(canonical)
        self.assertEqual(canonical["countries"][0]["stations"], [])

    def _run_discovery_fixture(self, notice_html: str) -> dict[str, object]:
        country_url = "https://www.mfa.gov.rs/diplomatsko-konzularna-predstavnistva/austrija"
        notice_url = "https://vienna.mfa.gov.rs/konzularne-usluge/izbori"
        station = DISCOVERY.Station("AT", "embassy-vienna", "vienna.mfa.gov.rs")
        notice_task = DISCOVERY.PageTask(notice_url, "AT", (station,), 0)
        responses = iter(
            (
                lambda urls: [
                    (url, DISCOVERY.Response(url, "text/html", b"<html></html>"))
                    for url, _ in urls
                ],
                lambda urls: [
                    (country_url, DISCOVERY.Response(country_url, "text/html", b"<h1>Austria</h1>"))
                ],
                lambda urls: [
                    (notice_url, DISCOVERY.Response(notice_url, "text/html", notice_html.encode("utf-8")))
                ],
            )
        )

        def fetch_many(urls, *_args):
            return next(responses)(list(urls))

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidates.json"
            with (
                mock.patch.object(
                    DISCOVERY,
                    "load_stations",
                    return_value=({DISCOVERY.normalized_name("Austria"): "AT"}, {"AT": (station,)}),
                ),
                mock.patch.object(DISCOVERY, "country_links", return_value={country_url: {"AT"}}),
                mock.patch.object(DISCOVERY, "linked_mission_tasks", return_value=[notice_task]),
                mock.patch.object(DISCOVERY, "mission_links", return_value=[]),
                mock.patch.object(DISCOVERY, "fetch_many", side_effect=fetch_many),
                mock.patch.object(
                    DISCOVERY.sys,
                    "argv",
                    [
                        str(DISCOVERY_SCRIPT),
                        "--election-id",
                        "2026-parliamentary",
                        "--output",
                        str(output),
                        "--max-pages",
                        "5",
                    ],
                ),
            ):
                self.assertEqual(DISCOVERY.main(), 0)
            return self._read_json(output)

    @staticmethod
    def _candidate(
        candidate_id: str = "vienna-2026-election-contact",
        selected: bool = False,
        source_url: str = "https://vienna.mfa.gov.rs/konzularne-usluge/izbori",
    ) -> dict[str, object]:
        source_host = "vienna.mfa.gov.rs"
        email = "izbori.vienna@mfa.gov.rs"
        evidence_content = {
            "sourceUrl": source_url,
            "sourceHost": source_host,
            "title": "Obaveštenje o parlamentarnim izborima 2026.",
            "electionContext": "Obaveštenje o parlamentarnim izborima 2026.",
            "sourceQuote": "Za glasanje u inostranstvu na izborima 2026, prijavu pošaljite na izbori.vienna@mfa.gov.rs.",
            "email": email,
        }
        snapshot = {"capturedAt": "2026-09-01T09:00:00Z", "content": evidence_content}
        snapshot["sha256"] = evidence_snapshot_hash(snapshot)
        return {
            "candidateId": candidate_id,
            "electionId": "parliamentary-2026",
            "electionYear": "2026",
            "countryCode": "AT",
            "stationId": "embassy-vienna",
            "email": email,
            "title": evidence_content["title"],
            "electionContext": evidence_content["electionContext"],
            "sourceQuote": evidence_content["sourceQuote"],
            "sourceUrl": source_url,
            "sourceHost": source_host,
            "observedAt": snapshot["capturedAt"],
            "selectedForPromotion": selected,
            "evidenceSnapshot": snapshot,
        }

    @staticmethod
    def _approval(candidate: dict[str, object], expires_at: str = "2099-09-01T10:00:00Z") -> dict[str, str]:
        return {
            "candidateId": str(candidate["candidateId"]),
            "electionId": str(candidate["electionId"]),
            "reviewerId": "ana",
            "reviewerType": "human",
            "decision": "approve",
            "approvedAt": "2026-09-01T09:30:00Z",
            "expiresAt": expires_at,
            "evidenceSha256": str(candidate["evidenceSnapshot"]["sha256"]),
        }

    def _write_promotion_fixture(
        self,
        directory: Path,
        candidates: list[dict[str, object]],
        approvals: list[dict[str, str]],
        overrides: dict[str, object] | None = None,
        canonical_website: str | None = "https://vienna.mfa.gov.rs",
    ) -> dict[str, Path]:
        paths = {
            "candidates": directory / "candidates.json",
            "approvals": directory / "approvals.json",
            "reviewers": directory / "reviewers.json",
            "canonical": directory / "canonical.json",
            "overrides": directory / "overrides.json",
        }
        self._write_json(
            paths["candidates"],
            {
                "schemaVersion": 2,
                "electionId": "parliamentary-2026",
                "electionYear": "2026",
                "generatedAt": "2026-09-01T09:00:00Z",
                "candidates": candidates,
            },
        )
        self._write_json(paths["approvals"], {"schemaVersion": 2, "approvals": approvals})
        self._write_json(
            paths["reviewers"],
            {"schemaVersion": 1, "reviewerIds": ["ana"], "requiredHumanApprovals": 1},
        )
        station: dict[str, object] = {"id": "embassy-vienna"}
        if canonical_website is not None:
            station["website"] = canonical_website
        self._write_json(
            paths["canonical"],
            {
                "countries": [
                    {
                        "countryCode": "AT",
                        "stations": [station],
                    }
                ]
            },
        )
        self._write_json(paths["overrides"], overrides or self._empty_overrides())
        return paths

    @staticmethod
    def _empty_overrides() -> dict[str, object]:
        return {"_schemaVersion": 2, "missionOverrides": {}}

    @staticmethod
    def _builder_authority(
        expires_at: str = "2099-09-01T10:00:00Z",
    ) -> dict[str, object]:
        email = "izbori.addis@mission.example.test"
        evidence_content = {
            "sourceUrl": "https://addisababa.mfa.gov.rs/obavestenja/izbori",
            "sourceHost": "addisababa.mfa.gov.rs",
            "title": "Election notice",
            "electionContext": "Election notice",
            "sourceQuote": "Submit the request to izbori.addis@mission.example.test.",
            "email": email,
        }
        snapshot: dict[str, object] = {
            "capturedAt": "2026-09-01T09:00:00Z",
            "content": evidence_content,
        }
        snapshot["sha256"] = evidence_snapshot_hash(snapshot)
        return {
            "candidateId": "addis-2026-election-contact",
            "electionId": "parliamentary-2026",
            "electionYear": "2026",
            "countryCode": "ET",
            "stationId": "st-et-emb-adisabeba",
            "email": email,
            "evidenceSnapshot": snapshot,
            "approvals": [
                {
                    "reviewerId": "ana",
                    "reviewerType": "human",
                    "decision": "approve",
                    "approvedAt": "2026-09-01T09:30:00Z",
                    "expiresAt": expires_at,
                    "evidenceSha256": snapshot["sha256"],
                }
            ],
        }

    def _run_dataset_builder(
        self,
        authority: dict[str, object] | None = None,
        listed_emails: list[str] | None = None,
    ) -> tuple[subprocess.CompletedProcess[str], dict[str, object] | None]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_directory = root / "data"
            data_directory.mkdir()
            listed_emails = listed_emails or [
                "general@mission.example.testconcatenated",
                "general@mission.example.test",
            ]
            self._write_json(
                data_directory / "mfa_representations.json",
                [
                    {
                        "country": "Етиопија",
                        "representations": [
                            {
                                "section": "Амбасада",
                                "city": "Адис Абеба",
                                "data": {"Адреса:": "Test address"},
                                "emails": listed_emails,
                                "primary_consular_email": listed_emails[0],
                                "website": "https://addisababa.mfa.gov.rs",
                            }
                        ],
                    }
                ],
            )
            self._write_json(
                data_directory / "overrides.json",
                {
                    "_schemaVersion": 2,
                    "missionOverrides": (
                        {
                            "st-et-emb-adisabeba": {
                                "electionAuthority": authority
                            }
                        }
                        if authority is not None
                        else {}
                    ),
                    "countryOverrides": {},
                },
            )
            result = subprocess.run(
                [sys.executable, str(BUILD_SCRIPT)],
                cwd=root,
                check=False,
                capture_output=True,
                text=True,
            )
            canonical_path = data_directory / "missions_canonical.json"
            canonical = (
                self._read_json(canonical_path)
                if result.returncode == 0 and canonical_path.exists()
                else None
            )
            return result, canonical

    @staticmethod
    def _run_promotion(paths: dict[str, Path]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(PROMOTION_SCRIPT),
                "--candidates",
                str(paths["candidates"]),
                "--approvals",
                str(paths["approvals"]),
                "--reviewers",
                str(paths["reviewers"]),
                "--canonical",
                str(paths["canonical"]),
                "--overrides",
                str(paths["overrides"]),
            ],
            check=False,
            capture_output=True,
            text=True,
        )

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        path.write_text(json.dumps(payload), encoding="utf-8")

    @staticmethod
    def _read_json(path: Path) -> dict[str, object]:
        return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
