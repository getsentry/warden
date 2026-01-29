# Contributing to Warden

## Prerequisites

- Node.js >= 20.0.0
- pnpm (install via `npm install -g pnpm`)
- An Anthropic API key for running skills

## Setup

```bash
pnpm install
pnpm build
```

## Development

```bash
pnpm dev          # Watch mode (rebuilds on changes)
pnpm typecheck    # Type check
pnpm lint         # Lint
pnpm test         # Run unit tests in watch mode
pnpm test:run     # Run unit tests once
```

## Testing Locally

The CLI runs skills against local git changes. Set up your API key and run it:

```bash
# Create .env.local (gitignored)
echo 'WARDEN_ANTHROPIC_API_KEY=sk-ant-...' > .env.local

# Run against uncommitted changes
pnpm cli run

# Run against recent commits
pnpm cli run --base HEAD~3

# Run against a branch
pnpm cli run --base origin/main

# Run a specific skill
pnpm cli run --skill security-review

# JSON output
pnpm cli run --json
```

## Project Structure

```
src/
├── action/       # GitHub Action entry point
├── cli/          # Local CLI
├── config/       # Config loading (warden.toml)
├── skills/       # Built-in skills
├── triggers/     # Trigger matching logic
└── types/        # Type definitions
```
