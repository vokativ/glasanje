"""Regression coverage for bounded, source-evidenced incremental discovery."""

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

    def _run(self, paths: dict[str, Path], *, responses: dict[str, object], station: str | None = None, max_hosts: int = 5, max_pages: int = 20) -> dict:
        result, _ = self._run_with_calls(
            paths, responses=responses, station=station, max_hosts=max_hosts, max_pages=max_pages
        )
        return result

    def _run_with_calls(
        self,
        paths: dict[str, Path],
        *,
        responses: dict[str, object],
        station: str | None = None,
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
        ]
        if station:
            argv.extend(("--station", station))
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
