# Warden Service Frontend

- Write dashboard code in strict TypeScript and TSX under `apps/warden-service/src/client/`. Keep the client compiler checks enabled. Do not use `any`, unchecked API casts, or comments that suppress type errors.
- Build views with React components. React owns rendered content, state, and event handlers. Do not build views with DOM mutations, HTML strings, or `dangerouslySetInnerHTML`.
- Use Effect for requests and browser actions. Keep them in `api.ts`, with explicit error types. Cancel requests when the user changes views or closes a component, and ignore late responses.
- Validate API responses with the shared `@sentry/warden-service-api` schemas before displaying them.
- Use React Router for navigation and URL filters. Keep filters when switching views or using browser history.
- Share finding content between the inspector and full page. Preserve labels, keyboard access, focus restoration, escaped text, and both themes.
- Use the DOM directly only for browser features such as focus, native dialogs, theme setup, and mounting React.
- Check all client code with Oxlint, including React hooks, accessibility, unsafe values, and promises. Keep these rules and both TypeScript checks enabled in CI.
- Build with Vite into ignored `dist/dashboard/`. Serve compiled assets through the authenticated service routes. Do not commit build output.
- Prefer integration tests that exercise the React app or service routes. Mock network services with sanitized fixtures. Test user behavior, including navigation and stale responses; do not assert source or config strings.

Run from the repository root:

```sh
pnpm --filter warden-service-app lint
pnpm --filter warden-service-app typecheck
pnpm --filter warden-service-app test
pnpm --filter warden-service-app build
```
