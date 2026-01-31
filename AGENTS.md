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

```
src/
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
├── utils/             # Shared utilities
└── examples/          # Example configurations
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

**Always reference `/testing-guidelines` when writing tests.** Key principles:

- Mock external services, use sanitized real-world fixtures
- Prefer integration tests over unit tests
- Always add regression tests for bugs
- Cover every user entry point with at least a happy-path test
- Co-locate tests with source (`foo.ts` → `foo.test.ts`)

## Verifying Changes

```bash
pnpm lint && pnpm build && pnpm test
```

## Task Management

Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.

## Skills Policy

Skills define **what to look for**, not how to respond to findings:

- When Warden reports findings, fix the code. Don't modify skills to suppress results
- Skills should only change to improve detection accuracy, not to reduce reported findings
- Each skill owns its domain expertise; severity definitions are intentionally domain-agnostic

## Voice

Warden watches over your code. Not "AI code reviewer" or similar.

Keep it brief, dry, and slightly ominous. Think security guard who's seen everything. Professional but with personality. No fluff, no hype, no em-dashes.
