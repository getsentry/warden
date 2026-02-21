---
name: warden-sweep
description: Full-repository code sweep. Scans every file with warden, verifies findings via deep tracing, creates draft PRs for validated issues. Use when asked to "sweep the repo", "scan everything", "find all bugs", "full codebase review", "batch code analysis", or run warden across the entire repository.
---

# Warden Sweep

Full-repository code sweep: scan every file, verify findings with deep tracing, create draft PRs for validated issues.

**Requires**: `warden`, `gh`, `git`, `jq`, `uv`

**Important**: Run all scripts from the repository root using `${CLAUDE_SKILL_ROOT}`. Output goes to `.warden/sweeps/<run-id>/`.

## Bundled Scripts

### `scripts/scan.py`

Runs setup and scan in one call: generates run ID, creates sweep dir, checks deps, creates `warden` label, enumerates files, runs warden per file, extracts findings.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/scan.py [file ...]
  --sweep-dir DIR     # Resume into existing sweep dir
```

### `scripts/index_prs.py`

Fetches open warden-labeled PRs, builds file-to-PR dedup index, caches diffs for overlapping PRs.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/index_prs.py <sweep-dir>
```

### `scripts/organize.py`

Tags security findings, labels security PRs, updates finding reports with PR links, generates summary report, finalizes manifest.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/organize.py <sweep-dir>
```

### `scripts/extract_findings.py`

Parses warden JSONL log files and extracts normalized findings. Called automatically by `scan.py`.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/extract_findings.py <log-path-or-directory> -o <output.jsonl>
```

### `scripts/generate_report.py`

Builds `summary.md` and `report.json` from sweep data. Called automatically by `organize.py`.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/generate_report.py <sweep-dir>
```

### `scripts/find_reviewers.py`

Finds top 2 git contributors for a file (last 12 months).

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/find_reviewers.py <file-path>
```

Returns JSON: `{"reviewers": ["user1", "user2"]}`

---

## Phase 1: Scan

**Run** (1 tool call):

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/scan.py
```

To resume a partial scan:

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/scan.py --sweep-dir .warden/sweeps/<run-id>
```

Parse the JSON stdout. Save `runId` and `sweepDir` for subsequent phases.

**Report** to user:

```
## Scan Complete

Scanned **{filesScanned}** files, **{filesErrored}** errors.

### Findings ({totalFindings} total)

| # | Severity | Skill | File | Title |
|---|----------|-------|------|-------|
| 1 | **HIGH** | security-review | `src/db/query.ts:42` | SQL injection in query builder |
...
```

Render every finding from the `findings` array. Bold severity for high and above.

**On failure**: If exit code 1, show the error JSON and stop. If exit code 2, show the partial results and note which files errored.

---

## Phase 2: Verify

Deep-trace each finding using Task subagents to qualify or disqualify.

**For each finding in `data/all-findings.jsonl`:**

Check if `data/verify/<finding-id>.json` already exists (incrementality). If it does, skip.

Launch a Task subagent (`subagent_type: "general-purpose"`) for each finding. Process findings sequentially (one at a time) to keep output organized.

**Task prompt for each finding:**

```
Verify a code analysis finding. Determine if this is a TRUE issue or a FALSE POSITIVE.
Do NOT write or edit any files. Research only.

## Finding
- Title: ${TITLE}
- Severity: ${SEVERITY} | Confidence: ${CONFIDENCE}
- Skill: ${SKILL}
- Location: ${FILE_PATH}:${START_LINE}-${END_LINE}
- Description: ${DESCRIPTION}
- Verification hint: ${VERIFICATION}

## Instructions
1. Read the file at the reported location. Examine at least 50 lines of surrounding context.
2. Trace data flow to/from the flagged code using Grep/Glob.
3. Check if the issue is mitigated elsewhere (guards, validation, try/catch upstream).
4. Check if the issue is actually reachable in practice.

Return your verdict as JSON:
{
  "findingId": "${FINDING_ID}",
  "verdict": "verified" or "rejected",
  "confidence": "high" or "medium" or "low",
  "reasoning": "2-3 sentence explanation",
  "traceNotes": "What code paths you examined"
}
```

