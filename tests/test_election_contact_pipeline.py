"""Regression contracts for evidence extraction, source attribution, and promotion safety.

These fixtures keep unverified, hidden, stale, or misattributed contact details from
crossing the discovery-to-override boundary.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib.util
import json
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


def load_script_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


DISCOVERY = load_script_module("election_contact_discovery_for_tests", DISCOVERY_SCRIPT)
COMMON = load_script_module("election_notice_common_for_tests", REPOSITORY_ROOT / "scripts/election_contact_common.py")


class ElectionContactPipelineTests(unittest.TestCase):
    def test_long_notice_keeps_year_context_above_both_mailboxes(self) -> None:
        # Ljubljana's notice places its year well before the submission list.
        body = (
            '<html><body><main><h1>Izbori 2026 — prijavljivanje za glasanje</h1><article>'
            '<p>Za izbore 2026 zahtev se dostavlja ambasadi.</p>'
            + '<p>Uz potpisan zahtev priložite kopiju dokumenta.</p>' * 30
            + '<p>Popunjen zahtev može se dostaviti:</p>'
            '<p>putem elektronske pošte: consular@example.org i embassy@example.org</p>'
            '</article></main></body></html>'
        )
        payload = self._run_discovery_fixture("2026-parliamentary", body)
        self.assertEqual({item["email"] for item in payload["candidates"]}, {
            "consular@example.org", "embassy@example.org",
        })
        self.assertEqual(payload["notices"][0]["emailStatus"], "email-extracted")

    def test_notice_without_email_is_retained_as_public_evidence_not_a_recipient(self) -> None:
        payload = self._run_discovery_fixture("2026-parliamentary", '''
            <html><body><main><h1>Raspisivanje izbora</h1>
            <p>Za izbore 2026 birači mogu podneti zahtev za glasanje u inostranstvu.</p>
            <footer>Kontakt: footer@example.org</footer></main></body></html>
        ''')
        self.assertEqual(payload["candidates"], [])
        notice = payload["notices"][0]
        self.assertEqual(notice["emailStatus"], "no-email-extracted")
        self.assertEqual(notice["emails"], [])
        self.assertIn(notice["sourceId"], payload["sources"])
        canonical = {"countries": [{"countryCode": "AT", "stations": [{
            "id": "embassy-vienna", "website": "https://vienna.mfa.gov.rs", "isResident": True,
        }]}]}
        public = COMMON.public_election_notices(payload, canonical)["embassy-vienna"]
        self.assertEqual(public["url"], notice["sourceUrl"])
        self.assertNotIn("emails", public)
        self.assertNotIn("electionContactApproval", public)
        payload["sources"][notice["sourceId"]]["text"] += ' injected text'
        with self.assertRaises(COMMON.ValidationError):
            COMMON.public_election_notices(payload, canonical)

    def test_notice_detection_excludes_listing_competition_and_old_election(self) -> None:
        for body in (
            '<h1>Aktuelnosti</h1><p>Izbori 2026</p>',
            '<h1>Konkurs za dijasporu 2026</h1><p>Komisija bira projekte.</p>',
            '<h1>Izbori za predsednika Portugala 2026</h1><p>Rezultati izbora.</p>',
            '<h1>Izbori 2023</h1><p>Glasanje 2023</p><aside>Izbori 2026</aside>',
        ):
            with self.subTest(body=body):
                self.assertIsNone(DISCOVERY.extract_html_notice(
                    f'<html><body><main>{body}</main></body></html>'.encode(), '2026'
                ))

    def test_incidental_image_link_is_not_crawled_as_a_webpage(self) -> None:
        station = DISCOVERY.Station('TR', 'st-tr', 'ankara.mfa.gov.rs')
        task = DISCOVERY.PageTask('https://ankara.mfa.gov.rs/', 'TR', (station,), 0)
        links = DISCOVERY.mission_links(b'''
            <a href="/sites/tr-mfa/files/2026-03/mfa%20obavestenje%202.jpg">Obavestenje</a>
            <a href="/mediji/izbori-2026">Izbori 2026</a>
        ''', task, '2026')
        self.assertEqual([link.url for link in links], ['https://ankara.mfa.gov.rs/mediji/izbori-2026'])

    # Only an address visibly presented as an election-registration contact is evidence;
    # hidden markup and mismatched mailto links must not create a public candidate.

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

    # Election context is attached to the local notice group, so an archival notice on
    # the same page cannot lend its mailbox or year to the current-election candidate.

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
        source = payload["sources"][candidate["sourceId"]]
        self.assertEqual(candidate["sourceChain"][-1], source["sourceUrl"])
        self.assertIn(candidate["sourceQuote"], source["text"])

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


    # A shared mission page is fetched once, but each candidate retains the country
    # chain that attributed that source to its particular station.

    def test_discovery_attributes_shared_roma_notice_mailboxes_to_their_stations(self) -> None:
        italy_country_url = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/italija/ambasade-konzulati"
        malta_country_url = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/malta/ambasade-konzulati"
        notice_url = "https://roma.mfa.gov.rs/konzularne-usluge/izbori"
        italy = DISCOVERY.Station("IT", "st-it-emb-main", "roma.mfa.gov.rs", "izbori.rim@mfa.rs")
        malta = DISCOVERY.Station("MT", "st-mt-emb-main", "roma.mfa.gov.rs", "srb.office.valletta@mfa.rs")
        italy_task = DISCOVERY.PageTask(
            notice_url,
            "IT",
            (italy,),
            0,
            source_chain=(DISCOVERY.INDEX_URLS[0], italy_country_url, notice_url),
        )
        malta_task = DISCOVERY.PageTask(
            notice_url,
            "MT",
            (malta,),
            0,
            source_chain=(DISCOVERY.INDEX_URLS[0], malta_country_url, notice_url),
        )
        fetch_calls: list[list[str]] = []

        def fetch_many(urls, *_args):
            requested = list(urls)
            fetch_calls.append([url for url, _ in requested])
            return [
                (
                    url,
                    DISCOVERY.Response(
                        url,
                        "text/html",
                        (
                            b"""
                            <h1>Izbori 2026</h1>
                            <p>Za glasanje u Italiji 2026 prijavu posaljite na izbori.rim@mfa.rs.</p>
                            <p>Za glasanje na Malti 2026 prijavu posaljite na srb.office.valletta@mfa.rs.</p>
                            """
                            if url == notice_url
                            else b"<html></html>"
                        ),
                    ),
                )
                for url, _ in requested
            ]

        with tempfile.TemporaryDirectory() as directory:
            temporary_directory = Path(directory)
            output = temporary_directory / "candidates.json"
            missions = temporary_directory / "missions.json"
            state = temporary_directory / "crawl-state.json"
            report = temporary_directory / "crawl-report.json"
            registry = temporary_directory / "registry.json"
            overrides = temporary_directory / "overrides.json"
            self._write_json(missions, {"countries": []})
            self._write_json(
                registry,
                [
                    {"country": "Italy", "url": "/spoljna-politika/bilateralna-saradnja/italija/ambasade-konzulati"},
                    {"country": "Malta", "url": "/spoljna-politika/bilateralna-saradnja/malta/ambasade-konzulati"},
                ],
            )
            self._write_json(overrides, {"missionOverrides": {}})
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
                mock.patch.object(
                    DISCOVERY,
                    "country_links",
                    side_effect=lambda _html, index_url, *_args: (
                        {italy_country_url: {"IT"}, malta_country_url: {"MT"}}
                        if index_url == DISCOVERY.INDEX_URLS[0]
                        else {}
                    ),
                ),
                mock.patch.object(
                    DISCOVERY,
                    "linked_mission_tasks",
                    side_effect=lambda _html, country_code, *_args: [
                        italy_task if country_code == "IT" else malta_task
                    ],
                ),
                mock.patch.object(DISCOVERY, "mission_links", return_value=[]),
                mock.patch.object(DISCOVERY, "fetch_many", side_effect=fetch_many),
                mock.patch.object(
                    DISCOVERY.sys,
                    "argv",
                    [
                        str(DISCOVERY_SCRIPT),
                        "--election-id",
                        "2026-parliamentary",
                        "--election-year",
                        "2026",
                        "--mode",
                        "full",
                        "--missions",
                        str(missions),
                        "--registry",
                        str(registry),
                        "--state",
                        str(state),
                        "--report",
                        str(report),
                        "--overrides",
                        str(overrides),
                        "--output",
                        str(output),
                        "--max-hosts",
                        "0",
                        "--max-pages",
                        "20",
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
        self.assertEqual(
            {candidate["stationId"]: candidate["sourceChain"] for candidate in candidates},
            {
                "st-it-emb-main": [DISCOVERY.INDEX_URLS[0], italy_country_url, notice_url],
                "st-mt-emb-main": [DISCOVERY.INDEX_URLS[0], malta_country_url, notice_url],
            },
        )
        self.assertEqual(sum(fetch_calls, []).count(notice_url), 1)

    # Discovery artifacts must not overwrite crawler inputs: a failed invocation must
    # leave the operator-owned override document intact.

    def test_discovery_refuses_overrides_as_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "overrides.json"
            baseline = {"missionOverrides": {"station": {"electionEmail": "preserve@example.test"}}}
            self._write_json(output, baseline)

            result = subprocess.run(
                [
                    sys.executable,
                    str(DISCOVERY_SCRIPT),
                    "--election-id",
                    "parliamentary-2026",
                    "--output",
                    str(output),
                    "--overrides",
                    str(output),
                ],
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 2)
            self.assertIn("must not alias a crawler input", result.stderr)
            self.assertEqual(self._read_json(output), baseline)

    # Promotion is the trust boundary. A new override needs source-checked review tied
    # to the selected evidence; historic approvals, incomplete packets, and partial
    # batches cannot authorize a changed contact.

    def test_source_checked_primary_review_promotes_a_new_station_email(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_v2_promotion_fixture(Path(directory))
            self._import_primary_accept(paths, "embassy-vienna")

            result = self._run_promotion(paths, "--station", "embassy-vienna")

            self.assertEqual(result.returncode, 0, result.stderr)
            override = self._read_json(paths["overrides"])["missionOverrides"]["embassy-vienna"]
            provenance = override["_electionContactProvenance"]
            self.assertEqual(override["electionEmail"], "izbori.vienna@mfa.gov.rs")
            self.assertEqual(provenance["schemaVersion"], 2)
            self.assertEqual(provenance["candidateId"], "embassy-vienna-2026-election-contact")
            self.assertNotIn("humanApprovals", provenance)

    def test_historical_human_ledger_does_not_authorize_changed_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_v2_promotion_fixture(Path(directory), historical_authority=True)
            baseline = self._read_json(paths["overrides"])
            report = paths["report"]

            self._write_empty_reviews(paths)
            result = self._run_promotion(paths, "--dry-run", "--report", str(report))

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self._read_json(report)["eligibleStationIds"], [])
            self.assertEqual(self._read_json(paths["overrides"]), baseline)

    def test_packet_export_holds_quote_without_exact_visible_mailbox(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_v2_promotion_fixture(Path(directory))
            baseline = self._read_json(paths["overrides"])
            candidates = self._read_json(paths["candidates"])
            candidate = candidates["candidates"][0]
            candidate["sourceQuote"] = "Obaveštenje o izborima 2026. opisuje podnošenje prijave."
            candidate["quote"] = candidate["sourceQuote"]
            self._write_json(paths["candidates"], candidates)

            self._assert_unreviewable_packet_is_held(paths, baseline)

    def test_packet_export_holds_source_from_another_mission(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_v2_promotion_fixture(Path(directory))
            baseline = self._read_json(paths["overrides"])
            candidates = self._read_json(paths["candidates"])
            candidate = candidates["candidates"][0]
            source = candidates["sources"].pop(candidate["sourceId"])
            source_url = "https://belgrade.mfa.gov.rs/konzularne-usluge/izbori"
            source["sourceUrl"] = source_url
            source["finalUrl"] = source_url
            candidate["sourceId"] = hashlib.sha256(
                json.dumps(
                    {"sourceUrl": source_url, "textSha256": source["textSha256"]},
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                ).encode("utf-8")
            ).hexdigest()
            candidate["sourceChain"][-1] = source_url
            candidates["sources"][candidate["sourceId"]] = source
            self._write_json(paths["candidates"], candidates)

            self._assert_unreviewable_packet_is_held(paths, baseline)

    def test_selected_batch_does_not_apply_when_one_group_is_held(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_v2_promotion_fixture(Path(directory), include_second_station=True)
            self._import_primary_accept(paths, "embassy-vienna")
            baseline = self._read_json(paths["overrides"])

            result = self._run_promotion(
                paths,
                "--station",
                "embassy-vienna",
                "--station",
                "consulate-salzburg",
            )

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(self._read_json(paths["overrides"]), baseline)

    def _run_discovery_fixture(self, election_id: str, notice_html: str) -> dict[str, object]:
        country_url = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/austrija/ambasade-konzulati"
        notice_url = "https://vienna.mfa.gov.rs/konzularne-usluge/izbori"
        station = DISCOVERY.Station("AT", "embassy-vienna", "vienna.mfa.gov.rs")
        notice_task = DISCOVERY.PageTask(
            notice_url,
            "AT",
            (station,),
            0,
            source_chain=(DISCOVERY.INDEX_URLS[0], country_url, notice_url),
        )
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
            temporary_directory = Path(directory)
            output = temporary_directory / "candidates.json"
            missions = temporary_directory / "missions.json"
            state = temporary_directory / "crawl-state.json"
            report = temporary_directory / "crawl-report.json"
            registry = temporary_directory / "registry.json"
            overrides = temporary_directory / "overrides.json"
            self._write_json(missions, {"countries": []})
            self._write_json(
                registry,
                [{"country": "Austria", "url": "/spoljna-politika/bilateralna-saradnja/austrija/ambasade-konzulati"}],
            )
            self._write_json(overrides, {"missionOverrides": {}})
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
                        "--election-year",
                        "2026",
                        "--mode",
                        "full",
                        "--missions",
                        str(missions),
                        "--registry",
                        str(registry),
                        "--state",
                        str(state),
                        "--report",
                        str(report),
                        "--overrides",
                        str(overrides),
                        "--output",
                        str(output),
                        "--max-hosts",
                        "0",
                        "--max-pages",
                        "20",
                    ],
                ),
            ):
                self.assertEqual(DISCOVERY.main(), 0)
            return self._read_json(output)
    def _write_v2_promotion_fixture(
        self,
        directory: Path,
        *,
        include_second_station: bool = False,
        historical_authority: bool = False,
    ) -> dict[str, Path]:
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        election_id = "2026-parliamentary"
        index_url = "https://www.mfa.gov.rs/diplomatsko-konzularna-predstavnistva"
        country_url = f"{index_url}/austrija"
        sources: dict[str, dict[str, str]] = {}
        candidates: list[dict[str, str]] = []

        def add_source(source_url: str, text: str) -> str:
            text_sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
            source_id = hashlib.sha256(
                json.dumps(
                    {"sourceUrl": source_url, "textSha256": text_sha256},
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                ).encode("utf-8")
            ).hexdigest()
            sources[source_id] = {
                "sourceUrl": source_url,
                "finalUrl": source_url,
                "fetchedAt": now,
                "bodySha256": text_sha256,
                "textSha256": text_sha256,
                "text": text,
                "extractorVersion": "1",
            }
            return source_id

        index_source_id = add_source(index_url, "Diplomatsko-konzularna predstavništva: Austrija.")
        country_source_id = add_source(
            country_url,
            "Austrija: Ambasada Republike Srbije u Beču.",
        )

        def add_candidate(station_id: str, host: str, email: str, city: str) -> None:
            source_url = f"https://{host}/konzularne-usluge/izbori"
            source_quote = (
                f"Za glasanje u inostranstvu na izborima 2026, prijavu pošaljite na {email}."
            )
            source_id = add_source(
                source_url,
                f"Ambasada Republike Srbije u {city}. Obaveštenje o parlamentarnim izborima 2026. "
                f"{source_quote}",
            )
            candidates.append(
                {
                    "candidateId": f"{station_id}-2026-election-contact",
                    "electionId": election_id,
                    "electionYear": "2026",
                    "countryCode": "AT",
                    "stationId": station_id,
                    "stationName": f"Embassy in {city}",
                    "email": email,
                    "title": "Obaveštenje o parlamentarnim izborima 2026.",
                    "electionContext": "Obaveštenje o parlamentarnim izborima 2026.",
                    "sourceQuote": source_quote,
                    "quote": source_quote,
                    "sourceUrl": source_url,
                    "sourceHost": host,
                    "sourceId": source_id,
                    "sourceChain": [index_url, country_url, source_url],
                    "observedAt": now,
                }
            )

        add_candidate("embassy-vienna", "vienna.mfa.gov.rs", "izbori.vienna@mfa.gov.rs", "Beču")
        if include_second_station:
            add_candidate(
                "consulate-salzburg",
                "salzburg.mfa.gov.rs",
                "izbori.salzburg@mfa.gov.rs",
                "Salcburgu",
            )

        paths = {
            "candidates": directory / "candidates.json",
            "reviews": directory / "reviews.json",
            "reviewers": directory / "reviewers.json",
            "canonical": directory / "canonical.json",
            "overrides": directory / "overrides.json",
            "packet": directory / "packet.json",
            "imported_reviews": directory / "imported-reviews.json",
            "report": directory / "promotion-report.json",
        }
        self._write_json(
            paths["candidates"],
            {
                "schemaVersion": 1,
                "electionId": election_id,
                "electionYear": "2026",
                "generatedAt": now,
                "runId": "test-run",
                "pendingStationIds": [candidate["stationId"] for candidate in candidates],
                "sources": sources,
                "candidates": candidates,
            },
        )
        self._write_json(
            paths["reviewers"],
            {
                "schemaVersion": 2,
                "mode": "source_checked_ai",
                "requiredAiApprovals": 1,
                "escalationRole": "architect",
                "humanReviewerIds": ["vokativ"],
                "maxSourceAgeHours": 24,
            },
        )
        stations = [
            {
                "id": "embassy-vienna",
                "email": "info@vienna.mfa.gov.rs",
                "website": "https://vienna.mfa.gov.rs",
                "isResident": True,
            }
        ]
        if include_second_station:
            stations.append(
                {
                    "id": "consulate-salzburg",
                    "email": "info@salzburg.mfa.gov.rs",
                    "website": "https://salzburg.mfa.gov.rs",
                }
            )
        self._write_json(
            paths["canonical"],
            {"countries": [{"countryCode": "AT", "stations": stations}]},
        )
        overrides: dict[str, object] = {"missionOverrides": {}}
        if historical_authority:
            overrides["missionOverrides"] = {
                "embassy-vienna": {
                    "electionEmail": "old-vienna-election@mfa.gov.rs",
                    "_electionContactProvenance": {
                        "electionId": election_id,
                        "humanApprovals": [{"reviewerId": "vokativ", "decision": "approve"}],
                    },
                }
            }
        self._write_json(paths["overrides"], overrides)
        return paths

    def _export_packets(self, paths: dict[str, Path]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(REVIEW_SCRIPT),
                "--input",
                str(paths["candidates"]),
                "--output",
                str(paths["reviews"]),
                "--canonical",
                str(paths["canonical"]),
                "--reviewers",
                str(paths["reviewers"]),
                "--overrides",
                str(paths["overrides"]),
                "--role",
                "primary",
                "--export-packet",
                str(paths["packet"]),
            ],
            check=False,
            capture_output=True,
            text=True,
        )

    def _assert_unreviewable_packet_is_held(
        self, paths: dict[str, Path], baseline: object
    ) -> None:
        export = self._export_packets(paths)
        self.assertEqual(export.returncode, 0, export.stderr)
        packet_document = self._read_json(paths["packet"])
        self.assertEqual(packet_document["packets"], [])
        self._write_json(
            paths["reviews"],
            {
                "schemaVersion": 2,
                "asOf": packet_document["asOf"],
                "policyDigest": packet_document["policyDigest"],
                "canonicalDigest": packet_document["canonicalDigest"],
                "reviews": [],
            },
        )

        dry_run = self._run_promotion(paths, "--dry-run", "--report", str(paths["report"]))
        self.assertEqual(dry_run.returncode, 0, dry_run.stderr)
        self.assertEqual(
            self._read_json(paths["report"]),
            {
                "eligibleStationIds": [],
                "held": [
                    {
                        "stationId": "embassy-vienna",
                        "reason": "selected candidate group has incomplete evidence and must be refetched",
                    }
                ],
                "unchangedStationIds": [],
            },
        )
        self.assertEqual(self._read_json(paths["overrides"]), baseline)

        promotion = self._run_promotion(paths, "--station", "embassy-vienna")
        self.assertEqual(promotion.returncode, 2, promotion.stderr)
        self.assertIn("Selected promotion batch is not eligible", promotion.stderr)
        self.assertEqual(self._read_json(paths["overrides"]), baseline)

    def _write_empty_reviews(self, paths: dict[str, Path]) -> None:
        export = self._export_packets(paths)
        self.assertEqual(export.returncode, 0, export.stderr)
        packet_document = self._read_json(paths["packet"])
        self._write_json(
            paths["reviews"],
            {
                "schemaVersion": 2,
                "asOf": packet_document["asOf"],
                "policyDigest": packet_document["policyDigest"],
                "canonicalDigest": packet_document["canonicalDigest"],
                "reviews": [],
            },
        )

    def _import_primary_accept(self, paths: dict[str, Path], station_id: str) -> None:
        export = self._export_packets(paths)
        self.assertEqual(export.returncode, 0, export.stderr)
        packet_document = self._read_json(paths["packet"])
        packet = next(item for item in packet_document["packets"] if item["stationId"] == station_id)
        candidate = packet["candidates"][0]
        source_id = candidate["sourceId"]
        source_text = packet["sources"][source_id]["text"]
        source_quote = self._read_json(paths["candidates"])["candidates"][
            next(
                index
                for index, item in enumerate(self._read_json(paths["candidates"])["candidates"])
                if item["stationId"] == station_id
            )
        ]["sourceQuote"]
        self._write_json(
            paths["imported_reviews"],
            {
                "schemaVersion": 2,
                "asOf": packet_document["asOf"],
                "policyDigest": packet_document["policyDigest"],
                "canonicalDigest": packet_document["canonicalDigest"],
                "reviews": [
                    {
                        "reviewId": f"{station_id}-genuine-test-harness-review",
                        "reviewerType": "ai",
                        "reviewRole": "primary",
                        "reviewStatus": "completed",
                        "reviewedAt": datetime.now(timezone.utc)
                        .replace(microsecond=0)
                        .isoformat()
                        .replace("+00:00", "Z"),
                        "asOf": packet_document["asOf"],
                        "validity": {"deadlineText": None, "validUntil": None},
                        "invocation": {
                            "transport": "harness_import",
                            "invocationId": "actual-harness-invocation-id",
                            "requestedModel": "slow",
                            "reportedModel": None,
                            "identitySource": "operator_attestation",
                        },
                        "stationId": station_id,
                        "candidateId": candidate["candidateId"],
                        "electionId": candidate["electionId"],
                        "electionYear": candidate["electionYear"],
                        "candidateSetDigest": packet["candidateSetDigest"],
                        "evidenceDigest": candidate["evidenceDigest"],
                        "decision": "accept",
                        "checks": {
                            "currentElection": "supported",
                            "registrationRecipient": "supported",
                            "stationScope": "supported",
                        },
                        "citations": [
                            {
                                "check": "currentElection",
                                "sourceId": source_id,
                                "quote": "Obaveštenje o parlamentarnim izborima 2026.",
                            },
                            {
                                "check": "registrationRecipient",
                                "sourceId": source_id,
                                "quote": source_quote,
                            },
                            {
                                "check": "stationScope",
                                "sourceId": source_id,
                                "quote": source_text.split(".")[0] + ".",
                            },
                        ],
                        "rationale": "The public notice identifies the current election and registration mailbox.",
                        "resolvesReviewIds": [],
                    }
                ],
            },
        )
        result = subprocess.run(
            [
                sys.executable,
                str(REVIEW_SCRIPT),
                "--input",
                str(paths["candidates"]),
                "--output",
                str(paths["reviews"]),
                "--canonical",
                str(paths["canonical"]),
                "--reviewers",
                str(paths["reviewers"]),
                "--overrides",
                str(paths["overrides"]),
                "--role",
                "primary",
                "--import-reviews",
                str(paths["imported_reviews"]),
                "--attest-import",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def _run_promotion(
        self, paths: dict[str, Path], *arguments: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(PROMOTION_SCRIPT),
                "--candidates",
                str(paths["candidates"]),
                "--reviews",
                str(paths["reviews"]),
                "--reviewers",
                str(paths["reviewers"]),
                "--canonical",
                str(paths["canonical"]),
                "--overrides",
                str(paths["overrides"]),
                *arguments,
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
