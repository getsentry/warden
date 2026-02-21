---
name: warden-sweep
description: Full-repository code sweep. Scans every file with warden, verifies findings via deep tracing, creates draft PRs for validated issues. Use when asked to "sweep the repo", "scan everything", "find all bugs", "full codebase review", "batch code analysis", or run warden across the entire repository.
---

# Warden Sweep

Full-repository code sweep: scan every file, verify findings with deep tracing, create draft PRs for validated issues.

**Requires**: `warden`, `gh`, `git`, `jq`, `uv`

**Important**: Run all scripts from the repository root using `${CLAUDE_SKILL_ROOT}`. Output goes to `.warden/sweeps/<run-id>/`.

## Bundled Scripts

### `scripts/extract_findings.py`

Parses warden JSONL log files and extracts normalized findings.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/extract_findings.py <log-path-or-directory> -o <output.jsonl>
```

### `scripts/generate_report.py`

Builds `summary.md` and `report.json` from sweep data.

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

## Workflow

### Phase 0: Setup

Generate a run ID and create the output directory:

```bash
RUN_ID="$(date +%s | sha256sum | head -c8)"
SWEEP_DIR=".warden/sweeps/${RUN_ID}"
mkdir -p "${SWEEP_DIR}/findings" "${SWEEP_DIR}/security" "${SWEEP_DIR}/data/verify"
```

Check dependencies:

```bash
for cmd in warden gh git jq python3; do
  command -v "$cmd" >/dev/null || { echo "Missing: $cmd"; exit 1; }
done
```

Write initial manifest:

```bash
cat > "${SWEEP_DIR}/data/manifest.json" <<MANIFEST
{
  "runId": "${RUN_ID}",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "repo": "$(git remote get-url origin 2>/dev/null || basename $(pwd))",
  "phases": {
    "scan": "pending",
    "verify": "pending",
    "patch": "pending",
    "organize": "pending"
  }
}
MANIFEST
```

---

### Phase 1: Scan

Scan every tracked file with warden.

**Step 1: Enumerate files**

```bash
git ls-files | grep -E '\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|c|cpp|h|hpp|cs|swift|kt|scala|sh|bash|zsh)$' > /tmp/sweep-files.txt
```

Filter out paths matching `ignorePaths` from `warden.toml` if present.

**Step 2: Scan each file**

For each file in the list, run warden:

```bash
warden "$file" --json --log --min-confidence off --quiet 2>/dev/null
```

- `--json` outputs JSONL to stdout
- `--log` forces non-TTY mode (writes log to `.warden/logs/`)
- `--min-confidence off` captures all findings; filtering happens in verify
- `--quiet` suppresses progress output

Capture the JSONL stdout and the log path from stderr/filesystem.

**Step 3: Track progress**

After each file, append to `data/scan-index.jsonl`:

```json
{"file": "src/foo.ts", "logPath": ".warden/logs/...", "skills": ["notseer"], "findingCount": 3, "status": "complete", "exitCode": 0}
```

On error:
```json
{"file": "src/bar.ts", "status": "error", "error": "timeout", "exitCode": 1}
```

**Step 4: Extract findings**

After scanning completes, run:

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/extract_findings.py .warden/logs/ \
  --scan-index "${SWEEP_DIR}/data/scan-index.jsonl" \
  -o "${SWEEP_DIR}/data/all-findings.jsonl"
```

This reads each warden JSONL log referenced in scan-index, extracts individual findings, assigns stable IDs (`<skill>-<sha8(title+path+line)>`), and writes one finding per line.

**Incrementality**: On resume, read `data/scan-index.jsonl` to get completed files. Skip files already indexed with `status: "complete"`.

Update manifest: set `phases.scan` to `"complete"`.

---

### Phase 2: Verify

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

---

### Phase 3: Patch

For each verified finding, create a worktree, fix the code, and open a draft PR.

**For each finding in `data/verified.jsonl`:**

Check if finding ID already exists in `data/patches.jsonl` (incrementality). If it does, skip.

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

REVIEWERS=""
# If find_reviewers.py returned reviewers, build the flags
# e.g., REVIEWERS="--reviewer user1 --reviewer user2"

gh pr create --draft \
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
{"findingId": "...", "prUrl": "https://...", "branch": "...", "reviewers": ["user1", "user2"], "filesChanged": ["..."], "status": "created"}
```

Remove the worktree:
```bash
cd "$(git rev-parse --show-toplevel)"
git worktree remove "${WORKTREE}" --force
```

**Error handling**: On failure at any step, write to `data/patches.jsonl` with `"status": "error"` and `"error": "..."`, clean up the worktree, and continue to the next finding.

Update manifest: set `phases.patch` to `"complete"`.

---

### Phase 4: Organize

Tag security findings, generate reports, and finalize the sweep.

**Step 1: Identify security findings**

Security-related skills (match by skill name):
- `security-review`
- `owasp-review`
- `security-audit`
- Any skill name containing `security`

Read `data/verified.jsonl`. For each finding whose `skill` matches a security skill, write to `security/index.jsonl`:

```json
{"findingId": "...", "skill": "security-review", "severity": "high", "file": "...", "title": "..."}
```

**Step 2: Copy security finding reports**

For each entry in `security/index.jsonl`, copy `findings/<id>.md` to `security/<id>.md`.

**Step 3: Label security PRs**

For each security finding that has a PR in `data/patches.jsonl`:

```bash
gh pr edit "${PR_URL}" --add-label "security"
```

If the label doesn't exist, create it first:
```bash
gh label create security --color D93F0B --description "Security-related changes" 2>/dev/null || true
```

**Step 4: Update finding reports with PR links**

For each entry in `data/patches.jsonl` with status `"created"`, append to the corresponding `findings/<id>.md`:

```markdown

## Pull Request
**PR**: ${PR_URL}
**Branch**: ${BRANCH}
**Reviewers**: ${REVIEWERS}
```

**Step 5: Generate summary and report**

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/generate_report.py "${SWEEP_DIR}"
```

This produces:
- `summary.md` in the sweep directory root
- `data/report.json` with machine-readable results

Update manifest: set `phases.organize` to `"complete"` and add `completedAt` timestamp.

---

## Running the Sweep

Execute each phase in order. The skill is designed for sequential execution with pause/resume support.

```bash
# Full sweep
# Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4

# Or resume from where you left off (same RUN_ID)
# Check manifest.json to see which phases are complete
```

After completion, browse results:

```bash
# Quick overview
cat .warden/sweeps/${RUN_ID}/summary.md

# All verified findings
ls .warden/sweeps/${RUN_ID}/findings/

# Security-specific
ls .warden/sweeps/${RUN_ID}/security/

# Machine-readable
cat .warden/sweeps/${RUN_ID}/data/report.json
```

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
    report.json                     # Machine-readable summary
    verify/                         # Individual verification results
      <finding-id>.json
```