**Process results:**

Parse the JSON from the subagent response and:
- Write result to `data/verify/<finding-id>.json`
- Append to `data/verified.jsonl` or `data/rejected.jsonl`
- For verified findings, generate `findings/<finding-id>.md`:

```markdown
# ${TITLE}

**ID**: ${FINDING_ID} | **Severity**: ${SEVERITY} | **Confidence**: ${CONFIDENCE}
**Skill**: ${SKILL} | **File**: ${FILE_PATH}:${START_LINE}

## Description
${DESCRIPTION}

## Verification
**Verdict**: Verified (${VERIFICATION_CONFIDENCE})
**Reasoning**: ${REASONING}
**Code trace**: ${TRACE_NOTES}

## Suggested Fix
${FIX_DESCRIPTION}
```diff
${FIX_DIFF}
```
```

Update manifest: set `phases.verify` to `"complete"`.

**Report** to user after all verifications:

```
## Verification Complete

**{verified}** verified, **{rejected}** rejected.

### Verified Findings

| # | Severity | Confidence | File | Title | Reasoning |
|---|----------|------------|------|-------|-----------|
| 1 | **HIGH** | high | `src/db/query.ts:42` | SQL injection in query builder | User input flows directly into... |
...

### Rejected ({rejected_count})

- `{findingId}` {file}: {reasoning}
...
```

---

## Phase 3: Patch

For each verified finding, create a worktree, fix the code, and open a draft PR.

**Step 0: Index existing PRs** (1 tool call):

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/index_prs.py ${SWEEP_DIR}
```

Parse the JSON stdout. Use `fileIndex` for dedup checks.

**For each finding in `data/verified.jsonl`:**

Check if finding ID already exists in `data/patches.jsonl` (incrementality). If it does, skip.

**Dedup check**: Use the file index from `index_prs.py` output to determine if an existing open PR already addresses the same issue.

1. **File match**: Look up the finding's file path in the `fileIndex`. If no PR touches that file, no conflict; proceed to Step 1.
2. **Chunk overlap**: If a PR does touch the same file, read its cached diff from `data/pr-diffs/<number>.diff` and check whether the PR's changed hunks overlap with the finding's line range (startLine-endLine). Overlapping or adjacent hunks (within ~10 lines) indicate the same code region.
3. **Same concern**: If the hunks overlap, compare the PR title and the finding title/description. Are they fixing the same kind of defect? A PR fixing an off-by-one error and a finding about a null check in the same function are different issues; both should proceed.

Skip the finding only when there is both chunk overlap AND the PR addresses the same concern. Record it in `data/patches.jsonl` with `"status": "existing"` and `"prUrl"` pointing to the matching PR, then continue to the next finding.

**Step 1: Create worktree**

```bash
BRANCH="warden-sweep/${RUN_ID}/${FINDING_ID}"
WORKTREE="${SWEEP_DIR}/worktrees/${FINDING_ID}"
git worktree add "${WORKTREE}" -b "${BRANCH}"
```

Each finding branches from the current HEAD to avoid merge conflicts between PRs.

**Step 2: Generate fix**

Launch a Task subagent (`subagent_type: "general-purpose"`) to apply the fix in the worktree:

```
Fix a verified code issue and add test coverage. You are working in a git worktree at: ${WORKTREE}

## Finding
- Title: ${TITLE}
- File: ${FILE_PATH}:${START_LINE}
- Description: ${DESCRIPTION}
- Verification: ${REASONING}
- Suggested Fix: ${FIX_DESCRIPTION}
```diff
${FIX_DIFF}
```

## Instructions
1. Read the file at the reported location (use the worktree path: ${WORKTREE}/${FILE_PATH}).
2. Apply the suggested fix. If the diff doesn't apply cleanly, adapt it while preserving intent.
3. Write or update tests that verify the fix:
   - Follow existing test patterns (co-located files, same framework)
   - At minimum, write a test that would have caught the original bug
4. Only modify the fix target and its test file.
5. Do NOT run tests locally. CI will validate the changes.
6. Stage and commit with this exact message:

fix: ${TITLE}

