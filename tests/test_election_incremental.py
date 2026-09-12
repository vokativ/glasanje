"""Regression contracts for safe, bounded, source-evidenced incremental discovery.

The suite protects previously attributable contacts from crawl failures while ensuring
each run makes measurable progress without assigning shared evidence too broadly.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DISCOVERY_PATH = REPOSITORY_ROOT / "scripts" / "discover_election_contacts.py"


def load_discovery_module():
    spec = importlib.util.spec_from_file_location("incremental_election_discovery", DISCOVERY_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {DISCOVERY_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


DISCOVERY = load_discovery_module()
ELECTION_ID = "2026-parliamentary"
COUNTRY_URL = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/austrija/ambasade-konzulati"
INDEX_URL = "https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/ambasade"


class ElectionIncrementalDiscoveryTests(unittest.TestCase):
    # A targeted recheck may fail, but that operational failure must retain prior
    # election-scoped evidence rather than silently withdrawing a usable contact.

    def test_failed_explicit_recheck_keeps_prior_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {
                "missionOverrides": {
                    "st-at": {
                        "electionEmail": "izbori@alpha.example",
                        "_electionContactProvenance": {
                            "electionId": ELECTION_ID,
                            "electionYear": "2026",
                        },
                    },
                },
            })
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
            old_candidate = {
                "candidateId": "old-candidate",
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "countryCode": "AT",
                "stationId": "st-at",
                "email": "izbori@alpha.example",
                "sourceUrl": "https://alpha.mfa.gov.rs/old-notice",
                "observedAt": "2026-09-01T00:00:00Z",
            }
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [old_candidate],
                "sources": {},
            })

            result = self._run(paths, station="st-at", responses={"https://alpha.mfa.gov.rs/": self._failure("HTTP 503")})

            self.assertEqual(result["candidates"], [old_candidate])
            report = self._read_json(paths["report"])
            self.assertEqual(self._coverage(report, "st-at")["status"], "failed")
            self.assertTrue(self._coverage(report, "st-at")["retainedAuthority"])
            self.assertTrue(report["failures"])

    def test_matching_provenance_retains_legacy_email_but_refreshes_competitor(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "alpha.mfa.gov.rs", True),
                ("st-beta", "beta.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {
                "missionOverrides": {
                    "st-alpha": {
                        "electionEmail": "izbori@alpha.example",
                        "_electionContactProvenance": {
                            "electionId": ELECTION_ID,
                            "electionYear": "2026",
                        },
                    },
                    "st-beta": {
                        "electionEmail": "izbori@beta.example",
                        "_electionContactProvenance": {
                            "electionId": ELECTION_ID,
                            "electionYear": "2026",
                        },
                    },
                },
            })
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
                "beta.mfa.gov.rs": "https://beta.mfa.gov.rs/",
            }))
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [
                    {
                        "candidateId": "legacy-approved",
                        "electionId": ELECTION_ID,
                        "electionYear": "2026",
                        "countryCode": "AT",
                        "stationId": "st-alpha",
                        "email": "izbori@alpha.example",
                    },
                    {
                        "candidateId": "legacy-competitor",
                        "electionId": ELECTION_ID,
                        "electionYear": "2026",
                        "countryCode": "AT",
                        "stationId": "st-beta",
                        "email": "other@beta.example",
                    },
                ],
                "sources": {},
            })

            _, calls = self._run_with_calls(paths, responses={
                "https://beta.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })

            self.assertEqual(calls, [["https://beta.mfa.gov.rs/"]])
            report = self._read_json(paths["report"])
            self.assertEqual(self._coverage(report, "st-alpha")["status"], "retained")
            self.assertEqual(self._coverage(report, "st-beta")["status"], "scanned-no-evidence")

    def test_unreviewed_source_candidate_remains_pending_on_repeat(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
            candidate = {
                "candidateId": "unreviewed-candidate",
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "countryCode": "AT",
                "stationId": "st-at",
                "email": "izbori@alpha.example",
                "sourceId": "source-1",
            }
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [candidate],
                "sources": {"source-1": {}},
            })

            first = self._run(paths, responses={
                "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })
            second = self._run(paths, responses={
                "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })

            self.assertEqual(first["pendingStationIds"], ["st-at"])
            self.assertEqual(second["pendingStationIds"], ["st-at"])
            self.assertEqual(self._coverage(self._read_json(paths["report"]), "st-at")["status"], "candidate")

    # Confirmation and retained authority are election-scoped: a prior cycle cannot
    # suppress the current cycle's crawl or turn an unreviewed candidate into approval.

    def test_old_election_confirmation_does_not_skip_new_cycle(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            missions = self._missions(("st-at", "alpha.mfa.gov.rs", True),)
            missions["countries"][0]["stations"][0]["isElectionContactConfirmed"] = True
            self._write_json(paths["missions"], missions)
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {
                "missionOverrides": {
                    "st-at": {
                        "electionEmail": "old-izbori@alpha.example",
                        "_electionContactProvenance": {
                            "electionId": "2024-parliamentary",
                            "electionYear": "2024",
                        },
                    },
                },
            })
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            _, calls = self._run_with_calls(paths, responses={
                "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })

            self.assertEqual(calls, [["https://alpha.mfa.gov.rs/"]])
            coverage = self._coverage(self._read_json(paths["report"]), "st-at")
            self.assertEqual(coverage["status"], "scanned-no-evidence")
            self.assertFalse(coverage["retainedAuthority"])

    def test_no_site_archive_candidate_does_not_enter_pending_workset(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            missions = self._missions(("st-at", "alpha.mfa.gov.rs", True),)
            missions["countries"][0]["stations"].append({
                "id": "st-no-site",
                "website": "",
                "isResident": True,
                "embassy": "Mission without a website",
            })
            self._write_json(paths["missions"], missions)
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [{
                    "candidateId": "archived-no-site",
                    "electionId": ELECTION_ID,
                    "electionYear": "2026",
                    "countryCode": "AT",
                    "stationId": "st-no-site",
                    "email": "izbori@no-site.example",
                    "sourceId": "source-no-site",
                }],
                "sources": {"source-no-site": {}},
            })

            result = self._run(paths, responses={
                "https://alpha.mfa.gov.rs/": self._html(
                    "<main><p>Za parlamentarne izbore 2026 prijavu za glasanje pošaljite na izbori@alpha.example.</p></main>"
                ),
            })

            self.assertEqual(result["pendingStationIds"], ["st-at"])
            self.assertEqual(self._coverage(self._read_json(paths["report"]), "st-no-site")["status"], "no-site")

    # Host and page limits are operational bounds, not omissions: saved cursor state
    # must resume at the next unvisited host so repeated runs eventually cover all work.

    def test_bounded_runs_rotate_missing_hosts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "alpha.mfa.gov.rs", True),
                ("st-beta", "beta.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
                "beta.mfa.gov.rs": "https://beta.mfa.gov.rs/",
            }))

            self._run(paths, max_hosts=1, responses={
                "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                "https://beta.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })
            first_report = self._read_json(paths["report"])
            self.assertEqual(first_report["attemptedMissionHosts"], 1)
            self.assertEqual(self._coverage(first_report, "st-alpha")["status"], "scanned-no-evidence")
            self.assertEqual(self._coverage(first_report, "st-beta")["status"], "not attempted")

            self._run(paths, max_hosts=1, responses={
                "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                "https://beta.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })
            second_report = self._read_json(paths["report"])
            self.assertEqual(second_report["attemptedMissionHosts"], 1)
            self.assertEqual(self._coverage(second_report, "st-alpha")["status"], "not attempted")
            self.assertEqual(self._coverage(second_report, "st-beta")["status"], "scanned-no-evidence")

    def test_page_budget_resumes_at_first_unfetched_cached_host(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "alpha.mfa.gov.rs", True),
                ("st-beta", "beta.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
                "beta.mfa.gov.rs": "https://beta.mfa.gov.rs/",
            }))

            _, first_calls = self._run_with_calls(
                paths,
                max_hosts=2,
                max_pages=1,
                responses={
                    "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                    "https://beta.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                },
            )
            self.assertEqual(first_calls, [["https://alpha.mfa.gov.rs/"]])
            self.assertEqual(self._read_json(paths["state"])["hostCursor"], 1)

            _, second_calls = self._run_with_calls(
                paths,
                max_hosts=2,
                max_pages=1,
                responses={
                    "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                    "https://beta.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                },
            )
            self.assertEqual(second_calls, [["https://beta.mfa.gov.rs/"]])
            self.assertEqual(self._coverage(self._read_json(paths["report"]), "st-beta")["status"], "scanned-no-evidence")

    def test_deep_retry_requires_station_scope_and_fixed_depth(self) -> None:
        base_argv = [str(DISCOVERY_PATH), "--election-id", ELECTION_ID]
        with mock.patch.object(DISCOVERY.sys, "argv", [*base_argv, "--mode", "deep-retry"]):
            with self.assertRaises(SystemExit):
                DISCOVERY.parse_args()
        with mock.patch.object(
            DISCOVERY.sys,
            "argv",
            [*base_argv, "--mode", "deep-retry", "--station", "st-at", "--max-depth", "5"],
        ):
            with self.assertRaises(SystemExit):
                DISCOVERY.parse_args()
        with mock.patch.object(DISCOVERY.sys, "argv", base_argv):
            self.assertEqual(DISCOVERY.parse_args().max_depth, 2)
        with mock.patch.object(
            DISCOVERY.sys, "argv", [*base_argv, "--mode", "deep-retry", "--station", "st-at"]
        ):
            self.assertEqual(DISCOVERY.parse_args().max_depth, 6)

    def test_deep_retry_reaches_depth_six_without_broadening_station_scope(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "alpha.mfa.gov.rs", True),
                ("st-beta", "beta.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
                "beta.mfa.gov.rs": "https://beta.mfa.gov.rs/",
            }))
            responses = self._six_step_election_chain("alpha.mfa.gov.rs")

            default_result, default_calls = self._run_with_calls(
                paths, station="st-alpha", responses=responses
            )
            default_report = self._read_json(paths["report"])
            deep_result, deep_calls = self._run_with_calls(
                paths, station="st-alpha", mode="deep-retry", responses=responses
            )
            deep_report = self._read_json(paths["report"])

            self.assertEqual(default_result["candidates"], [])
            self.assertEqual(default_calls, [[
                "https://alpha.mfa.gov.rs/",
            ], [
                "https://alpha.mfa.gov.rs/izbori-1",
            ], [
                "https://alpha.mfa.gov.rs/izbori-2",
            ]])
            self.assertEqual(self._coverage(default_report, "st-alpha")["status"], "depth-limited")
            self.assertEqual([candidate["stationId"] for candidate in deep_result["candidates"]], ["st-alpha"])
            self.assertEqual(deep_calls, [[
                "https://alpha.mfa.gov.rs/",
            ], [
                "https://alpha.mfa.gov.rs/izbori-1",
            ], [
                "https://alpha.mfa.gov.rs/izbori-2",
            ], [
                "https://alpha.mfa.gov.rs/izbori-3",
            ], [
                "https://alpha.mfa.gov.rs/izbori-4",
            ], [
                "https://alpha.mfa.gov.rs/izbori-5",
            ], [
                "https://alpha.mfa.gov.rs/izbori-6",
            ]])
            self.assertEqual(self._coverage(deep_report, "st-beta")["status"], "not attempted")
            self.assertTrue(all(all("beta.mfa.gov.rs" not in url for url in call) for call in deep_calls))

    def test_depth_limit_ignores_links_to_already_scheduled_pages(self) -> None:
        # MFA notices repeat navigation links to their listing, themselves,
        # and sibling notices. These do not leave unexplored work at the cap.
        for has_unseen_link in (False, True):
            with self.subTest(has_unseen_link=has_unseen_link), tempfile.TemporaryDirectory() as directory:
                paths = self._paths(Path(directory))
                self._write_json(paths["missions"], self._missions(("st-alpha", "alpha.mfa.gov.rs", True),))
                self._write_json(paths["registry"], self._registry())
                self._write_json(paths["overrides"], {"missionOverrides": {}})
                self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
                navigation = '<a href="/mediji/aktuelnosti">Aktuelnosti</a>'
                notices = '<a href="/mediji/notice-a">News A</a><a href="/mediji/notice-b">News B</a>'
                extra = '<a href="/mediji/unseen">News C</a>' if has_unseen_link else ''
                responses = {
                    "https://alpha.mfa.gov.rs/": self._html(navigation),
                    "https://alpha.mfa.gov.rs/mediji/aktuelnosti": self._html(navigation + notices),
                    "https://alpha.mfa.gov.rs/mediji/notice-a": self._html(navigation + notices + extra),
                    "https://alpha.mfa.gov.rs/mediji/notice-b": self._html(navigation + notices),
                }

                result, calls = self._run_with_calls(paths, station="st-alpha", responses=responses)
                report = self._read_json(paths["report"])

                self.assertEqual(result["candidates"], [])
                self.assertEqual(report["fetchedPages"], 4)
                self.assertEqual(report["failures"], [])
                self.assertEqual(report["partial"], has_unseen_link)
                self.assertEqual(
                    self._coverage(report, "st-alpha")["status"],
                    "depth-limited" if has_unseen_link else "scanned-no-evidence",
                )
                self.assertFalse(any("https://alpha.mfa.gov.rs/mediji/unseen" in call for call in calls))

    def test_deep_retry_respects_page_budget(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-alpha", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result, calls = self._run_with_calls(
                paths,
                station="st-alpha",
                mode="deep-retry",
                max_pages=3,
                responses=self._six_step_election_chain("alpha.mfa.gov.rs"),
            )

            report = self._read_json(paths["report"])
            self.assertEqual(result["candidates"], [])
            self.assertEqual(calls, [[
                "https://alpha.mfa.gov.rs/",
            ], [
                "https://alpha.mfa.gov.rs/izbori-1",
            ], [
                "https://alpha.mfa.gov.rs/izbori-2",
            ]])
            self.assertEqual(report["fetchedPages"], 3)
            self.assertEqual(self._coverage(report, "st-alpha")["status"], "budget-limited")

    # Shared hosts require conservative attribution. An explicit crawl may produce a
    # candidate only for its selected station; ambiguous evidence must never fan out.

    def test_explicit_shared_host_crawl_does_not_fan_out_canonical_email(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            missions = self._missions(
                ("st-nonres-ag", "washington.mfa.gov.rs", False),
                ("st-unrelated-antigua", "washington.mfa.gov.rs", False),
            )
            for station in missions["countries"][0]["stations"]:
                station["email"] = "izbori@washington.example"
            self._write_json(paths["missions"], missions)
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state(
                {"washington.mfa.gov.rs": "https://washington.mfa.gov.rs/"}
            ))

            result = self._run(
                paths,
                station="st-nonres-ag",
                responses={
                    "https://washington.mfa.gov.rs/": self._html(
                        "<main><p>Za parlamentarne izbore 2026 prijavu pošaljite na "
                        "izbori@washington.example.</p></main>"
                    ),
                },
            )

            self.assertEqual([candidate["stationId"] for candidate in result["candidates"]], ["st-nonres-ag"])

    def test_explicit_country_does_not_assign_other_country_known_mailbox(self) -> None:
        italy_country_url = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/italija/ambasade-konzulati"
        notice_url = "https://roma.mfa.gov.rs/konzularne-usluge/izbori"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], {
                "countries": [
                    {
                        "countryCode": "IT",
                        "label": "Italy",
                        "stations": [{
                            "id": "st-it-emb-main",
                            "website": "https://roma.mfa.gov.rs",
                            "embassy": "Embassy in Rome",
                        }],
                    },
                    {
                        "countryCode": "MT",
                        "label": "Malta",
                        "stations": [{
                            "id": "st-mt-emb-main",
                            "website": "https://roma.mfa.gov.rs",
                            "email": "srb.office.valletta@mfa.rs",
                            "embassy": "Embassy in Valletta",
                        }],
                    },
                ],
            })
            self._write_json(paths["registry"], [
                {"country": "Italy", "url": "/spoljna-politika/bilateralna-saradnja/italija/ambasade-konzulati"},
                {"country": "Malta", "url": "/spoljna-politika/bilateralna-saradnja/malta/ambasade-konzulati"},
            ])
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "hostCursor": 0,
                "countryChains": {
                    "IT": {
                        "indexUrl": INDEX_URL,
                        "countryUrl": italy_country_url,
                        "missionEntries": [{"host": "roma.mfa.gov.rs", "url": notice_url}],
                    },
                },
            })

            result, calls = self._run_with_calls(
                paths,
                station="st-it-emb-main",
                responses={
                    notice_url: self._html(
                        "<main><p>Za parlamentarne izbore 2026 prijavu pošaljite na "
                        "srb.office.valletta@mfa.rs.</p></main>"
                    ),
                },
            )

            report = self._read_json(paths["report"])
        self.assertEqual(result["candidates"], [])
        self.assertEqual(calls, [[notice_url]])
        self.assertEqual(self._coverage(report, "st-it-emb-main")["status"], "ambiguous")
        self.assertEqual(self._coverage(report, "st-mt-emb-main")["status"], "not attempted")
        self.assertEqual(report["ambiguous"], [{
            "sourceUrl": notice_url,
            "email": "srb.office.valletta@mfa.rs",
            "stationIds": ["st-it-emb-main"],
        }])

    # Fetching a shared host once avoids duplicate external requests while preserving
    # ambiguity when its page cannot distinguish the stations it serves.

    def test_shared_host_is_fetched_once_per_run(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "shared.mfa.gov.rs", True),
                ("st-beta", "shared.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"shared.mfa.gov.rs": "https://shared.mfa.gov.rs/"}))

            _, calls = self._run_with_calls(paths, responses={
                "https://shared.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
            })

            self.assertEqual(calls, [["https://shared.mfa.gov.rs/"]])

    def test_nonresident_shared_host_without_mailbox_match_is_ambiguous(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-nonres-a", "shared.mfa.gov.rs", False),
                ("st-nonres-b", "shared.mfa.gov.rs", False),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"shared.mfa.gov.rs": "https://shared.mfa.gov.rs/"}))

            result = self._run(paths, responses={
                "https://shared.mfa.gov.rs/": self._html(
                    "<main><p>Za parlamentarne izbore 2026 prijavu pošaljite na izbori@shared.example.</p></main>"
                ),
            })

            self.assertEqual(result["candidates"], [])
            report = self._read_json(paths["report"])
            self.assertEqual(self._coverage(report, "st-nonres-a")["status"], "ambiguous")
            self.assertEqual(self._coverage(report, "st-nonres-b")["status"], "ambiguous")
            self.assertEqual(report["ambiguous"][0]["stationIds"], ["st-nonres-a", "st-nonres-b"])


    def test_direct_notice_uses_verified_chain_and_only_its_bound_shared_host_station(self) -> None:
        country_url = "https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/svedska/ambasade-konzulati"
        mission_url = "https://stockholm.mfa.gov.rs/"
        notice_url = (
            "https://stockholm.mfa.gov.rs/mediji/najave-i-obavestenja/"
            "raspisivanje-izbora-za-narodne-poslanike-republike-srbije"
        )
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], {
                "countries": [
                    {
                        "countryCode": "SE",
                        "label": "Sweden",
                        "labelCyr": "Шведска",
                        "stations": [{
                            "id": "st-se-emb-main",
                            "website": "https://stockholm.mfa.gov.rs",
                            "embassy": "Embassy in Stockholm",
                        }],
                    },
                    {
                        "countryCode": "LV",
                        "label": "Letonija",
                        "stations": [{
                            "id": "st-lv-emb-main",
                            "website": "https://stockholm.mfa.gov.rs",
                            "embassy": "Embassy in Riga",
                        }],
                    },
                ],
            })
            self._write_json(paths["registry"], [
                {"country": "Шведска", "url": "/spoljna-politika/bilateralna-saradnja/svedska/ambasade-konzulati"},
                {"country": "Letonija", "url": "/spoljna-politika/bilateralna-saradnja/letonija/ambasade-konzulati"},
            ])
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "hostCursor": 0,
                "countryChains": {},
            })
            index_responses = {
                url: self._html(
                    f'<main><a href="{country_url}">Шведска</a></main>' if url == INDEX_URL else "<main></main>"
                )
                for url in DISCOVERY.INDEX_URLS
            }
            result, calls = self._run_with_calls(
                paths,
                station="st-se-emb-main",
                notice_urls=(f"st-se-emb-main={notice_url}",),
                responses={
                    **index_responses,
                    country_url: self._html(f'<main><a href="{mission_url}">Ambasada</a></main>'),
                    mission_url: self._html("<main><p>Kontakt.</p></main>"),
                    notice_url: self._html(
                        "<main><p>Za parlamentarne izbore 2026 prijavu za glasanje pošaljite na "
                        "izbori@stockholm.example.</p></main>"
                    ),
                },
            )

        requested_urls = {url for batch in calls for url in batch}
        self.assertTrue(set(DISCOVERY.INDEX_URLS).issubset(requested_urls))
        self.assertIn(country_url, requested_urls)
        self.assertNotIn(mission_url, requested_urls)
        self.assertIn(notice_url, requested_urls)
        self.assertEqual([candidate["stationId"] for candidate in result["candidates"]], ["st-se-emb-main"])
        candidate = result["candidates"][0]
        self.assertEqual(candidate["sourceUrl"], notice_url)
        self.assertEqual(candidate["sourceChain"], [INDEX_URL, country_url, mission_url, notice_url])
        self.assertEqual(candidate["sourceSelection"], "operator-notice")
        self.assertEqual(result["sources"][candidate["sourceId"]]["sourceUrl"], notice_url)

    def test_direct_notice_rejects_distant_page_context_for_mailbox(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/mediji/obavestenje-o-izborima"
        distant_context = "Obaveštenje o parlamentarnim izborima 2026. " + ("Detalji " * 100)
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result = self._run(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                responses={
                    "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                    notice_url: self._html(
                        f"<main><p>{distant_context}</p><p>Prijavu pošaljite na "
                        "izbori@alpha.example.</p></main>"
                    ),
                },
            )
            report = self._read_json(paths["report"])

        self.assertEqual(result["candidates"], [])
        self.assertEqual(self._coverage(report, "st-at")["selectedAcquisitionOutcome"], "scanned-no-evidence")

    def test_direct_notice_skips_optional_discovered_attachment_fetches(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/mediji/obavestenje-o-izborima"
        attachment_url = "https://alpha.mfa.gov.rs/izbori.doc"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result = self._run(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                responses={
                    "https://alpha.mfa.gov.rs/": self._html(
                        '<main><a href="/izbori.doc">Izbori 2026</a></main>'
                    ),
                    notice_url: self._html(
                        "<main><p>Za parlamentarne izbore 2026 prijavu pošaljite na "
                        "izbori@alpha.example.</p></main>"
                    ),
                    attachment_url: DISCOVERY.Response("", "application/msword", b"document"),
                },
            )
            report = self._read_json(paths["report"])

        self.assertEqual([candidate["stationId"] for candidate in result["candidates"]], ["st-at"])
        self.assertEqual(self._coverage(report, "st-at")["status"], "candidate")
        self.assertFalse(report["failures"])

    def test_crawl_skips_optional_unparseable_attachment_links(self) -> None:
        attachment_url = "https://alpha.mfa.gov.rs/izbori.docx"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            _, calls = self._run_with_calls(
                paths,
                responses={
                    "https://alpha.mfa.gov.rs/": self._html('<main><a href="/izbori.docx">Izbori 2026</a></main>'),
                    attachment_url: self._failure("must not fetch"),
                },
            )

            report = self._read_json(paths["report"])
            self.assertEqual(calls, [["https://alpha.mfa.gov.rs/"]])
            self.assertFalse(report["failures"])

    def test_normal_task_does_not_use_full_page_context_for_distant_mailbox(self) -> None:
        distant_context = "Obaveštenje o parlamentarnim izborima 2026. " + ("Detalji " * 100)
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result = self._run(
                paths,
                responses={
                    "https://alpha.mfa.gov.rs/": self._html(
                        f"<main><p>{distant_context}</p><section><p>Kontakt.</p></section><p>Prijavu pošaljite na "
                        "izbori@alpha.example.</p></main>"
                    ),
                },
            )
            report = self._read_json(paths["report"])

        self.assertEqual(result["candidates"], [])
        self.assertEqual(self._coverage(report, "st-at")["status"], "scanned-no-evidence")

    def test_direct_notice_uses_its_page_budget_without_homepage_fetch(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/mediji/obavestenje-o-izborima"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result, calls = self._run_with_calls(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                max_pages=1,
                responses={
                    "https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>"),
                    notice_url: self._html(
                        "<main><p>Za parlamentarne izbore 2026 prijavu pošaljite na izbori@alpha.example.</p></main>"
                    ),
                },
            )
            report = self._read_json(paths["report"])

        self.assertEqual([candidate["stationId"] for candidate in result["candidates"]], ["st-at"])
        self.assertEqual(calls, [[notice_url]])
        self.assertEqual(report["fetchedPages"], 1)
        self.assertEqual(self._coverage(report, "st-at")["status"], "candidate")

    def test_notice_url_invalid_inputs_fail_before_fetch(self) -> None:
        no_station_argv = [
            str(DISCOVERY_PATH),
            "--election-id", ELECTION_ID,
            "--notice-url", "st-at=https://alpha.mfa.gov.rs/notice",
        ]
        with mock.patch.object(DISCOVERY.sys, "argv", no_station_argv), self.assertRaises(SystemExit):
            DISCOVERY.parse_args()

        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-at", "alpha.mfa.gov.rs", True),
                ("st-other", "alpha.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
            }))
            base_argv = [
                str(DISCOVERY_PATH),
                "--election-id", ELECTION_ID,
                "--output", str(paths["output"]),
                "--missions", str(paths["missions"]),
                "--registry", str(paths["registry"]),
                "--state", str(paths["state"]),
                "--report", str(paths["report"]),
                "--overrides", str(paths["overrides"]),
            ]
            cases = (
                (("st-at",), ("st-at",)),
                (("st-at",), ("st-at=http://alpha.mfa.gov.rs/notice",)),
                (("st-at",), (
                    "st-at=https://alpha.mfa.gov.rs/notice",
                    "st-at=https://alpha.mfa.gov.rs/another-notice",
                )),
                (("st-at", "st-other"), (
                    "st-at=https://alpha.mfa.gov.rs/notice",
                    "st-other=https://alpha.mfa.gov.rs/notice",
                )),
                (("st-at",), ("st-at=https://untrusted.example/notice",)),
                (("st-at",), ("st-missing=https://alpha.mfa.gov.rs/notice",)),
                (("st-other",), ("st-at=https://alpha.mfa.gov.rs/notice",)),
            )
            for stations, notices in cases:
                argv = [*base_argv]
                for station in stations:
                    argv.extend(("--station", station))
                for notice in notices:
                    argv.extend(("--notice-url", notice))
                with self.subTest(notices=notices), mock.patch.object(
                    DISCOVERY, "fetch_many"
                ) as fetch_many, mock.patch.object(DISCOVERY.sys, "argv", argv):
                    self.assertEqual(DISCOVERY.main(), 2)
                    fetch_many.assert_not_called()

    # Parsing or transport failures are distinct from a readable page with no evidence:
    # only the former retain the prior candidate and report a failure for follow-up.

    def test_unreadable_pdf_fails_without_erasing_prior_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
            old_candidate = {
                "candidateId": "prior-pdf-candidate",
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "countryCode": "AT",
                "stationId": "st-at",
                "email": "izbori@alpha.example",
                "sourceUrl": "https://alpha.mfa.gov.rs/old-notice",
            }
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [old_candidate],
                "sources": {},
            })

            with mock.patch.object(DISCOVERY, "extract_pdf_evidence", side_effect=DISCOVERY.PdfExtractionError("encrypted")):
                result = self._run(
                    paths,
                    station="st-at",
                    responses={
                        "https://alpha.mfa.gov.rs/": self._html('<main><a href="/notice.pdf">Izbori</a></main>'),
                        "https://alpha.mfa.gov.rs/notice.pdf": DISCOVERY.Response("", "application/pdf", b"%PDF"),
                    },
                )

            self.assertEqual(result["candidates"], [old_candidate])
            report = self._read_json(paths["report"])
            self.assertEqual(self._coverage(report, "st-at")["status"], "failed")
            self.assertIn("PDF parse failure: encrypted", [item["reason"] for item in report["failures"]])

    def test_readable_pdf_without_address_is_scanned_no_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            with mock.patch.object(
                DISCOVERY,
                "extract_pdf_evidence",
                return_value=("Election notice", "Parliamentary elections 2026.", []),
            ):
                result = self._run(
                    paths,
                    responses={
                        "https://alpha.mfa.gov.rs/": self._html('<main><a href="/notice.pdf">Izbori</a></main>'),
                        "https://alpha.mfa.gov.rs/notice.pdf": DISCOVERY.Response("", "application/pdf", b"%PDF"),
                    },
                )

            self.assertEqual(result["candidates"], [])
            report = self._read_json(paths["report"])
            self.assertEqual(self._coverage(report, "st-at")["status"], "scanned-no-evidence")
            self.assertFalse(report["failures"])

    # Every pending candidate carries a reproducible source chain and extracted-text
    # snapshot, so later review can inspect the evidence rather than trust a URL alone.

    def test_successful_cached_chain_records_source_snapshot_and_pending_station(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result = self._run(paths, responses={
                "https://alpha.mfa.gov.rs/": self._html(
                    "<main><p>Za parlamentarne izbore 2026 prijavu za glasanje pošaljite na izbori@alpha.example.</p></main>"
                ),
            })

            self.assertEqual(result["pendingStationIds"], ["st-at"])
            candidate = result["candidates"][0]
            self.assertEqual(candidate["sourceChain"], [INDEX_URL, COUNTRY_URL, "https://alpha.mfa.gov.rs/"])
            source = result["sources"][candidate["sourceId"]]
            self.assertEqual(source["sourceUrl"], "https://alpha.mfa.gov.rs/")
            self.assertEqual(source["finalUrl"], "https://alpha.mfa.gov.rs/")
            self.assertEqual(source["extractorVersion"], "1")
            self.assertIn("izbori@alpha.example", source["text"])

    def test_registry_name_indexes_raw_korean_registry_label_and_reports_unmapped(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            missions = Path(directory) / "missions.json"
            registry = Path(directory) / "registry.json"
            self._write_json(missions, {
                "countries": [{
                    "countryCode": "KR",
                    "label": "Južna Koreja",
                    "registryNames": ["Јужна Кореја"],
                    "stations": [],
                }],
            })
            self._write_json(registry, [
                {"country": "Јужна Кореја", "url": "/spoljna-politika/bilateralna-saradnja/koreja/ambasade-konzulati"},
                {"country": "Nepostojeća", "url": "/spoljna-politika/bilateralna-saradnja/nepostojeca/ambasade-konzulati"},
            ])

            names, _ = DISCOVERY.load_stations(missions)
            links, unmapped = DISCOVERY.load_registry(registry, names)

            self.assertIn("KR", links)
            self.assertEqual(unmapped, ["Nepostojeća"])

    def test_colliding_canonical_registry_names_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            missions = Path(directory) / "missions.json"
            self._write_json(missions, {
                "countries": [
                    {"countryCode": "AA", "label": "Alpha", "registryNames": ["Shared"], "stations": []},
                    {"countryCode": "BB", "label": "Beta", "aliases": ["Shared"], "stations": []},
                ],
            })

            with self.assertRaisesRegex(ValueError, "collision"):
                DISCOVERY.load_stations(missions)

    def test_report_exposes_unmapped_registry_names(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], [
                *self._registry(),
                {"country": "Nepostojeća", "url": "/spoljna-politika/bilateralna-saradnja/nepostojeca/ambasade-konzulati"},
            ])
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            self._run(paths, responses={"https://alpha.mfa.gov.rs/": self._html("<main><p>Kontakt.</p></main>")})

            self.assertEqual(self._read_json(paths["report"])["unmappedRegistryNames"], ["Nepostojeća"])

    def test_explicit_notice_host_cap_rejects_before_any_fetch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(
                ("st-alpha", "alpha.mfa.gov.rs", True),
                ("st-beta", "beta.mfa.gov.rs", True),
            ))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({
                "alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/",
                "beta.mfa.gov.rs": "https://beta.mfa.gov.rs/",
            }))
            calls: list[object] = []
            argv = [
                str(DISCOVERY_PATH), "--election-id", ELECTION_ID,
                "--output", str(paths["output"]), "--missions", str(paths["missions"]),
                "--registry", str(paths["registry"]), "--state", str(paths["state"]),
                "--report", str(paths["report"]), "--overrides", str(paths["overrides"]),
                "--station", "st-alpha", "--station", "st-beta",
                "--notice-url", "st-alpha=https://alpha.mfa.gov.rs/notice",
                "--notice-url", "st-beta=https://beta.mfa.gov.rs/notice",
                "--max-hosts", "1",
            ]
            with mock.patch.object(DISCOVERY, "fetch_many", side_effect=calls.append), mock.patch.object(
                DISCOVERY.sys, "argv", argv
            ):
                self.assertEqual(DISCOVERY.main(), 2)
            self.assertEqual(calls, [])

    def test_direct_notice_is_local_only_marked_and_does_not_advance_cursor(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/notice"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            state = self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"})
            state["hostCursor"] = 7
            self._write_json(paths["state"], state)

            result, calls = self._run_with_calls(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                responses={
                    notice_url: self._html(
                        '<main><article><p>Za parlamentarne izbore 2026 prijavu pošaljite na '
                        'izbori@alpha.example.</p></article><a href="/izbori-potomak">Izbori 2026</a></main>'
                    ),
                    "https://alpha.mfa.gov.rs/izbori-potomak": self._failure("must not fetch"),
                },
            )

            report = self._read_json(paths["report"])
            self.assertEqual(calls, [[notice_url]])
            self.assertEqual(self._read_json(paths["state"])["hostCursor"], 7)
            self.assertEqual(result["candidates"][0]["sourceSelection"], "operator-notice")
            self.assertEqual(result["candidates"][0]["sourceChain"][-1], notice_url)
            self.assertEqual(report["selectedAcquisitions"], [{
                "stationId": "st-at",
                "sourceUrl": notice_url,
                "sourceSelection": "operator-notice",
                "outcome": "candidate",
            }])

    def test_direct_notice_rejects_page_wide_election_context_for_unrelated_mailbox(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/notice"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))

            result = self._run(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                responses={notice_url: self._html(
                    "<main><h1>Parlamentarni izbori 2026</h1><p>Opšta pitanja: info@alpha.example.</p></main>"
                )},
            )

            report = self._read_json(paths["report"])
            self.assertEqual(result["candidates"], [])
            self.assertEqual(self._coverage(report, "st-at")["selectedAcquisitionOutcome"], "scanned-no-evidence")

    def test_unsupported_direct_notice_reports_current_acquisition_over_retained_candidate(self) -> None:
        notice_url = "https://alpha.mfa.gov.rs/notice"
        with tempfile.TemporaryDirectory() as directory:
            paths = self._paths(Path(directory))
            self._write_json(paths["missions"], self._missions(("st-at", "alpha.mfa.gov.rs", True),))
            self._write_json(paths["registry"], self._registry())
            self._write_json(paths["overrides"], {"missionOverrides": {}})
            self._write_json(paths["state"], self._state({"alpha.mfa.gov.rs": "https://alpha.mfa.gov.rs/"}))
            self._write_json(paths["output"], {
                "schemaVersion": 1,
                "electionId": ELECTION_ID,
                "electionYear": "2026",
                "candidates": [{
                    "candidateId": "retained",
                    "electionId": ELECTION_ID,
                    "electionYear": "2026",
                    "stationId": "st-at",
                    "email": "izbori@alpha.example",
                    "sourceId": "retained-source",
                }],
                "sources": {"retained-source": {}},
            })

            self._run(
                paths,
                station="st-at",
                notice_urls=(f"st-at={notice_url}",),
                responses={notice_url: DISCOVERY.Response("", "application/msword", b"document")},
            )

            report = self._read_json(paths["report"])
            coverage = self._coverage(report, "st-at")
            self.assertEqual(coverage["status"], "failed-acquisition")
            self.assertTrue(coverage["retainedCandidateEvidence"])
            self.assertEqual(coverage["selectedAcquisitionOutcome"], "failed-unsupported-media")

    def _run(
        self,
        paths: dict[str, Path],
        *,
        responses: dict[str, object],
        station: str | None = None,
        notice_urls: tuple[str, ...] = (),
        mode: str = "incremental",
        max_hosts: int = 5,
        max_pages: int = 20,
    ) -> dict:
        result, _ = self._run_with_calls(
            paths,
            responses=responses,
            station=station,
            notice_urls=notice_urls,
            mode=mode,
            max_hosts=max_hosts,
            max_pages=max_pages,
        )
        return result

    def _run_with_calls(
        self,
        paths: dict[str, Path],
        *,
        responses: dict[str, object],
        station: str | None = None,
        notice_urls: tuple[str, ...] = (),
        mode: str = "incremental",
        max_hosts: int = 5,
        max_pages: int = 20,
    ) -> tuple[dict, list[list[str]]]:
        calls: list[list[str]] = []

        def fetch_many(urls, *_args):
            requested = list(urls)
            calls.append([url for url, _ in requested])
            results = []
            for url, _ in requested:
                response = responses.get(url, self._failure("unexpected URL"))
                if not isinstance(response, DISCOVERY.Response):
                    raise TypeError(f"fixture response for {url} is not a Response")
                results.append((url, DISCOVERY.Response(url, response.content_type, response.body, response.error)))
            return results

        argv = [
            str(DISCOVERY_PATH),
            "--election-id", ELECTION_ID,
            "--output", str(paths["output"]),
            "--missions", str(paths["missions"]),
            "--registry", str(paths["registry"]),
            "--state", str(paths["state"]),
            "--report", str(paths["report"]),
            "--overrides", str(paths["overrides"]),
            "--max-hosts", str(max_hosts),
            "--max-pages", str(max_pages),
            "--mode", mode,
        ]
        if station:
            argv.extend(("--station", station))
        for notice_url in notice_urls:
            argv.extend(("--notice-url", notice_url))
        with mock.patch.object(DISCOVERY, "fetch_many", side_effect=fetch_many), mock.patch.object(DISCOVERY.sys, "argv", argv):
            self.assertEqual(DISCOVERY.main(), 0)
        return self._read_json(paths["output"]), calls

    @staticmethod
    def _paths(directory: Path) -> dict[str, Path]:
        return {name: directory / f"{name}.json" for name in ("output", "missions", "registry", "state", "report", "overrides")}

    @staticmethod
    def _missions(*stations: tuple[str, str, bool]) -> dict:
        return {
            "countries": [{
                "countryCode": "AT",
                "label": "Austrija",
                "stations": [
                    {
                        "id": station_id,
                        "website": f"https://{host}",
                        "isResident": is_resident,
                        "embassy": f"Misija {station_id}",
                    }
                    for station_id, host, is_resident in stations
                ],
            }]
        }

    @staticmethod
    def _registry() -> list[dict[str, str]]:
        return [{"country": "Austrija", "url": "/spoljna-politika/bilateralna-saradnja/austrija/ambasade-konzulati"}]

    @staticmethod
    def _state(entries: dict[str, str]) -> dict:
        return {
            "schemaVersion": 1,
            "electionId": ELECTION_ID,
            "hostCursor": 0,
            "countryChains": {
                "AT": {
                    "indexUrl": INDEX_URL,
                    "countryUrl": COUNTRY_URL,
                    "missionEntries": [{"host": host, "url": url} for host, url in entries.items()],
                }
            },
        }

    @staticmethod
    def _html(value: str):
        return DISCOVERY.Response("", "text/html", value.encode("utf-8"))

    @staticmethod
    def _six_step_election_chain(host: str) -> dict[str, object]:
        base_url = f"https://{host}"
        return {
            f"{base_url}/" if depth == 0 else f"{base_url}/izbori-{depth}": ElectionIncrementalDiscoveryTests._html(
                "<main><p>Za parlamentarne izbore 2026 prijavu za glasanje pošaljite na izbori@alpha.example.</p></main>"
                if depth == 6
                else f'<main><a href="/izbori-{depth + 1}">Izbori 2026</a></main>'
            )
            for depth in range(7)
        }

    @staticmethod
    def _failure(reason: str):
        return DISCOVERY.Response("", "", b"", reason)

    @staticmethod
    def _coverage(report: dict, station_id: str) -> dict:
        return next(item for item in report["coverage"] if item["stationId"] == station_id)

    @staticmethod
    def _read_json(path: Path) -> dict:
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _write_json(path: Path, payload: object) -> None:
        path.write_text(json.dumps(payload), encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
