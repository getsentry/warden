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
├── diff/              # Diff parsing and context
├── output/            # Report rendering
├── skills/            # Skill discovery and loading
├── sdk/               # Claude Code SDK runner
├── cli/               # CLI entry and commands
└── action/            # GitHub Action entry
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

When adding new behavior or modifying existing functionality, review `TESTING.md` to determine if tests are needed. Key points:

- Test error cases users will actually hit
- Add regression tests for bugs
- Co-locate tests with source (`foo.ts` → `foo.test.ts`)

## Task Management

Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.
