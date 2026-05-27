# JavaScript And TypeScript Security Notes

Use this when reviewing JavaScript, TypeScript, Node, React, Next.js, or browser code. These examples refine the core skill; they do not add new reporting scope.

## Server-Side Entry Points

- Next.js route handlers, Server Actions, API routes, tRPC/RPC handlers, Express/Fastify/Koa routes, webhook handlers, queue consumers, and CLI/service functions can be security boundaries.
- Treat Server Actions as callable server entry points. UI visibility, hidden form fields, and client components are not authorization.
- Next.js `middleware.ts` is not enough proof of authorization for sensitive mutations. Verify handler-level auth and resource-level authorization.
- For service handlers, do not trust caller-controlled headers such as `x-user-id`, `x-org-id`, `x-forwarded-*`, or internal-only flags unless a trusted gateway verifies them.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Server Action authz | `"use server"` mutation trusts `userId`, `teamId`, `role`, hidden fields, or form args | Load session in the action, scope by server-side tenant, enforce permission |
| SQL injection | `prisma.$queryRawUnsafe(\`...${id}\`)`, string-built SQL, concatenated `where` clauses | Tagged templates, query parameters, ORM filters scoped to the authenticated tenant |
| Command injection | `exec("git " + branch)`, `spawn(cmd, args, {shell: true})` with user input | `execFile`/`spawn` with fixed binary, fixed argument positions, and strict allowlists |
| XSS | `innerHTML`, `dangerouslySetInnerHTML`, `unsafeHTML`, unsafe Markdown HTML, inline script JSON with user data | Text rendering, vetted sanitizer, escaping `<` in inline JSON, no dangerous URL schemes |
| SSRF | `fetch(req.query.url)`, image/preview/proxy fetchers using user URLs, redirect-following after first-hop validation | Exact host allowlist, private-IP blocking, DNS rebinding defenses, redirect revalidation or manual redirects |
| Open redirect | `redirect(searchParams.get("next"))`, prefix/substring URL checks in login or OAuth flows | Relative-path allowlist or exact origin/path allowlist after URL normalization |
| Path traversal | `path.join(root, userPath)` without realpath containment, archive extraction by entry name | Normalize and resolve real paths, verify containment, generate server-side filenames |
| Webhook forgery | State-changing webhook parses JSON before verifying signature or skips timestamp/replay checks | Verify raw body signature, timestamp freshness, replay/idempotency, and provider secret before side effects |
| Secrets exposure | Secrets in client components, `NEXT_PUBLIC_*`, serialized props, logs, or error responses | Server-only reads, redacted logs, safe error messages, no hardcoded production fallback |

## False-Positive Controls

- React text interpolation escapes by default. Report only escape hatches or dangerous URL/script contexts.
- Prisma/Drizzle/Knex query builders can parameterize values. Verify the specific API before reporting SQL injection.
- `crypto.randomUUID()` and `crypto.getRandomValues()` are suitable for security randomness; `Math.random()` is not.
- `jsonwebtoken.verify` can be safe when algorithms, issuer/audience, expiry, and key selection are pinned appropriately.
- DOMPurify or equivalent sanitizers can mitigate HTML injection when configured for the target context.

## Minimal Examples

**Report: cross-tenant lookup**

```ts
const invoice = await db.invoice.findUnique({ where: { id: params.invoiceId } });
```

Require: server-derived tenant scope such as `accountId: session.accountId`, plus permission checks.

**Report: Server Action trusts caller fields**

```ts
"use server";
export async function setRole(userId: string, role: string) {
  await db.user.update({ where: { id: userId }, data: { role } });
}
```

Require: load session in the action and prove caller can mutate that tenant user.

**Report: inline JSON script breakout**

```tsx
<script dangerouslySetInnerHTML={{ __html: `window.__DATA__=${JSON.stringify(data)}` }} />
```

Risk: `</script>` breakout. Require: escape `<` or `</script` before embedding.

**Do not report: parameterized query**

```ts
await db.$queryRaw`SELECT * FROM invoices WHERE id = ${invoiceId} AND account_id = ${accountId}`;
```

This is not SQL injection if the tagged template parameterizes values and `accountId` is trusted from the authenticated session.
