"""End-to-end tests for organize.py.

Each test writes a warden log, runs the real extract_findings.py on it, lays
out a sweep directory from the extractor's output with verify-agent style
verified entries, then runs organize.py as a subprocess. A stub `gh` on PATH
records the tracking issue comment it would post.
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
ORGANIZE = SCRIPTS_DIR / "organize.py"
EXTRACT_FINDINGS = SCRIPTS_DIR / "extract_findings.py"

FAKE_GH = """#!{python}
import json, os, sys
args = sys.argv[1:]
if args[:2] == ["issue", "comment"]:
    with open(os.environ["FAKE_GH_LOG"], "w") as f:
        json.dump(args, f)
"""


def run_organize(skill: str, findings: list[dict], verified_titles: list[str]) -> dict:
    """Run organize.py on a sweep built from real extractor output.

    Each title in `verified_titles` becomes a verified entry carrying only the
    fields a verify agent returns, with the findingId the extractor assigned.
    Every verified finding gets a created PR.
    """
    with tempfile.TemporaryDirectory() as tmp:
        sweep = os.path.join(tmp, "sweep")
        data_dir = os.path.join(sweep, "data")
        os.makedirs(data_dir)
        os.makedirs(os.path.join(sweep, "findings"))
        bin_dir = os.path.join(tmp, "bin")
        os.makedirs(bin_dir)

        log_path = os.path.join(tmp, "warden.jsonl")
        with open(log_path, "w") as f:
            f.write(json.dumps({"skill": skill, "run": {"runId": "r1"}, "findings": findings}) + "\n")
            f.write(json.dumps({"type": "summary"}) + "\n")

        all_path = os.path.join(data_dir, "all-findings.jsonl")
        subprocess.run(
            [sys.executable, "-B", str(EXTRACT_FINDINGS), log_path, "-o", all_path],
            check=True, capture_output=True, text=True,
        )
        with open(all_path) as f:
            id_by_title = {e["title"]: e["findingId"] for e in map(json.loads, filter(str.strip, f))}

        verified = [
            {"findingId": id_by_title[t], "verdict": "verified", "confidence": "high", "reasoning": "r"}
            for t in verified_titles
        ]
        with open(os.path.join(data_dir, "verified.jsonl"), "w") as f:
            f.writelines(json.dumps(v) + "\n" for v in verified)
        with open(os.path.join(data_dir, "patches.jsonl"), "w") as f:
            f.writelines(
                json.dumps({
                    "findingId": v["findingId"],
                    "status": "created",
                    "prUrl": f"https://github.com/getsentry/warden/pull/{100 + i}",
                }) + "\n"
                for i, v in enumerate(verified)
            )
        for name in ("rejected.jsonl", "scan-index.jsonl"):
            open(os.path.join(data_dir, name), "w").close()
        with open(os.path.join(data_dir, "manifest.json"), "w") as f:
            json.dump({"runId": "r1", "issueUrl": "https://github.com/getsentry/warden/issues/999"}, f)

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
            [sys.executable, "-B", str(ORGANIZE), sweep],
            env=env, capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise AssertionError(f"organize.py failed: {result.stderr}")

        with open(os.path.join(sweep, "security", "index.jsonl")) as f:
            index = [json.loads(line) for line in f if line.strip()]
        comment = ""
        if os.path.exists(gh_log):
            with open(gh_log) as f:
                args = json.load(f)
            comment = args[args.index("--body") + 1]

        return {"output": json.loads(result.stdout), "index": index, "comment": comment}


class OrganizeEndToEndTest(unittest.TestCase):
    def test_security_index_takes_fields_from_extractor_record(self) -> None:
        out = run_organize(
            skill="sentry-security",
            findings=[
                {"title": "SQL injection", "severity": "high", "location": {"path": "src/a.ts", "startLine": 3}},
                {"title": "Not verified", "severity": "low", "location": {"path": "src/b.ts", "startLine": 9}},
            ],
            verified_titles=["SQL injection"],
        )

        self.assertEqual(out["output"]["securityFindings"], 1)
        self.assertEqual(len(out["index"]), 1)
        entry = out["index"][0]
        self.assertEqual(
            {k: entry[k] for k in ("skill", "severity", "file", "title")},
            {"skill": "sentry-security", "severity": "high", "file": "src/a.ts", "title": "SQL injection"},
        )
        self.assertIn("- [ ] #100 - fix: SQL injection (**HIGH**)", out["comment"])
        self.assertIn("### Security Findings", out["comment"])

    def test_non_security_skill_stays_out_of_index(self) -> None:
        out = run_organize(
            skill="code-review",
            findings=[{"title": "Off by one", "severity": "medium", "location": {"path": "c.py", "startLine": 1}}],
            verified_titles=["Off by one"],
        )

        self.assertEqual(out["index"], [])
        self.assertIn("- [ ] #100 - fix: Off by one (MEDIUM)", out["comment"])
        self.assertNotIn("### Security Findings", out["comment"])


if __name__ == "__main__":
    unittest.main()
