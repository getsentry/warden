# Reporters

Reference for Warden's output formats. Each reporter targets a different consumption context.

## TTY Reporter (Ink)

Interactive terminal output using Ink (React for CLIs). Renders to stderr during execution, stdout for the final report.

### Progress Phase (stderr)

```
SKILLS
⠴ security-review
  ⠴ src/api/auth.ts [1/3]
  ✓ src/utils/helpers.ts [2/2]  1.2s  $0.0018
  ✓ src/config/loader.ts [1/1]  ● 1 high  0.8s  $0.0012
⠏ code-quality
```

Completed files show: checkmark, filename, `[totalHunks/totalHunks]`, severity dots (if findings), duration (dimmed), cost (dimmed).

Running files show: spinner, filename, `[currentHunk/totalHunks]`.

### Skill Completion (stderr)

```
✓ security-review [4.2s]
✓ code-quality [2.1s]
```

### Report Phase (stdout)

Findings rendered as a structured report with severity badges, locations, and suggested fixes.

## Log Reporter (non-TTY)

Plain timestamped lines to stderr. Used in CI or piped output.

### Progress

```
[14:32:15] warden: Running security-review (3 files)...
[14:32:15] warden:   security-review > src/api/auth.ts [1/3] L10-45
[14:32:16] warden:   security-review > src/api/auth.ts [2/3] L50-80
[14:32:17] warden:   security-review > src/api/auth.ts done 1.8s $0.0024
[14:32:17] warden:   security-review > src/utils/helpers.ts [1/2] L1-30
[14:32:18] warden:   security-review > src/utils/helpers.ts done 1.2s $0.0018
[14:32:18] warden: security-review completed in 3.5s - 2 findings (1 high, 1 medium)
[14:32:18] warden:   [high] src/api/auth.ts:42: SQL injection risk
[14:32:18] warden:   [medium] src/utils/helpers.ts:15: Unsafe type assertion
```

Per-file completion lines include: duration, cost, finding count (if any).

### Report Phase (stdout)

Findings printed as plain text with severity tags and locations.

## JSONL Reporter

Machine-readable output. One JSON object per line.

### Skill Record

One line per skill with full findings and optional per-file breakdown:

```json
{
  "run": { "timestamp": "2026-01-29T14:32:15.123Z", "durationMs": 5000, "cwd": "/path/to/repo" },
  "skill": "security-review",
  "summary": "security-review: Found 2 issues (1 high, 1 medium)",
  "findings": [
    { "id": "SEC-001", "severity": "high", "title": "SQL injection risk", "description": "..." },
    { "id": "SEC-002", "severity": "medium", "title": "Unsafe type assertion", "description": "..." }
  ],
  "durationMs": 3500,
  "usage": { "inputTokens": 5000, "outputTokens": 800, "costUSD": 0.0048 },
  "files": [
    { "filename": "src/api/auth.ts", "findings": 1, "durationMs": 1800, "usage": { "inputTokens": 3000, "outputTokens": 500, "costUSD": 0.0030 } },
    { "filename": "src/utils/helpers.ts", "findings": 1, "durationMs": 1200, "usage": { "inputTokens": 2000, "outputTokens": 300, "costUSD": 0.0018 } }
  ]
}
```

### Summary Record

Final line with aggregate stats:

```json
{
  "run": { "timestamp": "2026-01-29T14:32:15.123Z", "durationMs": 5000, "cwd": "/path/to/repo" },
  "type": "summary",
  "totalFindings": 2,
  "bySeverity": { "critical": 0, "high": 1, "medium": 1, "low": 0, "info": 0 },
  "usage": { "inputTokens": 5000, "outputTokens": 800, "costUSD": 0.0048 },
  "auxiliaryUsage": { "extraction": { "inputTokens": 200, "outputTokens": 50, "costUSD": 0.0003 } }
}
```

`auxiliaryUsage` is present only when auxiliary LLM calls (e.g. findings extraction) occurred. Omitted when there are none.

### Output Location

- Explicit: `--output path/to/file.jsonl`
- Automatic: `~/.local/warden/runs/{dirname}_{timestamp}.jsonl` (override with `WARDEN_STATE_DIR`)

## GitHub Checks

See `src/action/checks/manager.ts` and `src/output/github-checks.ts`.

Each skill gets its own GitHub Check with a markdown summary containing findings, stats, and annotations. A core check aggregates across all skills with a skills table showing per-skill duration, findings, and cost.

## GitHub PR Review

See [github-pr-review.md](./github-pr-review.md).

## Verbosity Levels

| Level | Flag | TTY | Log |
|-------|------|-----|-----|
| Quiet | `-q` | Final report only | Final report only |
| Normal | (default) | Skill progress, file progress, completion | Timestamped skill/hunk/file progress, completion with findings |
| Verbose | `-v` | + real-time findings | + real-time findings |
| Debug | `-vv` | + token counts, prompt sizes, extraction methods | + token counts, prompt sizes, extraction methods |
