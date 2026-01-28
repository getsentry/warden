# warden

Your code is under new management. AI agents that review your code—locally or on every PR.

## Two Ways to Run

**Local CLI** — Catch issues before you push. Run analysis on uncommitted changes, specific files, or git refs. Fix problems immediately with `--fix`.

**GitHub Action** — Automated review on every pull request. Findings appear as inline comments with suggested fixes.

## Why Warden?

**Catch issues before they land.** Run Warden locally to fix problems before pushing, or let it review every PR automatically.

**Skills, not prompts.** Define analysis once. Warden runs the right checks at the right time:

- **security-review**: Finds injection flaws, auth issues, data exposure
- **code-simplifier**: Identifies opportunities to reduce complexity

**GitHub-native.** Posts findings as PR review comments with inline annotations. Integrates with your existing workflow.

**[Read the full documentation →](https://warden.sentry.dev/)**

## Quick Start

```bash
# Initialize warden in your repository
npx warden init

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run on uncommitted changes
npx warden

# Found something? Fix it immediately
npx warden --fix
```

This creates:
- `warden.toml` — Configuration with the security-review skill
- `.github/workflows/warden.yml` — GitHub Action for automated PR reviews

Add `ANTHROPIC_API_KEY` to your repository secrets, commit the files, and open a PR to see it in action.

### More CLI Examples

```bash
# Run on specific files
npx warden src/auth.ts --skill security-review

# Run on git changes
npx warden HEAD~3

# Initialize with a different default skill
npx warden init --skill code-simplifier
```

## Configuration

Create `warden.toml` to define triggers:

```toml
version = 1

[[triggers]]
name = "security-review"
event = "pull_request"
actions = ["opened", "synchronize", "reopened"]
skill = "security-review"

[triggers.filters]
paths = ["src/**/*.ts"]

[triggers.output]
failOn = "high"
```

### Custom Skills

Define custom skills in `.warden/skills/` or inline in `warden.toml`:

```toml
[[skills]]
name = "api-review"
description = "Review API endpoints for consistency"
prompt = """
Review API endpoints for:
- Consistent naming conventions
- Proper error handling
- Input validation
"""

[skills.tools]
allowed = ["Read", "Grep", "Glob"]
```

## CLI Reference

```
Usage: warden [command] [targets...] [options]

Commands:
  init                 Initialize warden.toml and GitHub workflow
  (default)            Run analysis on targets or using warden.toml triggers

Targets:
  <files>              Analyze specific files (e.g., src/auth.ts)
  <glob>               Analyze files matching pattern (e.g., "src/**/*.ts")
  <git-ref>            Analyze changes from git ref (e.g., HEAD~3, main..feature)
  (none)               Analyze uncommitted changes using warden.toml triggers

Options:
  --skill <name>       Run only this skill
  --config <path>      Path to warden.toml (default: ./warden.toml)
  --json               Output results as JSON
  --fail-on <severity> Exit with code 1 if findings >= severity
  --fix                Automatically apply all suggested fixes
  --parallel <n>       Max concurrent executions (default: 4)
  --quiet              Errors and final summary only
  -v, --verbose        Show real-time findings
  -vv                  Show debug info (token counts, latencies)

Init Options:
  --force              Overwrite existing files
  --skill <name>       Default skill to configure (default: security-review)
```

## When to Use CLI vs Action

| Use Case | CLI | Action |
|----------|-----|--------|
| Catch issues before pushing | Yes | |
| Interactive fix application | Yes | |
| Fast feedback loop during development | Yes | |
| Automated review on every PR | | Yes |
| Team visibility via GitHub comments | | Yes |
| CI integration with exit codes | Yes | Yes |

**CLI for catching issues early.** Run `warden` before you push to fix problems before they hit CI.

**Action for automated coverage.** Every PR gets reviewed automatically, with findings visible to the whole team.

## Contributing

### Prerequisites

- Node.js >= 20.0.0
- pnpm (`npm install -g pnpm`)
- An Anthropic API key

### Development Setup

```bash
git clone git@github.com:dcramer/warden.git
cd warden
pnpm install && pnpm build
```

### Development Cycle

```bash
pnpm dev          # Watch mode (rebuilds on changes)
pnpm typecheck    # Type check
pnpm lint         # Lint
pnpm test         # Run unit tests
```

### Testing Locally

```bash
# Create .env.local (gitignored)
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local

# Run against uncommitted changes
pnpm cli run

# Run against a git ref
pnpm cli run HEAD~3 --skill security-review
```

## License

FSL-1.1-ALv2
