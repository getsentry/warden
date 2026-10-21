import importlib.util
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("create_issue.py")
SPEC = importlib.util.spec_from_file_location("create_issue", SCRIPT_PATH)
assert SPEC is not None
create_issue = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(create_issue)


class BuildIssueBodyTest(unittest.TestCase):
    def test_verified_rows_use_details_from_all_findings(self) -> None:
        all_findings = [
            {
                "findingId": "sec-1",
                "severity": "high",
                "skill": "sentry-security",
                "file": "src/a.ts",
                "title": "SQL injection",
                "startLine": 3,
            },
            {
                "findingId": "sec-2",
                "severity": "low",
                "skill": "sentry-security",
                "file": "src/b.ts",
                "title": "Not verified",
            },
        ]
        verified = [{"findingId": "sec-1", "verdict": "verified", "confidence": "high"}]

        body = create_issue.build_issue_body("r1", [], all_findings, verified, [])

        self.assertIn("| **HIGH** | sentry-security | `src/a.ts:3` | SQL injection |", body)
        self.assertNotIn("Not verified", body)

    def test_unmatched_verified_entry_keeps_its_row(self) -> None:
        verified = [{"findingId": "missing", "verdict": "verified"}]

        body = create_issue.build_issue_body("r1", [], [], verified, [])

        self.assertIn("| Verified | 1 |", body)
        self.assertIn("| info |  | `` |  |", body)

    def test_full_verified_entry_wins_over_all_findings(self) -> None:
        all_findings = [{"findingId": "x", "severity": "low", "title": "old"}]
        verified = [
            {"findingId": "x", "severity": "medium", "skill": "s2", "file": "b.py",
             "title": "t2", "startLine": 7, "verdict": "verified"}
        ]

        body = create_issue.build_issue_body("r1", [], all_findings, verified, [])

        self.assertIn("| MEDIUM | s2 | `b.py:7` | t2 |", body)


if __name__ == "__main__":
    unittest.main()
