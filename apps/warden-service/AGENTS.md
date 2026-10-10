# Warden Service App Instructions

## Package Manager

- Use **pnpm**.

## Frontend

- Follow [the service frontend policy](../../policies/warden-service-frontend.md).
- Use strict TypeScript, React, and Effect for all dashboard work.
- Client source lives in `src/client/`; generated assets live in ignored `dist/dashboard/`.

## Commands

- Typecheck: `pnpm --filter warden-service-app typecheck`
- Lint: `pnpm exec oxlint apps/warden-service/src/client`
- Test one file: `pnpm --filter warden-service-app test src/client/app.test.tsx`
- Build client: `pnpm --filter warden-service-app build:client`

## Commit Attribution

- Follow the root `AGENTS.md` attribution requirements; use the current model's identity.