Warden finding ${FINDING_ID}
Severity: ${SEVERITY}

Co-Authored-By: Warden <noreply@getsentry.com>

Report what you changed: files modified, test files added/updated, any notes.
```

**Step 3: Find reviewers**

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/find_reviewers.py "${FILE_PATH}"
```

**Step 4: Create draft PR**

```bash
cd "${WORKTREE}"
git push -u origin "${BRANCH}"
```

Create the PR with a 1-2 sentence "What" summary based on the finding and fix, followed by the finding description and verification reasoning:

```bash
REVIEWERS=""
# If find_reviewers.py returned reviewers, build the flags
# e.g., REVIEWERS="--reviewer user1 --reviewer user2"

gh pr create --draft \
  --label "warden" \
  --title "fix: ${TITLE}" \
  --body "$(cat <<'EOF'
${FIX_WHAT_DESCRIPTION}

${DESCRIPTION}

${REASONING}

Automated fix for Warden finding ${FINDING_ID} (${SEVERITY}, detected by ${SKILL}).

> This PR was auto-generated by a Warden Sweep (run ${RUN_ID}).
> The finding has been validated through automated deep tracing,
> but human confirmation is requested as this is batch work.
EOF
)" ${REVIEWERS}
```

Save the PR URL.

**Step 5: Record and cleanup**

Append to `data/patches.jsonl`:
```json
{"findingId": "...", "prUrl": "https://...", "branch": "...", "reviewers": ["user1", "user2"], "filesChanged": ["..."], "status": "created|existing|error"}
```

Remove the worktree:
```bash
cd "$(git rev-parse --show-toplevel)"
git worktree remove "${WORKTREE}" --force
```

**Error handling**: On failure at any step, write to `data/patches.jsonl` with `"status": "error"` and `"error": "..."`, clean up the worktree, and continue to the next finding.

Update manifest: set `phases.patch` to `"complete"`.

**Report** to user after all patches:

```
## PRs Created

**{created}** created, **{skipped}** skipped (existing), **{failed}** failed.

| # | Finding | PR | Status |
|---|---------|-----|--------|
| 1 | `security-review-a1b2c3d4` SQL injection in query builder | #142 | created |
| 2 | `code-review-e5f6g7h8` Null pointer in handler | - | existing (#138) |
...
```

---

## Phase 4: Organize

**Run** (1 tool call):

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/organize.py ${SWEEP_DIR}
```

Parse the JSON stdout.

**Report** to user:

```
## Sweep Complete

| Metric | Count |
|--------|-------|
| Files scanned | {filesScanned} |
| Findings verified | {verified} |
| PRs created | {prsCreated} |
| Security findings | {securityFindings} |

Full report: `{summaryPath}`
```

**On failure**: Show the error and note which steps completed.

---

## Resuming a Sweep

Each phase is incremental. To resume from where you left off:

1. Check `data/manifest.json` to see which phases are complete
2. For scan: pass `--sweep-dir` to `scan.py`
3. For verify: existing `data/verify/<id>.json` files are skipped
4. For patch: existing entries in `data/patches.jsonl` are skipped
5. For organize: safe to re-run (idempotent)

## Output Directory Structure

```
.warden/sweeps/<run-id>/
  summary.md                        # Stats, key findings, PR links
  findings/                         # One markdown per verified finding
    <finding-id>.md
  security/                         # Security-specific view
    index.jsonl                     # Security findings index
    <finding-id>.md                 # Copies of security findings
  data/                             # Structured data for tooling
    manifest.json                   # Run metadata, phase state
    scan-index.jsonl                # Per-file scan tracking
    all-findings.jsonl              # Every finding from scan
    verified.jsonl                  # Findings that passed verification
    rejected.jsonl                  # Findings that failed verification
    patches.jsonl                   # Finding -> PR URL -> reviewers
    existing-prs.json               # Cached open warden PRs
    report.json                     # Machine-readable summary
    verify/                         # Individual verification results
      <finding-id>.json
    logs/                           # Warden JSONL logs per file
      <hash>.jsonl
    pr-diffs/                       # Cached PR diffs for dedup
      <number>.diff
```
