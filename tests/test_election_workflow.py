#!/usr/bin/env python3
"""Regression coverage for workflow ownership, station scope, and fail-closed phases."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNNER_PATH = ROOT / "scripts" / "run_election_contacts.py"
SPEC = importlib.util.spec_from_file_location("election_workflow_runner", RUNNER_PATH)
assert SPEC is not None and SPEC.loader is not None
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class ElectionWorkflowTests(unittest.TestCase):
    # A competing process must not enter the workflow while the first owner can still write its artifacts.
    def test_competing_owner_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            lock_path = Path(temporary_directory) / ".election_contacts.lock"
            owner = runner.acquire_lock(lock_path)
            try:
                contender = subprocess.run(
                    [
                        sys.executable,
                        "-c",
                        (
                            "import importlib.util, sys; from pathlib import Path; "
                            f"spec=importlib.util.spec_from_file_location('runner', {str(RUNNER_PATH)!r}); "
                            "module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); "
                            "\ntry:\n module.acquire_lock(Path(sys.argv[1]))\nexcept module.RunnerError:\n raise SystemExit(0)\nraise SystemExit(1)"
                        ),
                        str(lock_path),
                    ],
                    check=False,
                )
                self.assertEqual(contender.returncode, 0)
            finally:
                owner.close()

    def test_merge_reviews_rejects_conflicting_immutable_id(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            durable = directory / "durable.json"
            reviewed = directory / "reviewed.json"
            original = self._review_document({"reviewId": "immutable-id", "decision": "accept"})
            conflict = self._review_document({"reviewId": "immutable-id", "decision": "needs_review"})
            durable.write_text(json.dumps(original), encoding="utf-8")
            reviewed.write_text(json.dumps(conflict), encoding="utf-8")

            with self.assertRaisesRegex(runner.RunnerError, "Conflicting immutable reviewId immutable-id"):
                runner.merge_reviews(durable, reviewed)

            self.assertEqual(json.loads(durable.read_text(encoding="utf-8")), original)

    def test_merge_reviews_rejects_stale_document_binding(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            durable = directory / "durable.json"
            reviewed = directory / "reviewed.json"
            durable.write_text(
                json.dumps(self._review_document({"reviewId": "old"}, policy_digest="old-policy")),
                encoding="utf-8",
            )
            reviewed.write_text(json.dumps(self._review_document({"reviewId": "new"})), encoding="utf-8")
            with self.assertRaisesRegex(runner.RunnerError, "different bindings"):
                runner.merge_reviews(durable, reviewed)

    def test_worklist_uses_only_current_pending_groups(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            candidates = Path(temporary_directory) / "candidates.json"
            candidates.write_text(
                json.dumps(
                    {
                        "pendingStationIds": ["current-station", "current-station"],
                        "candidates": [
                            {"stationId": "current-station", "sourceId": "current-source"},
                            {"stationId": "legacy-station", "email": "legacy@example.test"},
                            {"stationId": "no-site-station", "sourceId": "unusable-source"},
                        ],
                    }
                ),
                encoding="utf-8",
            )

            self.assertEqual(runner.print_worklist(candidates), ["current-station"])

    # A station request is a hard boundary: every downstream phase receives only that station.
    def test_station_scope_never_reviews_or_applies_other_pending_groups(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            scripts = root / "scripts"
            data = root / "data"
            scripts.mkdir()
            data.mkdir()
            input_reviews = root / "actual-reviews.json"
            input_reviews.write_text("{}", encoding="utf-8")
            candidate_document = {
                "schemaVersion": 1,
                "electionId": "2026-parliamentary",
                "electionYear": "2026",
                "pendingStationIds": ["st-selected", "st-unrelated"],
                "candidates": [],
                "sources": {},
            }
            discovery_report = {"schemaVersion": 1}
            (scripts / "discover_election_contacts.py").write_text(
                "import json, sys\n"
                "from pathlib import Path\n"
                "args = sys.argv\n"
                "def option(name): return Path(args[args.index(name) + 1])\n"
                f"payload = {candidate_document!r}\n"
                f"report = {discovery_report!r}\n"
                "for path, value in ((option('--output'), payload), (option('--report'), report)):\n"
                " path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(value), encoding='utf-8')\n",
                encoding="utf-8",
            )
            review_document = self._review_document({"reviewId": "selected-review", "decision": "accept"})
            (scripts / "review_election_candidates.py").write_text(
                "import json, sys\n"
                "from pathlib import Path\n"
                "args = sys.argv\n"
                "Path('phase-log.jsonl').open('a', encoding='utf-8').write(json.dumps(['review', *args[1:]]) + '\\n')\n"
                f"Path(args[args.index('--output') + 1]).write_text(json.dumps({review_document!r}), encoding='utf-8')\n",
                encoding="utf-8",
            )
            (scripts / "promote_election_contacts.py").write_text(
                "import json, sys\n"
                "from pathlib import Path\n"
                "args = sys.argv\n"
                "Path('phase-log.jsonl').open('a', encoding='utf-8').write(json.dumps(['promote', *args[1:]]) + '\\n')\n"
                "if '--dry-run' in args:\n"
                " path = Path(args[args.index('--report') + 1]); path.write_text(json.dumps({'eligibleStationIds': ['st-selected', 'st-unrelated'], 'held': [], 'unchangedStationIds': []}), encoding='utf-8')\n",
                encoding="utf-8",
            )

            runner.run_workflow(
                runner.parse_args([
                    "--election-id", "2026-parliamentary",
                    "--station", "st-selected",
                    "--import-reviews", str(input_reviews),
                    "--attest-import",
                    "--apply",
                ]),
                root,
            )

            phases = [json.loads(line) for line in (root / "phase-log.jsonl").read_text(encoding="utf-8").splitlines()]
            self.assertEqual(len(phases), 3)
            for phase in phases:
                self.assertIn("--station", phase)
                station_ids = [phase[index + 1] for index, value in enumerate(phase[:-1]) if value == "--station"]
                self.assertEqual(station_ids, ["st-selected"])

    # Selecting a station with no pending work must not fall back to reviewing unrelated stations.
    def test_selected_station_without_pending_work_skips_global_review(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            scripts = root / "scripts"
            data = root / "data"
            scripts.mkdir()
            data.mkdir()
            candidate_document = {
                "schemaVersion": 1,
                "electionId": "2026-parliamentary",
                "electionYear": "2026",
                "pendingStationIds": ["st-unrelated"],
                "candidates": [{"stationId": "st-unrelated"}],
                "sources": {},
            }
            (scripts / "discover_election_contacts.py").write_text(
                "import json, sys\n"
                "from pathlib import Path\n"
                "args = sys.argv\n"
                f"payload = {candidate_document!r}\n"
                "for name in ('--output', '--report'):\n"
                " path = Path(args[args.index(name) + 1]); path.parent.mkdir(parents=True, exist_ok=True)\n"
                " path.write_text(json.dumps(payload), encoding='utf-8')\n",
                encoding="utf-8",
            )
            for name in ("review_election_candidates.py", "promote_election_contacts.py"):
                (scripts / name).write_text(
                    "from pathlib import Path\nPath('unexpected-phase').write_text('called')\n",
                    encoding="utf-8",
                )

            run_dir = runner.run_workflow(
                runner.parse_args(["--election-id", "2026-parliamentary", "--station", "st-selected"]),
                root,
            )

            self.assertFalse((root / "unexpected-phase").exists())
            self.assertEqual(
                json.loads((data / "election_candidates.json").read_text(encoding="utf-8")),
                candidate_document,
            )
            audit = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
            self.assertEqual([phase["name"] for phase in audit["phases"]], ["discovery"])
            self.assertEqual(audit["promotion"]["eligibleStationIds"], [])

    @staticmethod
    def _review_document(
        review: dict[str, str], *, policy_digest: str = "policy", as_of: str = "2026-09-11T00:00:00Z"
    ) -> dict[str, object]:
        return {
            "schemaVersion": 2,
            "asOf": as_of,
            "policyDigest": policy_digest,
            "canonicalDigest": "canonical",
            "reviews": [review],
        }

    # Discovery is the first trust boundary; a failure must prevent later review or promotion from running.
    def test_discovery_failure_stops_review_and_promotion(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            scripts = root / "scripts"
            scripts.mkdir()
            (root / "data").mkdir()
            (scripts / "discover_election_contacts.py").write_text("raise SystemExit(7)\n", encoding="utf-8")
            (scripts / "review_election_candidates.py").write_text(
                "from pathlib import Path\nPath('review-ran').write_text('unexpected')\n",
                encoding="utf-8",
            )
            (scripts / "promote_election_contacts.py").write_text(
                "from pathlib import Path\nPath('promotion-ran').write_text('unexpected')\n",
                encoding="utf-8",
            )

            with self.assertRaises(runner.RunnerError):
                runner.run_workflow(runner.parse_args(["--election-id", "2026-parliamentary"]), root)

            self.assertFalse((root / "review-ran").exists())
            self.assertFalse((root / "promotion-ran").exists())
            run_files = list((root / "data" / "election_runs").glob("*/run.json"))
            self.assertEqual(len(run_files), 1)
            audit = json.loads(run_files[0].read_text(encoding="utf-8"))
            self.assertEqual(audit["status"], "failed")
            self.assertEqual([phase["name"] for phase in audit["phases"]], ["discovery"])


if __name__ == "__main__":
    unittest.main()
