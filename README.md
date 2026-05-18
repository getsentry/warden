<p align="center">
  <img src="assets/warden-icon.svg" alt="Warden" width="128" height="128">
</p>

# warden

Your code is under new management. Agents that review your code - locally or on every PR - using the Skills you already know and love.

## Why Warden?

**Skills, not prompts.** Define analysis once, run it anywhere. Bootstrap your environment with skills from conventional directories (`.agents/skills/` or `.claude/skills/`).

**Two ways to run.** CLI catches issues before you push. GitHub Action reviews every PR automatically.

**GitHub-native.** Findings appear as inline PR comments with suggested fixes.

## Quick Start

```bash
# Initialize warden in your repository
npx @sentry/warden init

# Add the built-in baseline reviews
npx @sentry/warden add security-review
npx @sentry/warden add code-review

# Run a pre-review on current branch changes
# Uses Pi. Set WARDEN_OPENAI_API_KEY, or WARDEN_ANTHROPIC_API_KEY for Anthropic models.
npx @sentry/warden

# Fix issues automatically
npx @sentry/warden --fix
```

**[Read the full documentation →](https://warden.sentry.dev/)**

## Contributing

```bash
git clone git@github.com:getsentry/warden.git
cd warden
pnpm install && pnpm build
pnpm test              # unit tests
pnpm test:coverage     # unit tests with LCOV coverage
pnpm evals             # end-to-end evals (requires API key)
```

See [`packages/evals/README.md`](packages/evals/README.md) for the eval framework.

## License

FSL-1.1-ALv2
