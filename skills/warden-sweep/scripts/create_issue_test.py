"""End-to-end tests for create_issue.py.

Each test writes a warden log, runs the real extract_findings.py on it, lays
out a sweep directory from the extractor's output, then runs create_issue.py
as a subprocess. A stub `gh` on PATH records the issue it would create.
"""
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS_DIR = Path(__file__).resolve().parent
CREATE_ISSUE = SCRIPTS_DIR / "create_issue.py"
EXTRACT_FINDINGS = SCRIPTS_DIR / "extract_findings.py"

FAKE_GH = """#!{python}
import json, os, sys
args = sys.argv[1:]
if args[:2] == ["issue", "create"]:
    with open(os.environ["FAKE_GH_LOG"], "w") as f:
        json.dump(args, f)
    print("https://github.com/getsentry/warden/issues/999")
"""


def run_sweep(findings: list[dict], verified: list[dict]) -> dict:
    """Run create_issue.py on a sweep built from real extractor output.

    `findings` are raw warden finding objects (location nested as the agent writes them).
    A verified entry may carry `"matchTitle"` instead of `findingId`; it is replaced by
    the findingId the extractor assigned to the finding with that title.
    """
    with tempfile.TemporaryDirectory() as tmp:
        data_dir = os.path.join(tmp, "sweep", "data")
        os.makedirs(data_dir)
        bin_dir = os.path.join(tmp, "bin")
        os.makedirs(bin_dir)

        log_path = os.path.join(tmp, "warden.jsonl")
        with open(log_path, "w") as f:
            f.write(json.dumps({
                "skill": "sentry-security",
                "run": {"runId": "r1"},
                "findings": findings,
            }) + "\n")
            f.write(json.dumps({"type": "summary"}) + "\n")

        all_path = os.path.join(data_dir, "all-findings.jsonl")
        subprocess.run(
            [sys.executable, "-B", str(EXTRACT_FINDINGS), log_path, "-o", all_path],
            check=True, capture_output=True, text=True,
        )
        with open(all_path) as f:
            extracted = [json.loads(line) for line in f if line.strip()]
        id_by_title = {e["title"]: e["findingId"] for e in extracted}

        verified_rows = []
        for v in verified:
            v = dict(v)
            if "matchTitle" in v:
                v["findingId"] = id_by_title[v.pop("matchTitle")]
            verified_rows.append(v)

        with open(os.path.join(tmp, "sweep", "data", "manifest.json"), "w") as f:
            json.dump({"runId": "r1"}, f)
        with open(os.path.join(data_dir, "scan-index.jsonl"), "w") as f:
            f.write(json.dumps({"status": "complete", "skills": ["sentry-security"]}) + "\n")
        with open(os.path.join(data_dir, "verified.jsonl"), "w") as f:
            f.writelines(json.dumps(v) + "\n" for v in verified_rows)
        open(os.path.join(data_dir, "rejected.jsonl"), "w").close()

        gh_path = os.path.join(bin_dir, "gh")
        with open(gh_path, "w") as f:
            f.write(FAKE_GH.format(python=sys.executable))
        os.chmod(gh_path, os.stat(gh_path).st_mode | stat.S_IXUSR)

        gh_log = os.path.join(tmp, "gh-args.json")
        env = {
            **os.environ,
            "PATH": bin_dir + os.pathsep + os.environ.get("PATH", ""),
            "FAKE_GH_LOG": gh_log,
        }
        result = subprocess.run(
            [sys.executable, "-B", str(CREATE_ISSUE), os.path.join(tmp, "sweep")],
            env=env, capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise AssertionError(f"create_issue.py failed: {result.stderr}")

        with open(gh_log) as f:
            args = json.load(f)
        with open(os.path.join(data_dir, "manifest.json")) as f:
            manifest = json.load(f)

        return {
            "title": args[args.index("--title") + 1],
            "body": args[args.index("--body") + 1],
            "issueUrl": manifest.get("issueUrl"),
        }


class CreateIssueEndToEndTest(unittest.TestCase):
    def test_verified_row_shows_file_and_line_from_extractor_record(self) -> None:
        out = run_sweep(
            findings=[
                {
                    "title": "SQL injection",
                    "severity": "high",
                    "confidence": "high",
                    "location": {"path": "src/a.ts", "startLine": 3, "endLine": 5},
                },
                {
                    "title": "Not verified",
                    "severity": "low",
                    "location": {"path": "src/b.ts", "startLine": 9},
                },
            ],
            verified=[{"matchTitle": "SQL injection", "verdict": "verified", "confidence": "high"}],
        )

        self.assertIn("| **HIGH** | sentry-security | `src/a.ts:3` | SQL injection |", out["body"])
        self.assertNotIn("Not verified", out["body"])
        self.assertEqual(out["title"], "Warden Sweep r1: 1 findings across 1 files")
        self.assertEqual(out["issueUrl"], "https://github.com/getsentry/warden/issues/999")

    def test_unmatched_verified_entry_keeps_its_row(self) -> None:
        out = run_sweep(
            findings=[{"title": "Unrelated", "severity": "low", "location": {"path": "c.py", "startLine": 1}}],
            verified=[{"findingId": "missing", "verdict": "verified"}],
        )

        self.assertIn("| Verified | 1 |", out["body"])
        self.assertIn("| info |  | `` |  |", out["body"])

    def test_verified_fields_override_all_findings(self) -> None:
        out = run_sweep(
            findings=[{"title": "old", "severity": "low", "location": {"path": "a.py", "startLine": 1}}],
            verified=[{
                "matchTitle": "old", "verdict": "verified", "severity": "medium",
                "skill": "s2", "file": "b.py", "startLine": 7, "title": "t2",
            }],
        )

        self.assertIn("| MEDIUM | s2 | `b.py:7` | t2 |", out["body"])


if __name__ == "__main__":
    unittest.main()
