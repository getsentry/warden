# warden.toml Configuration Schema

## Top-Level Structure

```toml
version = 1                    # Required, must be 1

[defaults]                     # Optional, inherited by all triggers
[[triggers]]                   # Required, array of trigger configs
[[skills]]                     # Optional, inline skill definitions
```

## Defaults Section

```toml
[defaults]
model = "claude-sonnet-4-20250514"    # Default model
maxTurns = 50                         # Max agentic turns per hunk
defaultBranch = "main"                # Base branch for comparisons

[defaults.output]
failOn = "high"                # Exit 1 if findings >= this severity
commentOn = "medium"           # Show findings >= this severity
maxFindings = 50               # Max findings to report (0 = unlimited)
commentOnSuccess = false       # Post comment even with no findings

[defaults.filters]
paths = ["src/**/*.ts"]        # Include only matching files
ignorePaths = ["*.test.ts"]    # Exclude matching files

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

## Triggers Section

```toml
[[triggers]]
name = "trigger-name"          # Required, unique identifier
event = "pull_request"         # Required: pull_request | issues | issue_comment | schedule
actions = ["opened", "synchronize"]  # Required for non-schedule events
skill = "find-bugs"            # Required, skill name or path

# Optional overrides (inherit from defaults if not set)
model = "claude-opus-4-20250514"
maxTurns = 100

[triggers.filters]
paths = ["src/**"]
ignorePaths = ["**/*.test.ts"]

[triggers.output]
failOn = "critical"
commentOn = "high"
maxFindings = 20
commentOnSuccess = true

# Schedule-specific (only for event = "schedule")
[triggers.schedule]
issueTitle = "Daily Security Review"   # GitHub issue title for tracking
createFixPR = true                     # Create PR with fixes
fixBranchPrefix = "security-fix"       # Branch name prefix
```

**Event types:**
- `pull_request` - Triggers on PR events
- `issues` - Triggers on issue events
- `issue_comment` - Triggers on issue/PR comments
- `schedule` - Triggers on cron schedule (GitHub Action)

**Actions (for non-schedule):**
- `opened`, `synchronize`, `reopened`, `closed`

## Skills Section (Inline Skills)

```toml
[[skills]]
name = "custom-skill"
description = "What this skill checks"
prompt = """
Analysis instructions here.
Look for specific issues.
"""

[skills.tools]
allowed = ["Read", "Grep", "Glob"]     # Whitelist tools
denied = ["Write", "Edit", "Bash"]     # Blacklist tools (optional)
```

## Severity Values

Used in `failOn` and `commentOn`:
- `critical` - Most severe
- `high`
- `medium`
- `low`
- `info` - Least severe
- `off` - Disable threshold

## Built-in Skip Patterns

Always skipped (cannot be overridden):
- Package locks: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, etc.
- Minified files: `**/*.min.js`, `**/*.min.css`
- Build artifacts: `dist/`, `build/`, `node_modules/`, `.next/`, `__pycache__/`
- Generated code: `*.generated.*`, `*.g.ts`, `__generated__/`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WARDEN_ANTHROPIC_API_KEY` | Claude API key (required) |
| `WARDEN_MODEL` | Default model (lowest priority) |

## Model Precedence (highest to lowest)

1. Trigger-level `model`
2. `[defaults]` `model`
3. CLI `--model` flag
4. `WARDEN_MODEL` env var
5. SDK default
