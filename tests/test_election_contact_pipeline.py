"""Local fixture tests for the election-contact discovery and promotion boundary."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DISCOVERY_SCRIPT = REPOSITORY_ROOT / "scripts" / "discover_election_contacts.py"
REVIEW_SCRIPT = REPOSITORY_ROOT / "scripts" / "review_election_candidates.py"
PROMOTION_SCRIPT = REPOSITORY_ROOT / "scripts" / "promote_election_contacts.py"
AI_ENVIRONMENT = (
    "ELECTION_AI_BASE_URL",
    "ELECTION_AI_API_KEY",
    "ELECTION_AI_MODEL",
)


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
    def test_generic_or_non_election_html_yields_no_candidate(self) -> None:
        title, _, evidence = DISCOVERY.extract_html_evidence(
            """
            <html><head><title>Kontakt ambasade</title></head><body>
              <main><p>Za opšta pitanja pišite na info@vienna.mfa.gov.rs.</p></main>
              <p>Radno vreme konzularnog odeljenja je od 9 do 15 časova.</p>
            </body></html>
            """.encode("utf-8")
        )

        self.assertEqual(title, "Kontakt ambasade")
        self.assertEqual(evidence, [])

    def test_discovery_keeps_only_visible_election_email_evidence(self) -> None:
        title, _, evidence = DISCOVERY.extract_html_evidence(
            """
            <html><head><title>Kontakt</title></head><body>
              <h1>Obaveštenje o parlamentarnim izborima</h1>
              <p>Za opšta pitanja pišite na info@vienna.mfa.gov.rs.</p>
              <p>Za glasanje u inostranstvu, prijavu za izbore pošaljite na
                 izbori.vienna@mfa.gov.rs.</p>
              <p>Izbori su važni.
                 <form><input value="skriveni.izbori@mfa.gov.rs"></form>
              </p>
              <script>const email = "skripta.izbori@mfa.gov.rs";</script>
            """.encode("utf-8")
        )

        self.assertEqual(title, "Obaveštenje o parlamentarnim izborima")
        self.assertEqual(
            [(item.email, item.quote) for item in evidence],
            [
                (
                    "izbori.vienna@mfa.gov.rs",
                    "Za glasanje u inostranstvu, prijavu za izbore pošaljite na izbori.vienna@mfa.gov.rs.",
                )
            ],
        )

    def test_discovery_excludes_hidden_dom_election_contacts(self) -> None:
        _, _, evidence = DISCOVERY.extract_html_evidence(
            """
            <html><body><main>
              <p hidden>Za glasanje u inostranstvu pišite na hidden@mfa.gov.rs.</p>
              <p aria-hidden="true">Za izbore pišite na aria-hidden@mfa.gov.rs.</p>
              <p style="display: none">Za prijavu za izbore pišite na css-hidden@mfa.gov.rs.</p>
              <p style="visibility: hidden">Za glasanje u inostranstvu pišite na invisible@mfa.gov.rs.</p>
            </main></body></html>
            """.encode("utf-8")
        )

        self.assertEqual(evidence, [])

    def test_discovery_rejects_visible_mailbox_linked_to_a_different_mailto_target(self) -> None:
        _, _, evidence = DISCOVERY.extract_html_evidence(
            """
            <html><body><main>
              <p>Za glasanje u inostranstvu pišite na
                <a href="mailto:izbori.bukurest@mfa.gov.rs">izbori.temisvar@mfa.gov.rs</a>.
              </p>
            </main></body></html>
            """.encode("utf-8")
        )

        self.assertEqual(evidence, [])

    def test_discovery_binds_sibling_notice_context_without_crossing_notice_groups(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Kontakt</title></head><body><main>
                  <div class="notice">
                    <h2>Obaveštenje o parlamentarnim izborima 2026. godine</h2>
                    <p>Za prijavu pišite na
                      <a href="mailto:izbori.vienna@mfa.gov.rs">izbori.vienna@mfa.gov.rs</a>.</p>
                  </div>
                  <div class="notice">
                    <h2>Arhivsko obaveštenje o izborima 2022. godine</h2>
                    <p>Za prijavu pišite na
                      <a href="mailto:embsrbag@yahoo.com">embsrbag@yahoo.com</a>.</p>
                  </div>
                </main></body></html>
            """,
        )

        candidates = payload["candidates"]
        self.assertEqual([candidate["email"] for candidate in candidates], ["izbori.vienna@mfa.gov.rs"])
        self.assertIn("2026", candidates[0]["electionContext"])


    def test_discovery_binds_nested_div_notice_card_to_its_current_year_heading(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Kontakt</title></head><body><main>
                  <div class="notice-card">
                    <div class="notice-heading">
                      <h2>Obaveštenje o parlamentarnim izborima 2026. godine</h2>
                    </div>
                    <div class="notice-body">
                      <p>Za prijavu pišite na
                        <a href="mailto:izbori.vienna@mfa.gov.rs">izbori.vienna@mfa.gov.rs</a>.</p>
                    </div>
                  </div>
                  <div class="notice-card">
                    <div class="notice-heading">
                      <h2>Arhivsko obaveštenje o izborima 2022. godine</h2>
                    </div>
                    <div class="notice-body">
                      <p>Za prijavu pišite na
                        <a href="mailto:embsrbag@yahoo.com">embsrbag@yahoo.com</a>.</p>
                    </div>
                  </div>
                </main></body></html>
            """,
        )

        candidates = payload["candidates"]
        self.assertEqual([candidate["email"] for candidate in candidates], ["izbori.vienna@mfa.gov.rs"])
        self.assertIn("2026", candidates[0]["electionContext"])
        self.assertNotIn("2022", candidates[0]["electionContext"])

    def test_discovery_carries_page_year_context_when_quote_and_title_omit_it(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Glasanje iz Čikaga</title></head><body>
                  <h1>Glasanje iz Čikaga</h1>
                  <main>
                    <p>Obaveštenje o parlamentarnim izborima 2026. godine.</p>
                    <p>Ovo obaveštenje sadrži dodatne praktične informacije za birače.</p>
                    <p>Birači koji žive u inostranstvu mogu pripremiti dokumenta blagovremeno.</p>
                    <p>Dodatne informacije o radnom vremenu misije objavljene su na istoj
                    stranici.</p>
                    <p>Pristup prostorijama misije je opisan radi lakšeg planiranja.</p>
                    <p>Za glasanje u inostranstvu, prijavu za izbore pošaljite na
                    izbori.vienna@mfa.gov.rs.</p>
                  </main>
                </body></html>
            """,
        )

        candidate = payload["candidates"][0]
        self.assertNotIn("2026", candidate["title"])
        self.assertNotIn("2026", candidate["sourceQuote"])
        self.assertIn("2026", candidate["electionContext"])
        validated = PROMOTION.validate_candidates(
            payload,
            {
                "embassy-vienna": (
                    "AT",
                    {"website": "https://vienna.mfa.gov.rs"},
                )
            },
        )
        self.assertIn(candidate["candidateId"], validated)

    def test_discovery_rejects_generic_contact_from_current_year_main(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Izbori 2026</title></head><body><main>
                  <p>Obaveštenje o parlamentarnim izborima 2026. godine.</p>
                  <p>Informacije za birače nalaze se na sajtu misije.</p>
                  <p>Radno vreme misije je objavljeno na sajtu.</p>
                  <p>Pristup prostorijama je moguć uz prethodnu najavu.</p>
                  <p>Za opšta pitanja pišite na info@vienna.mfa.gov.rs.</p>
                </main></body></html>
            """,
        )

        self.assertEqual(payload["candidates"], [])

    def test_discovery_rejects_ungrouped_historic_mailbox_from_mixed_page(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Izbori 2026</title></head><body><main>
                  <p>Obaveštenje o parlamentarnim izborima 2026. godine.</p>
                  <p>Arhivsko obaveštenje o izborima 2022. godine.</p>
                  <p>Arhivska napomena za birače.</p>
                  <p>Informacije o radnom vremenu misije.</p>
                  <p>Informacije o pristupu prostorijama.</p>
                  <p>Za glasanje u inostranstvu prijavu pošaljite na
                     embsrbag@yahoo.com.</p>
                </main></body></html>
            """,
        )

        self.assertEqual(payload["candidates"], [])

    def test_discovery_excludes_historic_notice_from_current_election_run(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Izbori 2022</title></head><body>
                  <h1>Obaveštenje o izborima 3. aprila 2022. godine</h1>
                  <p>Za glasanje u inostranstvu, prijavu za izbore pošaljite na
                     embsrbag@yahoo.com.</p>
                </body></html>
            """,
        )

        self.assertEqual(payload["electionId"], "2026-parliamentary")
        self.assertEqual(payload["candidates"], [])

    def test_discovery_rejects_historic_mailbox_on_mixed_current_page(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Izbori 2026</title></head><body><main>
                  <article>
                    <h2>Obaveštenje o parlamentarnim izborima 2026. godine</h2>
                    <p>Za glasanje u inostranstvu prijavu pošaljite na
                       izbori.vienna@mfa.gov.rs.</p>
                  </article>
                  <article>
                    <h2>Arhivsko obaveštenje o izborima 2022. godine</h2>
                    <p>Za glasanje u inostranstvu prijavu pošaljite na
                       embsrbag@yahoo.com.</p>
                  </article>
                </main></body></html>
            """,
        )

        candidates = payload["candidates"]
        self.assertEqual([candidate["email"] for candidate in candidates], ["izbori.vienna@mfa.gov.rs"])
        self.assertIn("2026", candidates[0]["electionContext"])

    def test_discovery_records_current_year_in_election_candidate_evidence(self) -> None:
        payload = self._run_discovery_fixture(
            election_id="2026-parliamentary",
            notice_html="""
                <html><head><title>Izbori 2026</title></head><body>
                  <h1>Obaveštenje o parlamentarnim izborima 2026. godine</h1>
                  <p>Za glasanje u inostranstvu na parlamentarnim izborima 2026,
                     prijavu pošaljite na izbori.vienna@mfa.gov.rs.</p>
                </body></html>
            """,
        )

        candidates = payload["candidates"]
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate["electionYear"], "2026")
        self.assertEqual(candidate["electionId"], "2026-parliamentary")
        self.assertIn("2026", candidate["title"])
        self.assertIn("2026", candidate["electionContext"])
        self.assertIn("2026", candidate["sourceQuote"])


    def test_discovery_attributes_shared_roma_notice_mailboxes_to_their_stations(self) -> None:
        country_url = "https://www.mfa.gov.rs/diplomatsko-konzularna-predstavnistva/italija"
        notice_url = "https://roma.mfa.gov.rs/konzularne-usluge/izbori"
        italy = DISCOVERY.Station("IT", "st-it-emb-main", "roma.mfa.gov.rs", "izbori.rim@mfa.rs")
        malta = DISCOVERY.Station("MT", "st-mt-emb-main", "roma.mfa.gov.rs", "srb.office.valletta@mfa.rs")
        notice_task = DISCOVERY.PageTask(notice_url, "IT", (italy,), 0)
        responses = iter(
            (
                lambda urls: [
                    (url, DISCOVERY.Response(url, "text/html", b"<html></html>"))
                    for url, _ in urls
                ],
                lambda urls: [
                    (country_url, DISCOVERY.Response(country_url, "text/html", b"<h1>Italy</h1>"))
                ],
                lambda urls: [
                    (
                        notice_url,
                        DISCOVERY.Response(
                            notice_url,
                            "text/html",
                            b"""
                            <h1>Izbori 2026</h1>
                            <p>Za glasanje u Italiji 2026 prijavu posaljite na izbori.rim@mfa.rs.</p>
                            <p>Za glasanje na Malti 2026 prijavu posaljite na srb.office.valletta@mfa.rs.</p>
                            """,
                        ),
                    )
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
                    return_value=(
                        {
                            DISCOVERY.normalized_name("Italy"): "IT",
                            DISCOVERY.normalized_name("Malta"): "MT",
                        },
                        {"IT": (italy,), "MT": (malta,)},
                    ),
                ),
                mock.patch.object(DISCOVERY, "country_links", return_value={country_url: {"IT"}}),
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

            candidates = self._read_json(output)["candidates"]

        self.assertEqual(
            {(candidate["email"], candidate["countryCode"], candidate["stationId"]) for candidate in candidates},
            {
                ("izbori.rim@mfa.rs", "IT", "st-it-emb-main"),
                ("srb.office.valletta@mfa.rs", "MT", "st-mt-emb-main"),
            },
        )

    def test_discovery_refuses_overrides_as_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "overrides.json"
            stderr = io.StringIO()
            with (
                mock.patch.object(DISCOVERY, "OVERRIDES_PATH", output.resolve()),
                mock.patch.object(
                    DISCOVERY.sys,
                    "argv",
                    [str(DISCOVERY_SCRIPT), "--election-id", "parliamentary-2026", "--output", str(output)],
                ),
                contextlib.redirect_stderr(stderr),
                self.assertRaisesRegex(SystemExit, "2"),
            ):
                DISCOVERY.parse_args()

        self.assertIn("--output must not resolve to data/overrides.json", stderr.getvalue())
        self.assertFalse(output.exists())

    def test_missing_ai_configuration_fails_before_any_request(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_directory = Path(directory)
            missing_input = temporary_directory / "not-read-before-configuration.json"
            output = temporary_directory / "reviews.json"
            stderr = io.StringIO()

            with (
                mock.patch.dict(REVIEW.os.environ, {}, clear=True),
                mock.patch.object(
                    REVIEW.sys,
                    "argv",
                    [
                        str(REVIEW_SCRIPT),
                        "--input",
                        str(missing_input),
                        "--output",
                        str(output),
                    ],
                ),
                mock.patch.object(REVIEW, "request_review") as request_review,
                contextlib.redirect_stderr(stderr),
            ):
                status = REVIEW.main()

        self.assertEqual(status, 2)
        self.assertIn("Missing required environment variables", stderr.getvalue())
        request_review.assert_not_called()
        self.assertFalse(output.exists())

    def test_insecure_or_credentialed_ai_endpoint_fails_before_any_request(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_directory = Path(directory)
            missing_input = temporary_directory / "not-read-before-endpoint-validation.json"
            for base_url in ("http://review.example.test", "https://token@review.example.test"):
                with self.subTest(base_url=base_url):
                    output = temporary_directory / f"{base_url.split(':', 1)[0]}-reviews.json"
                    stderr = io.StringIO()
                    with (
                        mock.patch.dict(
                            REVIEW.os.environ,
                            {
                                "ELECTION_AI_BASE_URL": base_url,
                                "ELECTION_AI_API_KEY": "local-test-key",
                                "ELECTION_AI_MODEL": "local-test-model",
                            },
                            clear=True,
                        ),
                        mock.patch.object(
                            REVIEW.sys,
                            "argv",
                            [
                                str(REVIEW_SCRIPT),
                                "--input",
                                str(missing_input),
                                "--output",
                                str(output),
                            ],
                        ),
                        mock.patch.object(REVIEW, "request_review") as request_review,
                        contextlib.redirect_stderr(stderr),
                    ):
                        status = REVIEW.main()

                    self.assertEqual(status, 2)
                    self.assertIn("ELECTION_AI_BASE_URL", stderr.getvalue())
                    request_review.assert_not_called()
                    self.assertFalse(output.exists())

    def test_promotion_ignores_valid_historical_approvals_for_absent_candidates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            approvals = self._read_json(paths["approvals"])
            approvals["approvals"].append(
                {
                    "candidateId": "vienna-2022-election-contact",
                    "electionId": "parliamentary-2022",
                    "reviewerId": "ana",
                    "reviewerType": "human",
                    "decision": "approve",
                    "approvedAt": "2022-03-01T10:00:00Z",
                }
            )
            self._write_json(paths["approvals"], approvals)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "Promoted 1 election-specific contact(s).")
            provenance = self._read_json(paths["overrides"])["missionOverrides"]["embassy-vienna"][
                "_electionContactProvenance"
            ]
            self.assertEqual(
                provenance["humanApprovals"],
                [
                    {"reviewerId": "ana", "decision": "approve", "approvedAt": "2026-09-01T10:00:00Z"},
                    {"reviewerId": "boris", "decision": "approve", "approvedAt": "2026-09-01T11:00:00Z"},
                ],
            )

    def test_promotion_rejects_mismatched_election_id_for_present_candidate_approval(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            approvals = self._read_json(paths["approvals"])
            approvals["approvals"][0]["electionId"] = "parliamentary-2022"
            self._write_json(paths["approvals"], approvals)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("electionId does not match candidate", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_fails_closed_for_duplicate_human_approver(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "ana"))
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "Promoted 0 election-specific contact(s).")
            self.assertEqual(
                self._read_json(paths["overrides"]),
                {"missionOverrides": {}},
            )

    def test_promotion_allows_an_election_designated_generic_mailbox(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            candidates = self._read_json(paths["candidates"])
            candidates["candidates"][0]["email"] = "info@vienna.mfa.gov.rs"
            candidates["candidates"][0]["sourceQuote"] = (
                "Za glasanje u inostranstvu, prijavu za izbore pošaljite na info@vienna.mfa.gov.rs."
            )
            self._write_json(paths["candidates"], candidates)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "Promoted 1 election-specific contact(s).")

    def test_promotion_rejects_url_parameterized_mailbox(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            candidates = self._read_json(paths["candidates"])
            candidates["candidates"][0]["email"] = "izbori.vienna@mfa.gov.rs?bcc=attacker"
            candidates["candidates"][0]["sourceQuote"] = (
                "Za glasanje u inostranstvu, prijavu za izbore pošaljite na "
                "izbori.vienna@mfa.gov.rs?bcc=attacker."
            )
            self._write_json(paths["candidates"], candidates)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_rejects_source_host_mismatch(self) -> None:
        cases = (
            (
                "sourceHost differs from sourceUrl",
                "https://vienna.mfa.gov.rs/konzularne-usluge/izbori",
                "belgrade.mfa.gov.rs",
                "sourceHost does not match sourceUrl",
            ),
            (
                "source host is not the candidate station's mission",
                "https://belgrade.mfa.gov.rs/konzularne-usluge/izbori",
                "belgrade.mfa.gov.rs",
                "sourceHost does not match the station's canonical mission website",
            ),
        )
        for name, source_url, source_host, error in cases:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
                candidates = self._read_json(paths["candidates"])
                candidates["candidates"][0]["sourceUrl"] = source_url
                candidates["candidates"][0]["sourceHost"] = source_host
                self._write_json(paths["candidates"], candidates)

                result = self._run_promotion(paths)

                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn(error, result.stderr)
                self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_requires_the_exact_visible_mailbox(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            candidates = self._read_json(paths["candidates"])
            candidates["candidates"][0]["sourceQuote"] = (
                "Obaveštenje o izborima 2026. opisuje podnošenje prijave."
            )
            self._write_json(paths["candidates"], candidates)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("does not visibly contain its exact email", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_rejects_an_invalid_supplied_ai_review(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            reviews = self._read_json(paths["reviews"])
            reviews["reviews"][0]["reviewStatus"] = "error"
            self._write_json(paths["reviews"], reviews)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("did not complete", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_rejects_human_outside_reviewed_allowlist(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "mallory"))

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("not in the reviewed allow-list", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_rejects_missing_or_mismatched_election_year(self) -> None:
        cases = (
            ("missing", lambda candidate: candidate.pop("electionYear"), "requires non-empty electionYear"),
            (
                "mismatched",
                lambda candidate: candidate.__setitem__("electionYear", "2022"),
                "electionYear does not match candidates electionId",
            ),
        )
        for name, mutate, error in cases:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
                candidates = self._read_json(paths["candidates"])
                mutate(candidates["candidates"][0])
                self._write_json(paths["candidates"], candidates)

                result = self._run_promotion(paths)

                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn(error, result.stderr)
                self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_rejects_candidate_without_target_year_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            candidates = self._read_json(paths["candidates"])
            candidate = candidates["candidates"][0]
            candidate["title"] = "Obaveštenje o parlamentarnim izborima"
            candidate["electionContext"] = "Glasanje u inostranstvu"
            candidate["sourceQuote"] = (
                "Za glasanje u inostranstvu, prijavu za izbore pošaljite na "
                "izbori.vienna@mfa.gov.rs."
            )
            self._write_json(paths["candidates"], candidates)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("does not visibly contain electionYear", result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), {"missionOverrides": {}})

    def test_promotion_records_provenance_after_authorized_human_approvals(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana", "boris"))
            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "Promoted 1 election-specific contact(s).")
            override = self._read_json(paths["overrides"])["missionOverrides"]["embassy-vienna"]
            provenance = override["_electionContactProvenance"]
            self.assertEqual(override["electionEmail"], "izbori.vienna@mfa.gov.rs")
            self.assertEqual(provenance["candidateId"], "vienna-2026-election-contact")
            self.assertEqual(provenance["electionId"], "parliamentary-2026")
            self.assertEqual(provenance["electionYear"], "2026")
            self.assertEqual(provenance["sourceHost"], "vienna.mfa.gov.rs")
            self.assertEqual(
                provenance["sourceQuote"],
                "Za glasanje u inostranstvu na izborima 2026, prijavu pošaljite na izbori.vienna@mfa.gov.rs.",
            )
            self.assertEqual(provenance["aiReviewDecision"], "accept")
            self.assertEqual(
                provenance["humanApprovals"],
                [
                    {"reviewerId": "ana", "decision": "approve", "approvedAt": "2026-09-01T10:00:00Z"},
                    {"reviewerId": "boris", "decision": "approve", "approvedAt": "2026-09-01T11:00:00Z"},
                ],
            )
            self.assertTrue(provenance["promotedAt"].endswith("Z"))

    def test_promotion_accepts_a_single_authorized_human_approval(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_promotion_fixture(Path(directory), reviewer_ids=("ana",))
            reviewers = self._read_json(paths["reviewers"])
            reviewers["reviewerIds"] = ["ana"]
            reviewers["requiredHumanApprovals"] = 1
            self._write_json(paths["reviewers"], reviewers)

            result = self._run_promotion(paths)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "Promoted 1 election-specific contact(s).")

    def _run_discovery_fixture(self, election_id: str, notice_html: str) -> dict[str, object]:
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
                        election_id,
                        "--output",
                        str(output),
                        "--max-pages",
                        "5",
                    ],
                ),
            ):
                self.assertEqual(DISCOVERY.main(), 0)
            return self._read_json(output)

    def _write_promotion_fixture(self, directory: Path, reviewer_ids: tuple[str, ...]) -> dict[str, Path]:
        candidate_id = "vienna-2026-election-contact"
        election_id = "parliamentary-2026"
        paths = {
            "candidates": directory / "candidates.json",
            "reviews": directory / "reviews.json",
            "approvals": directory / "approvals.json",
            "reviewers": directory / "reviewers.json",
            "canonical": directory / "canonical.json",
            "overrides": directory / "overrides.json",
        }
        self._write_json(
            paths["candidates"],
            {
                "electionId": election_id,
                "electionYear": "2026",
                "generatedAt": "2026-09-01T09:00:00Z",
                "candidates": [
                    {
                        "candidateId": candidate_id,
                        "electionId": election_id,
                        "countryCode": "AT",
                        "stationId": "embassy-vienna",
                        "email": "izbori.vienna@mfa.gov.rs",
                        "electionYear": "2026",
                        "title": "Obaveštenje o parlamentarnim izborima 2026.",
                        "electionContext": "Obaveštenje o parlamentarnim izborima 2026.",
                        "sourceQuote": "Za glasanje u inostranstvu na izborima 2026, prijavu pošaljite na izbori.vienna@mfa.gov.rs.",
                        "sourceUrl": "https://vienna.mfa.gov.rs/konzularne-usluge/izbori",
                        "sourceHost": "vienna.mfa.gov.rs",
                        "observedAt": "2026-09-01T09:00:00Z",
                    }
                ],
            },
        )
        self._write_json(
            paths["reviews"],
            {
                "reviews": [
                    {
                        "candidateId": candidate_id,
                        "electionId": election_id,
                        "decision": "accept",
                        "reviewStatus": "completed",
                    }
                ]
            },
        )
        self._write_json(
            paths["approvals"],
            {
                "approvals": [
                    {
                        "candidateId": candidate_id,
                        "electionId": election_id,
                        "reviewerId": reviewer_id,
                        "reviewerType": "human",
                        "decision": "approve",
                        "approvedAt": f"2026-09-01T{10 + index:02d}:00:00Z",
                    }
                    for index, reviewer_id in enumerate(reviewer_ids)
                ]
            },
        )
        self._write_json(
            paths["reviewers"],
            {
                "schemaVersion": 1,
                "reviewerIds": ["ana", "boris"],
                "requiredHumanApprovals": 2,
            },
        )
        self._write_json(
            paths["canonical"],
            {
                "countries": [
                    {
                        "countryCode": "AT",
                        "stations": [
                            {
                                "id": "embassy-vienna",
                                "email": "info@vienna.mfa.gov.rs",
                                "website": "https://vienna.mfa.gov.rs",
                            }
                        ],
                    }
                ]
            },
        )
        self._write_json(paths["overrides"], {"missionOverrides": {}})
        return paths

    def _run_promotion(self, paths: dict[str, Path]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(PROMOTION_SCRIPT),
                "--candidates",
                str(paths["candidates"]),
                "--reviews",
                str(paths["reviews"]),
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
    def _read_json(path: Path) -> object:
        return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
