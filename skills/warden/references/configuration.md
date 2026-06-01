# Configuration (warden.toml)

## Contents

- Minimal Example
- Skill Configuration
- Common Patterns
- Model Lanes
- Model Precedence
- Environment Variables
- Troubleshooting

See [config-schema.md](config-schema.md) for the complete schema reference.

## Minimal Example

The `name` field references a skill you've created (via `warden add`) or defined in `.agents/skills/<name>/SKILL.md`. Use that same name everywhere — in config, CLI flags, and triggers.

```toml
version = 1

[defaults.agent]
model = "openai/gpt-5.5"
reasoningEffort = "medium"

[[skills]]
name = "my-skill"           # matches .agents/skills/my-skill/SKILL.md
paths = ["src/**/*.ts"]

[[skills.triggers]]
type = "pull_request"
actions = ["opened", "synchronize"]
```

## Skill Configuration

Skills define what to analyze and when. Each skill requires a name. Triggers are optional — skills with no triggers run everywhere (PR, local, schedule). All skills run locally regardless of trigger type.

```toml
[[skills]]
name = "my-skill"
paths = ["src/auth/**", "src/payments/**"]
failOn = "high"
reportOn = "medium"
maxFindings = 20

[[skills.triggers]]
type = "pull_request"
actions = ["opened", "synchronize"]
```

**Trigger types:** `pull_request`, `local` (local-only), `schedule` (CI-only)

**Actions (pull_request):** `opened`, `synchronize`, `reopened`, `closed`

## Common Patterns

**Strict checks on critical files:**
```toml
[[skills]]
name = "my-skill"
model = "anthropic/claude-opus-4-5"
maxTurns = 100
paths = ["src/auth/**", "src/payments/**"]
failOn = "high"

[[skills.triggers]]
type = "pull_request"
actions = ["opened", "synchronize"]
```

**Skip test files:**
```toml
[[skills]]
name = "my-skill"
paths = ["src/**/*.ts"]
ignorePaths = ["**/*.test.ts", "**/*.spec.ts"]
```

**Whole-file analysis for configs:**
```toml
[[defaults.chunking.filePatterns]]
pattern = "*.config.*"
mode = "whole-file"
```

## Model Lanes

Warden uses different model lanes for different kinds of work:

- Analysis: repo-aware skill execution uses `[[skills]].model`, then `[defaults.agent].model`, then legacy `[defaults].model`
- Auxiliary: structured helper calls use `[defaults.auxiliary].model`
- Synthesis: post-analysis consolidation and generated-skill builds use `[defaults.synthesis].model`

If `[defaults.synthesis].model` is omitted, synthesis falls back to `[defaults.auxiliary].model`.

`[defaults.agent].reasoningEffort` optionally controls repo-aware skill reasoning across runtimes. Supported values are `off`, `low`, `medium`, `high`, and `xhigh`. When omitted, each runtime uses its own default.

## Model Precedence

From highest to lowest priority:

1. Skill-level `model`
2. `[defaults.agent]` `model`
3. `[defaults]` `model` (legacy fallback)
4. CLI `--model` flag
5. `WARDEN_MODEL` env var
6. SDK default

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WARDEN_MODEL` | Default model (lowest priority) |
| `WARDEN_{PROVIDER}_API_KEY` | API key for the named Pi provider (e.g. `WARDEN_OPENAI_API_KEY`, `WARDEN_FIREWORKS_API_KEY`). Mirrored to the native `{PROVIDER}_API_KEY` at runtime. |
| `WARDEN_OPENAI_API_KEY` | OpenAI API key for OpenAI Pi models |
| `WARDEN_ANTHROPIC_API_KEY` | Anthropic API key for Anthropic Pi models or Claude runtime |
| `WARDEN_FIREWORKS_API_KEY` | Fireworks API key for Fireworks Pi models |
| `WARDEN_GROQ_API_KEY` | Groq API key for Groq Pi models |
| `WARDEN_OPENROUTER_API_KEY` | OpenRouter API key for OpenRouter Pi models |
| `WARDEN_STATE_DIR` | Override cache location (default: `~/.local/warden`) |
| `WARDEN_SKILL_CACHE_TTL` | Cache TTL in seconds for unpinned remotes (default: 86400) |

Native provider env vars (e.g. `OPENAI_API_KEY`) also work. The `WARDEN_`-prefixed forms are
preferred in CI so they do not collide with locally-set provider keys.

## Troubleshooting

**No findings reported:**
- Check `--report-on` threshold (default shows all)
- Verify skill matches file types in `paths`
- Use `-v` to see which files are being analyzed

**Files being skipped:**
- Built-in skip patterns: lock files, minified, `node_modules/`, `dist/`
- Check `ignorePaths` in config
- Use `-vv` to see skip reasons

**Token/cost issues:**
- Reduce `maxTurns` (default: 50)
- Lower `[defaults.agent].reasoningEffort` when the runtime supports cheaper reasoning levels
- Use chunking settings to control chunk size
- Filter to relevant files with `paths`
