<p align="center">
  <img src="assets/warden-icon-purple.svg" alt="Warden" width="128" height="128">
</p>

# warden

Your code is under new management. Agents that review your code - locally or on every PR - using the Skills you already know and love.

## Why Warden?

**Skills, not prompts.** Define analysis once, run it anywhere. Bootstrap your environment with skills from conventional directories (`.warden/skills/`, `.agents/skills/`, `.claude/skills/`).

**Two ways to run.** CLI catches issues before you push. GitHub Action reviews every PR automatically.

**GitHub-native.** Findings appear as inline PR comments with suggested fixes.

## Quick Start

```bash
# Initialize warden in your repository
npx warden init

# Run on uncommitted changes
# Uses Claude Code subscription if logged in, or set WARDEN_ANTHROPIC_API_KEY
npx warden

# Fix issues automatically
npx warden --fix
```

**[Read the full documentation →](https://warden.sentry.dev/)**

## Contributing

```bash
git clone git@github.com:getsentry/warden.git
cd warden
pnpm install && pnpm build
```

## License

FSL-1.1-ALv2
