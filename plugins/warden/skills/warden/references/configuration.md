# Configuration (warden.toml)

See [config-schema.md](config-schema.md) for the complete schema reference.

## Minimal Example

```toml
version = 1

[defaults]
model = "claude-sonnet-4-20250514"

[[triggers]]
name = "find-bugs"
event = "pull_request"
actions = ["opened", "synchronize"]
skill = "find-bugs"

[triggers.filters]
paths = ["src/**/*.ts"]
```

## Trigger Configuration

Triggers map events to skills. Each trigger requires a name, event, actions, and skill:

```toml
[[triggers]]
name = "security-strict"
event = "pull_request"
actions = ["opened", "synchronize"]
skill = "security-review"

[triggers.filters]
paths = ["src/auth/**", "src/payments/**"]

[triggers.output]
failOn = "critical"
commentOn = "high"
maxFindings = 20
```

**Event types:** `pull_request`, `issues`, `issue_comment`, `schedule`

**Actions (non-schedule):** `opened`, `synchronize`, `reopened`, `closed`

## Common Patterns

**Strict security on critical files:**
```toml
[[triggers]]
name = "auth-security"
event = "pull_request"
actions = ["opened", "synchronize"]
skill = "security-review"
model = "claude-opus-4-20250514"
maxTurns = 100

[triggers.filters]
paths = ["src/auth/**", "src/payments/**"]

[triggers.output]
failOn = "critical"
```

**Skip test files:**
```toml
[triggers.filters]
paths = ["src/**/*.ts"]
ignorePaths = ["**/*.test.ts", "**/*.spec.ts"]
```

**Whole-file analysis for configs:**
```toml
[defaults.chunking.filePatterns]
pattern = "*.config.*"
mode = "whole-file"
```

## Model Precedence

From highest to lowest priority:

1. Trigger-level `model`
2. `[defaults]` `model`
3. CLI `--model` flag
4. `WARDEN_MODEL` env var
5. SDK default

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WARDEN_ANTHROPIC_API_KEY` | Claude API key (required unless using Claude Code subscription) |
| `WARDEN_MODEL` | Default model (lowest priority) |
| `WARDEN_STATE_DIR` | Override cache location (default: `~/.local/warden`) |
| `WARDEN_SKILL_CACHE_TTL` | Cache TTL in seconds for unpinned remotes (default: 86400) |

## Troubleshooting

**No findings reported:**
- Check `--comment-on` threshold (default shows all)
- Verify skill matches file types in `filters.paths`
- Use `-v` to see which files are being analyzed

**Files being skipped:**
- Built-in skip patterns: lock files, minified, `node_modules/`, `dist/`
- Check `ignorePaths` in config
- Use `-vv` to see skip reasons

**Token/cost issues:**
- Reduce `maxTurns` (default: 50)
- Use chunking settings to control chunk size
- Filter to relevant files with `paths`
