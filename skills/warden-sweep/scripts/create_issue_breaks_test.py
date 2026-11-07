#!/usr/bin/env python3
"""End-to-end test for create_issue.py.

Runs the script as a subprocess against a sweep directory on disk, with a
fake `gh` on PATH that records the issue body instead of calling GitHub.
Temp files are removed when the test exits.

Run: python3 skills/warden-sweep/scripts/create_issue_breaks_test.py
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from typing import Any

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

FINDING_ID = "sentry-security-83c8eadd"

# Full finding data, as extract_findings.py writes it.
FINDING: dict[str, Any] = {
    "findingId": FINDING_ID,
    "file": "src/auth.ts",
    "skill": "security-review",
    "severity": "high",
    "title": "Missing authz check on workflow connect",
    "location": {"path": "src/auth.ts", "startLine": 12, "endLine": 14},
}

# Verdict-only data, as the verify phase writes it.
VERIFIED: dict[str, Any] = {
    "findingId": FINDING_ID,
    "verdict": "verified",
    "confidence": "high",
}

VERIFIED_HEADER = "| Severity | Skill | File | Title |"


def write_jsonl(path: str, rows: list[Any]) -> None:
    with open(path, "w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def verified_rows(body: str) -> list[str]:
    """Return the data rows of the Verified Findings table."""
    lines = body.splitlines()
    start = lines.index(VERIFIED_HEADER) + 2
    rows: list[str] = []
    for line in lines[start:]:
        if not line.startswith("|"):
            break
        rows.append(line)
    return rows


def unescaped_pipes(row: str) -> int:
    return len(re.findall(r"(?<!\\)\|", row))


class CreateIssueEndToEnd(unittest.TestCase):
    def run_sweep(
        self,
        all_findings: list[Any],
        verified: list[Any],
    ) -> tuple[subprocess.CompletedProcess[str], str | None]:
        """Run create_issue.py on a fresh sweep dir.

        Returns the process result and the issue body, or None when gh was
        never called (the script stopped before posting).
        """
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
            write_jsonl(os.path.join(data_dir, "all-findings.jsonl"), all_findings)
            write_jsonl(os.path.join(data_dir, "verified.jsonl"), verified)
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

            body = None
            if os.path.exists(log_path):
                with open(log_path) as f:
                    body = json.load(f)["body"]
            return result, body

    def assert_posted_rows(self, all_findings: list[Any], verified: list[Any], expected: list[str]) -> str:
        result, body = self.run_sweep(all_findings, verified)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(body, "gh issue create was never called")
        assert body is not None
        self.assertEqual(verified_rows(body), expected)
        return body

    def test_verified_rows_show_severity_skill_location_and_title(self) -> None:
        result, body = self.run_sweep([FINDING], [VERIFIED])

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["issueNumber"], 42)
        assert body is not None
        self.assertIn(
            "| **HIGH** | security-review | `src/auth.ts:12` | "
            "Missing authz check on workflow connect |",
            body,
        )
        self.assertNotIn("| info |  | `` |  |", body)

    def test_pipe_in_title_does_not_add_a_table_cell(self) -> None:
        finding = {**FINDING, "title": "Bad | title"}
        body = self.assert_posted_rows(
            [finding],
            [VERIFIED],
            ["| **HIGH** | security-review | `src/auth.ts:12` | Bad \\| title |"],
        )
        self.assertEqual(unescaped_pipes(verified_rows(body)[0]), 5)

    def test_pipe_in_skill_does_not_add_a_table_cell(self) -> None:
        finding = {**FINDING, "skill": "sec|skill"}
        self.assert_posted_rows(
            [finding],
            [VERIFIED],
            ["| **HIGH** | sec\\|skill | `src/auth.ts:12` | Missing authz check on workflow connect |"],
        )

    def test_forged_row_in_title_stays_inside_its_cell(self) -> None:
        finding = {
            **FINDING,
            "title": "x | **CRITICAL** | forged | `src/evil.ts:1` | Forged finding",
        }
        self.assert_posted_rows(
            [finding],
            [VERIFIED],
            [
                "| **HIGH** | security-review | `src/auth.ts:12` | "
                "x \\| **CRITICAL** \\| forged \\| `src/evil.ts:1` \\| Forged finding |"
            ],
        )

    def test_newline_in_title_keeps_row_on_one_line(self) -> None:
        finding = {**FINDING, "title": "First line\nsecond line"}
        self.assert_posted_rows(
            [finding],
            [VERIFIED],
            ["| **HIGH** | security-review | `src/auth.ts:12` | First line second line |"],
        )

    def test_non_object_location_is_treated_as_missing(self) -> None:
        for location in ["src/auth.ts:12", ["src/auth.ts", 12]]:
            with self.subTest(location=location):
                finding = {**FINDING, "location": location}
                self.assert_posted_rows(
                    [finding],
                    [VERIFIED],
                    ["| **HIGH** | security-review | `src/auth.ts` | Missing authz check on workflow connect |"],
                )

    def test_unhashable_finding_id_does_not_crash_or_borrow_details(self) -> None:
        other_finding = {**FINDING, "findingId": ["not", "a", "string"]}
        other_verified = {"findingId": ["not", "a", "string"], "verdict": "verified", "confidence": "low"}
        self.assert_posted_rows(
            [FINDING, other_finding],
            [VERIFIED, other_verified],
            [
                "| **HIGH** | security-review | `src/auth.ts:12` | Missing authz check on workflow connect |",
                "| info |  | `` |  |",
            ],
        )

    def test_duplicate_finding_id_with_conflicting_details_fails_before_posting(self) -> None:
        second = {**FINDING, "severity": "low", "title": "Other title", "location": {"path": "src/b.ts", "startLine": 2}}
        for order in ([FINDING, second], [second, FINDING]):
            with self.subTest(first=order[0]["title"]):
                result, body = self.run_sweep(order, [VERIFIED])
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("duplicate findingId", result.stderr)
                self.assertIsNone(body)

    def test_null_display_fields_in_verified_fall_back_to_finding(self) -> None:
        verified = {
            **VERIFIED,
            "severity": None,
            "file": "",
            "title": None,
        }
        self.assert_posted_rows(
            [FINDING],
            [verified],
            ["| **HIGH** | security-review | `src/auth.ts:12` | Missing authz check on workflow connect |"],
        )


if __name__ == "__main__":
    unittest.main()
