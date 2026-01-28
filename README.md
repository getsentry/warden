# warden

Your code is under new management. AI agents watching over every pull request.

## Why warden?

**Skills, not prompts.** Define what to look for once. Warden runs the right analysis at the right time:

- **security-review**: Finds injection flaws, auth issues, data exposure
- **code-simplifier**: Identifies opportunities to reduce complexity

**GitHub-native.** Posts findings as PR review comments with inline annotations. Integrates with your existing workflow.

**Run anywhere.** Use as a CLI for local development or as a GitHub Action for CI.

**[Read the full documentation →](https://warden.sentry.dev/)**

## Quick Start

### CLI

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run on uncommitted changes
npx warden

# Run on specific files
npx warden src/auth.ts --skill security-review

# Run on git changes
npx warden HEAD~3

# Auto-fix suggestions
npx warden --fix
```

### GitHub Action

```yaml
# .github/workflows/warden.yml
name: Warden
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dcramer/warden@main
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
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
Usage: warden [targets...] [options]

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
```

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
