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

Always skipped (cannot be overridden):
- Package locks: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, etc.
- Minified files: `**/*.min.js`, `**/*.min.css`
- Build artifacts: `dist/`, `build/`, `node_modules/`, `.next/`, `__pycache__/`
- Generated code: `*.generated.*`, `*.g.ts`, `__generated__/`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WARDEN_MODEL` | Default model (lowest priority) |
| `WARDEN_OPENAI_API_KEY` | OpenAI API key (Pi provider `openai`); bridged to `OPENAI_API_KEY` |
| `WARDEN_ANTHROPIC_API_KEY` | Anthropic API key (Pi provider `anthropic` or Claude runtime); bridged to `ANTHROPIC_API_KEY` |
| `WARDEN_GEMINI_API_KEY` | Google Gemini API key (Pi provider `google`); bridged to `GEMINI_API_KEY`. **Note:** Pi provider name is `google`, not `gemini`; use `google/<model-id>` selectors. |
| `WARDEN_OPENROUTER_API_KEY` | OpenRouter API key (Pi provider `openrouter`); bridged to `OPENROUTER_API_KEY` |
| `WARDEN_AI_GATEWAY_API_KEY` | Vercel AI Gateway API key (Pi provider `vercel-ai-gateway`); bridged to `AI_GATEWAY_API_KEY` |
| `WARDEN_VERCEL_AI_GATEWAY_API_KEY` | Convenience alias for Vercel AI Gateway; bridged to `AI_GATEWAY_API_KEY`. Accepted in addition to `WARDEN_AI_GATEWAY_API_KEY`. |
| `WARDEN_CLOUDFLARE_API_KEY` | Cloudflare API key for `cloudflare-workers-ai` or `cloudflare-ai-gateway`; bridged to `CLOUDFLARE_API_KEY` |
| `WARDEN_CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (required for all Cloudflare providers); bridged to `CLOUDFLARE_ACCOUNT_ID` |
| `WARDEN_CLOUDFLARE_GATEWAY_ID` | Cloudflare AI Gateway ID (required for `cloudflare-ai-gateway`); bridged to `CLOUDFLARE_GATEWAY_ID` |
| `WARDEN_STATE_DIR` | Override cache location (default: `~/.local/warden`) |
| `WARDEN_SKILL_CACHE_TTL` | Cache TTL in seconds for unpinned remotes (default: 86400) |

## Model Precedence (highest to lowest)

1. Skill-level `model`
2. `[defaults.agent]` `model`
3. `[defaults]` `model` (legacy fallback)
4. CLI `--model` flag
5. `WARDEN_MODEL` env var
6. SDK default
