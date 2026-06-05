# warden.toml Configuration Schema

## Contents

- Top-Level Structure
- Defaults Section
- Skills Section
- Severity Values
- Built-in Skip Patterns
- Environment Variables

## Top-Level Structure

```toml
version = 1                    # Required, must be 1

[defaults]                     # Optional, inherited by all skills
[defaults.agent]               # Optional, default analysis runtime settings
[defaults.auxiliary]           # Optional, default helper model settings
[defaults.synthesis]           # Optional, default synthesis model settings
[[skills]]                     # Required, array of skill configs
```

## Defaults Section

```toml
[defaults]
runtime = "pi"                        # Default runtime
model = "openai/gpt-5.5"              # Legacy default analysis model
maxTurns = 50                         # Legacy default analysis turns
defaultBranch = "main"                # Base branch for comparisons
failOn = "high"                       # Exit 1 if findings >= this severity
reportOn = "medium"                   # Show findings >= this severity
maxFindings = 50                      # Max findings to report (0 = unlimited)
reportOnSuccess = false               # Post report even with no findings
ignorePaths = ["*.test.ts"]           # Exclude matching files

[defaults.ignore]
paths = ["**/fixtures/**", "!**/fixtures/regressions/**"] # Gitignore-style global ignore overrides

[defaults.scan]
maxFiles = 150                        # Max files analyzed after ignores
maxChangedLines = 10000               # Max changed lines analyzed after ignores
maxFileBytes = 1048576                # Max bytes for files whose contents may be read
maxFileLines = 3000                   # Max lines for files whose contents may be read

[defaults.agent]
model = "openai/gpt-5.5"              # Default repo-aware analysis model
maxTurns = 50                         # Max agentic turns per hunk
effort = "medium"                     # off | low | medium | high | xhigh

[defaults.auxiliary]
model = "anthropic/claude-haiku-4-5"  # Helper model for extraction and fix gates
maxRetries = 5                        # Retries for auxiliary structured calls

[defaults.synthesis]
model = "anthropic/claude-opus-4-5"   # Consolidation and generated-skill build model

[defaults.chunking]
enabled = true                 # Enable hunk-based chunking

[defaults.chunking.coalesce]
enabled = true                 # Merge nearby hunks
maxGapLines = 30               # Lines between hunks to merge
maxChunkSize = 8000            # Max chars per chunk

[[defaults.chunking.filePatterns]]
pattern = "*.config.*"         # Glob pattern
mode = "whole-file"            # per-hunk | whole-file | skip
```

`[defaults.agent].effort` controls repo-aware skill reasoning across runtimes. When omitted, Warden sends explicit `high` adaptive thinking to the Claude runtime; Pi uses its own default thinking level.

`[defaults.synthesis].model` falls back to `[defaults.auxiliary].model` when omitted. Legacy `[defaults].model` and `[defaults].maxTurns` are still supported as analysis fallbacks.

## Skills Section

```toml
[[skills]]
name = "skill-name"            # Required, unique identifier
remote = "owner/repo@sha"      # Optional, fetch skill from GitHub repo
paths = ["src/**"]             # Include only matching files
ignorePaths = ["**/*.test.ts"] # Exclude matching files

# Optional overrides (inherit from defaults if not set)
model = "anthropic/claude-opus-4-5"
maxTurns = 100
failOn = "high"
reportOn = "medium"
maxFindings = 20
reportOnSuccess = true

[[skills.triggers]]
type = "pull_request"          # Required: pull_request | local | schedule
actions = ["opened", "synchronize"]  # Required for pull_request

# Schedule-specific (only for type = "schedule")
[[skills.triggers]]
type = "schedule"

[skills.triggers.schedule]
issueTitle = "Daily Security Review"   # GitHub issue title for tracking
createFixPR = true                     # Create PR with fixes
fixBranchPrefix = "security-fix"       # Branch name prefix
```

**Trigger types:**
- `pull_request` - Triggers on PR events
- `local` - Local CLI only (will not run in CI)
- `schedule` - Cron schedule (GitHub Action only)

All skills run locally regardless of trigger type. Skills with no triggers run everywhere (wildcard). Use `type = "local"` for skills that should *only* run locally.

**Actions (for pull_request):**
- `opened`, `synchronize`, `reopened`, `closed`

## Severity Values

Used in `failOn` and `reportOn`:
- `high` - Must fix before merge
- `medium` - Worth reviewing
- `low` - Minor improvement
- `off` - Disable threshold

## Built-in Skip Patterns

Skipped by default, with `!` patterns in `[defaults.ignore].paths` available for re-inclusion:
- Package locks: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, etc.
- Minified, bundled, and source map files.
- Build/vendor/cache artifacts: `dist/`, `build/`, `node_modules/`, `vendor/`, `.next/`, `coverage/`, etc.
- Generated code paths and suffixes: `*.generated.*`, `*.g.ts`, `*.pb.go`, `*_pb2.py`, `__generated__/`, etc.
- Binary, media, archive, font, and bulky data files.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WARDEN_MODEL` | Default model (lowest priority) |
| `WARDEN_OPENAI_API_KEY` | OpenAI API key for OpenAI Pi models |
| `WARDEN_ANTHROPIC_API_KEY` | Anthropic API key for Anthropic Pi models or Claude runtime |
| `WARDEN_STATE_DIR` | Override cache location (default: `~/.local/warden`) |
| `WARDEN_SKILL_CACHE_TTL` | Cache TTL in seconds for unpinned remotes (default: 86400) |

## Model Precedence (highest to lowest)

1. Skill-level `model`
2. `[defaults.agent]` `model`
3. `[defaults]` `model` (legacy fallback)
4. CLI `--model` flag
5. `WARDEN_MODEL` env var
6. SDK default
