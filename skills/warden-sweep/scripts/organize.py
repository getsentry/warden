#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# ///
"""
Warden Sweep: Organize phase.

Identifies security findings, creates security indexes, labels security PRs,
updates finding reports with PR links, generates summary report, and
finalizes the manifest.

Usage:
    uv run organize.py <sweep-dir>

Stdout: JSON summary (for LLM consumption)
Stderr: Progress lines

Side effects:
    - Creates security/index.jsonl with security findings
    - Copies security finding .md files to security/
    - Creates "security" label on GitHub
    - Labels security PRs with "security"
    - Appends PR links to findings/*.md
    - Runs generate_report.py for summary.md and report.json
    - Updates manifest phases.organize to "complete"
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _utils import read_jsonl  # noqa: E402


SECURITY_SKILL_PATTERNS = [
    "security-review",
    "owasp-review",
    "security-audit",
]


def is_security_skill(skill_name: str) -> bool:
    """Check if a skill name indicates a security-related skill."""
    name_lower = skill_name.lower()
    if "security" in name_lower:
        return True
    return name_lower in SECURITY_SKILL_PATTERNS


def identify_security_findings(
    sweep_dir: str,
) -> list[dict[str, Any]]:
    """Find security-related verified findings and write security/index.jsonl."""
    verified = read_jsonl(os.path.join(sweep_dir, "data", "verified.jsonl"))

    security_findings: list[dict[str, Any]] = []
    for finding in verified:
        skill = finding.get("skill", "")
        if is_security_skill(skill):
            entry = {
                "findingId": finding.get("findingId", ""),
                "skill": skill,
                "severity": finding.get("severity", "info"),
                "file": finding.get("file", ""),
                "title": finding.get("title", ""),
            }
            security_findings.append(entry)

    # Write security index
    security_dir = os.path.join(sweep_dir, "security")
    os.makedirs(security_dir, exist_ok=True)
    index_path = os.path.join(security_dir, "index.jsonl")
    with open(index_path, "w") as f:
        for entry in security_findings:
            f.write(json.dumps(entry) + "\n")

    return security_findings


def copy_security_findings(
    sweep_dir: str, security_findings: list[dict[str, Any]]
) -> None:
    """Copy security finding .md files to security/ directory."""
    findings_dir = os.path.join(sweep_dir, "findings")
    security_dir = os.path.join(sweep_dir, "security")

    for finding in security_findings:
        fid = finding.get("findingId", "")
        src = os.path.join(findings_dir, f"{fid}.md")
        dst = os.path.join(security_dir, f"{fid}.md")
        if os.path.exists(src):
            shutil.copy2(src, dst)


def create_security_label() -> None:
    """Create the security label on GitHub (idempotent)."""
    try:
        subprocess.run(
            [
                "gh", "label", "create", "security",
                "--color", "D93F0B",
                "--description", "Security-related changes",
            ],
            capture_output=True,
            timeout=15,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass


def label_security_prs(
    sweep_dir: str, security_findings: list[dict[str, Any]]
) -> int:
    """Add "security" label to PRs for security findings. Returns count labeled."""
    patches = read_jsonl(os.path.join(sweep_dir, "data", "patches.jsonl"))
    security_ids = {f.get("findingId", "") for f in security_findings}

    labeled = 0
    for patch in patches:
        if patch.get("status") != "created":
            continue
        if patch.get("findingId", "") not in security_ids:
            continue

        pr_url = patch.get("prUrl", "")
        if not pr_url:
            continue

        try:
            result = subprocess.run(
                ["gh", "pr", "edit", pr_url, "--add-label", "security"],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode == 0:
                labeled += 1
            else:
                print(
                    f"Warning: Failed to label PR {pr_url}: {result.stderr.strip()}",
                    file=sys.stderr,
                )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print(
                f"Warning: Failed to label PR {pr_url}",
                file=sys.stderr,
            )

    return labeled


def update_findings_with_pr_links(sweep_dir: str) -> None:
    """Append PR links to findings/*.md for created PRs."""
    patches = read_jsonl(os.path.join(sweep_dir, "data", "patches.jsonl"))
    findings_dir = os.path.join(sweep_dir, "findings")

    for patch in patches:
        if patch.get("status") != "created":
            continue

        fid = patch.get("findingId", "")
        pr_url = patch.get("prUrl", "")
        branch = patch.get("branch", "")
        reviewers = patch.get("reviewers", [])

        if not fid or not pr_url:
            continue

        md_path = os.path.join(findings_dir, f"{fid}.md")
        if not os.path.exists(md_path):
            continue

        # Check if PR section already appended
        with open(md_path) as f:
            content = f.read()
        if "## Pull Request" in content:
            continue

        reviewers_str = ", ".join(reviewers) if reviewers else "none"
        pr_section = (
            f"\n\n## Pull Request\n"
            f"**PR**: {pr_url}\n"
            f"**Branch**: {branch}\n"
            f"**Reviewers**: {reviewers_str}\n"
        )

        with open(md_path, "a") as f:
            f.write(pr_section)


def run_generate_report(sweep_dir: str, script_dir: str) -> None:
    """Run generate_report.py as a subprocess."""
    report_script = os.path.join(script_dir, "generate_report.py")

    try:
        result = subprocess.run(
            [sys.executable, report_script, sweep_dir],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            print(
                f"Warning: generate_report.py failed: {result.stderr}",
                file=sys.stderr,
            )
    except Exception as e:
        print(f"Warning: generate_report.py failed: {e}", file=sys.stderr)


def update_manifest(sweep_dir: str) -> None:
    """Mark organize phase complete and add completedAt timestamp."""
    manifest_path = os.path.join(sweep_dir, "data", "manifest.json")
    if not os.path.exists(manifest_path):
        return

    with open(manifest_path) as f:
        manifest = json.load(f)

    manifest.setdefault("phases", {})["organize"] = "complete"
    manifest["completedAt"] = datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Warden Sweep: Organize phase"
    )
    parser.add_argument("sweep_dir", help="Path to the sweep directory")
    args = parser.parse_args()

    sweep_dir = args.sweep_dir

    if not os.path.isdir(sweep_dir):
        print(
            json.dumps({"error": f"Sweep directory not found: {sweep_dir}"}),
            file=sys.stdout,
        )
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Step 1: Identify security findings
    print("Identifying security findings...", file=sys.stderr)
    security_findings = identify_security_findings(sweep_dir)
    print(
        f"Found {len(security_findings)} security finding(s)",
        file=sys.stderr,
    )

    # Step 2: Label security PRs
    security_prs_labeled = 0
    if security_findings:
        print("Creating security label...", file=sys.stderr)
        create_security_label()
        print("Labeling security PRs...", file=sys.stderr)
        security_prs_labeled = label_security_prs(sweep_dir, security_findings)

    # Step 3: Update finding reports with PR links
    print("Updating finding reports with PR links...", file=sys.stderr)
    update_findings_with_pr_links(sweep_dir)

    # Step 4: Copy security finding reports (after PR links are added)
    copy_security_findings(sweep_dir, security_findings)

    # Step 5: Generate summary and report
    print("Generating summary and report...", file=sys.stderr)
    run_generate_report(sweep_dir, script_dir)

    # Step 6: Update manifest
    update_manifest(sweep_dir)

    # Gather stats for output
    scan_index = read_jsonl(os.path.join(sweep_dir, "data", "scan-index.jsonl"))
    verified = read_jsonl(os.path.join(sweep_dir, "data", "verified.jsonl"))
    rejected = read_jsonl(os.path.join(sweep_dir, "data", "rejected.jsonl"))
    patches = read_jsonl(os.path.join(sweep_dir, "data", "patches.jsonl"))

    files_scanned = sum(1 for e in scan_index if e.get("status") == "complete")
    prs_created = sum(1 for p in patches if p.get("status") == "created")

    summary_path = os.path.join(sweep_dir, "summary.md")
    report_path = os.path.join(sweep_dir, "data", "report.json")

    output = {
        "securityFindings": len(security_findings),
        "securityPRsLabeled": security_prs_labeled,
        "summaryPath": summary_path,
        "reportPath": report_path,
        "stats": {
            "filesScanned": files_scanned,
            "verified": len(verified),
            "rejected": len(rejected),
            "prsCreated": prs_created,
            "securityFindings": len(security_findings),
        },
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
