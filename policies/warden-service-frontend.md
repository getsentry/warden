# Warden Service Frontend

## Policy

- Author the dashboard in TypeScript and TSX under `apps/warden-service/src/client/`.
- Use strict TypeScript, unchecked-index protection, exact optional properties, and type-only imports. The client compiler configuration is mandatory; do not bypass it with `any`, unchecked response casts, or suppression comments.
- Render UI declaratively with React components. Keep state and event handlers in React. Do not build views through `createElement`, `append`, `replaceChildren`, HTML strings, or `dangerouslySetInnerHTML`.
- Use Effect for browser IO, typed failures, and request lifetimes. Keep network access in the injected HTTP service. Interrupt obsolete requests on navigation, selection changes, and unmount; late responses must never replace the current view.
- Validate API responses at the HTTP boundary. Reuse `@sentry/warden-service-api` schemas for shared contracts. Keep UI models typed throughout rendering.
- Keep components focused on a view or interaction. Share presentation components between the inspector and full finding page.
- Use React Router for navigation and URL filter state. Preserve filters across views and browser history.
- Keep direct DOM access limited to platform boundaries such as focus, native dialogs, theme bootstrap, and the React root. These exceptions must not render application content.
- Preserve accessible labels, keyboard navigation, focus restoration, escaped finding content, and both themes.
- Oxlint must check all client TypeScript and TSX, including React hooks, accessibility, and type-aware unsafe-value and promise rules. Run both TypeScript configurations before building or shipping.
- Build client assets with Vite into ignored `dist/dashboard/`. Serve the compiled HTML, JavaScript, and CSS through the service's existing authenticated routes; do not commit generated assets or expose them as unauthenticated static files.
- Cover user entry points and navigation/cancellation regressions with React integration tests using validated, sanitized service fixtures. Do not evaluate source strings as browser tests.

## Verification

From the repository root:

```sh
pnpm --filter warden-service-app typecheck
pnpm --filter warden-service-app lint
pnpm --filter warden-service-app test
pnpm lint && pnpm build && pnpm test
```
