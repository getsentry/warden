# Agent Instructions

## Package Manager
Use **pnpm**: `pnpm install`, `pnpm dev`, `pnpm test`

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: (the agent model's name and attribution byline)
```

## Key Conventions
- TypeScript strict mode
- Zod for runtime validation
- ESM modules (`"type": "module"`)
- Vitest for testing

## Task Management
Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.
