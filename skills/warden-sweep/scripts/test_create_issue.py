#!/usr/bin/env python3
"""End-to-end test for create_issue.py.

Runs the script as a subprocess against a sweep directory on disk, with a
fake `gh` on PATH that records the issue body instead of calling GitHub.
Temp files are removed when the test exits.

Run: python3 skills/warden-sweep/scripts/test_create_issue.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
CREATE_ISSUE = os.path.join(SCRIPTS_DIR, "create_issue.py")

FAKE_GH = f"""#!{sys.executable}
import json
import os
import sys

args = sys.argv[1:]
if args[:2] == ["label", "create"]:
    sys.exit(0)
if args[:2] == ["issue", "create"]:
    with open(os.environ["FAKE_GH_LOG"], "w") as f:
        json.dump({{
            "title": args[args.index("--title") + 1],
            "body": args[args.index("--body") + 1],
        }}, f)
    print("https://github.com/example/repo/issues/42")
    sys.exit(0)
sys.exit(2)
"""


def write_jsonl(path: str, rows: list[dict]) -> None:
    with open(path, "w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


class CreateIssueEndToEnd(unittest.TestCase):
    def test_verified_rows_show_severity_skill_location_and_title(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            sweep_dir = os.path.join(tmp, "sweep")
            data_dir = os.path.join(sweep_dir, "data")
            os.makedirs(data_dir)
            bin_dir = os.path.join(tmp, "bin")
            os.makedirs(bin_dir)
            gh_path = os.path.join(bin_dir, "gh")
            log_path = os.path.join(tmp, "gh-issue.json")

            with open(gh_path, "w") as f:
                f.write(FAKE_GH)
            os.chmod(gh_path, 0o755)

            with open(os.path.join(data_dir, "manifest.json"), "w") as f:
                json.dump({"runId": "run-1"}, f)
            write_jsonl(
                os.path.join(data_dir, "scan-index.jsonl"),
                [{"status": "complete", "skills": ["security-review"]}],
            )
            # Full finding data, as extract_findings.py writes it.
            write_jsonl(
                os.path.join(data_dir, "all-findings.jsonl"),
                [{
                    "findingId": "sentry-security-83c8eadd",
                    "file": "src/auth.ts",
                    "skill": "security-review",
                    "severity": "high",
                    "title": "Missing authz check on workflow connect",
                    "location": {"path": "src/auth.ts", "startLine": 12, "endLine": 14},
                }],
            )
            # Verdict-only data, as the verify phase writes it.
            write_jsonl(
                os.path.join(data_dir, "verified.jsonl"),
                [{
                    "findingId": "sentry-security-83c8eadd",
                    "verdict": "verified",
                    "confidence": "high",
                }],
            )
            write_jsonl(os.path.join(data_dir, "rejected.jsonl"), [])

            env = dict(os.environ)
            env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
            env["FAKE_GH_LOG"] = log_path

            result = subprocess.run(
                [sys.executable, CREATE_ISSUE, sweep_dir],
                capture_output=True,
                text=True,
                env=env,
                timeout=60,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["issueNumber"], 42)
            with open(log_path) as f:
                body = json.load(f)["body"]

            self.assertIn(
                "| **HIGH** | security-review | `src/auth.ts:12` | "
                "Missing authz check on workflow connect |",
                body,
            )
            self.assertNotIn("| info |  | `` |  |", body)


if __name__ == "__main__":
    unittest.main()
