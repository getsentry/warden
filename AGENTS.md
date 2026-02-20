# Agent Instructions

## Package Manager

Use **pnpm**: `pnpm install`, `pnpm build`, `pnpm test`

## Commit Attribution

AI commits MUST include:

```
Co-Authored-By: <model name> <noreply@anthropic.com>
```

Example: `Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>`

## Architecture

This is a pnpm workspace monorepo. Shared build tools (eslint, lint-staged, simple-git-hooks, typescript, vitest) live in the root `package.json`.

```
packages/
├── docs/              # Astro docs site (dex-docs), deployed via Vercel

src/                   # @sentry/warden core (root package)
├── index.ts           # Library entry point
├── types/             # Zod schemas and types
├── config/            # Config loading (warden.toml)
├── triggers/          # Event trigger matching
├── event/             # GitHub event parsing
├── diff/              # Diff parsing and context
├── output/            # Report rendering
├── skills/            # Skill discovery and loading
├── sdk/               # Claude Code SDK runner
├── cli/               # CLI entry and commands
│   └── output/        # CLI output formatting
├── action/            # GitHub Action entry
├── evals/             # Eval runner, judge, and types
├── utils/             # Shared utilities
└── examples/          # Example configurations

evals/                 # Eval specs, fixtures, and test skills (see evals/README.md)
├── *.yaml             # YAML eval definitions
├── skills/            # Test skills used as eval vehicles
└── fixtures/          # Source code with known issues
```

## Key Conventions

- TypeScript strict mode
- Zod for runtime validation
- ESM modules (`"type": "module"`)
- Vitest for testing

## TypeScript Exports

Use `export type` for type-only exports. This is required for Bun compatibility:

```ts
// Good
export type { SkillReport } from "./types/index.js";
export { runSkill } from "./sdk/runner.js";

// Bad - fails in Bun
export { SkillReport, runSkill } from "./types/index.js";
```

## Testing

Use `/testing-guidelines` when writing tests. Key principles:

- Mock external services, use sanitized real-world fixtures
- Prefer integration tests over unit tests
- Always add regression tests for bugs
- Cover every user entry point with at least a happy-path test
- Co-locate tests with source (`foo.ts` → `foo.test.ts`)

## Build & Dist

All of `dist/` is gitignored. The ncc action bundle (`dist/action/`) is built and committed to release tags only by the `update-major-tag` workflow. Never commit build artifacts to main.

## Verifying Changes

```bash
pnpm lint && pnpm build && pnpm test
```

## Task Management

Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.

## Skills

### Workflow
- `/commit` — **Always** use for commits. Never commit directly
- `/create-pr` — **Always** use for PRs. Never create PRs directly
- `/iterate-pr` — Fix CI failures and review feedback until checks pass

### Code Quality
- `/warden` — Run Warden analysis before committing. See `.agents/skills/warden/SKILL.md`
- `/notseer` — High-precision bug detection. See `.agents/skills/notseer/SKILL.md`
- `/code-simplifier` — Simplify and refine code
- `/architecture-review` — Staff-level codebase health review. See `.agents/skills/architecture-review/SKILL.md`

### Authoring
- `/testing-guidelines` — Required when writing tests. See `.agents/skills/testing-guidelines/SKILL.md`
- `/agent-prompt` — Reference for writing skills and prompts. See `.agents/skills/agent-prompt/SKILL.md`
- `/skill-creator` — **Always** use when creating or updating skills
- `/brand-guidelines` — Sentry voice and copy guidelines

## Skills Policy

Skills define **what to look for**, not how to respond to findings:

- When Warden reports findings, fix the code. Don't modify skills to suppress results
- Skills should only change to improve detection accuracy, not to reduce reported findings
- Each skill owns its domain expertise; severity definitions are intentionally domain-agnostic

## Evals

End-to-end behavioral tests for the full pipeline. See [`evals/README.md`](evals/README.md) for the YAML spec, how to add evals, and how it all works. Run with `pnpm test:evals`.

## Voice

Warden watches over your code. Not "AI code reviewer" or similar.

Keep it brief, dry, and slightly ominous. Think security guard who's seen everything. Professional but with personality. No fluff, no hype, no em-dashes.
