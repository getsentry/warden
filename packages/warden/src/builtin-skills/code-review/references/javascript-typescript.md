# JavaScript And TypeScript Bug Review Notes

Use this when reviewing JavaScript, TypeScript, Node, React, Next.js, or browser code. These notes refine the core `code-review` skill; they do not add style, architecture, security, or performance-only scope.

## Runtime Boundaries

- TypeScript types disappear at runtime. Treat JSON, form data, URL params, cookies, local storage, external API responses, database rows, env vars, and message payloads as untrusted shape until parsed or validated.
- `as`, `!`, `any`, unchecked indexed access, and broad generics are leads, not findings. Report only when a reachable runtime value can violate the assumption.
- Generated types, Zod schemas, tRPC routers, OpenAPI clients, GraphQL fragments, ORM models, and serializer tests can prove the intended contract. Read them before reporting a mismatch.
- React and Next.js can split server and client execution. Verify where the code actually runs before claiming a browser, server, hydration, or serialization bug.

## High-Signal Patterns

| Pattern | Bug Shape | Safer Shape |
|---------|-----------|-------------|
| Falsey fallback | `value || defaultValue` treats `0`, `false`, or `""` as absent when those are valid values. | Use `??` or explicit presence checks. |
| Dropped async work | `forEach(async ...)`, `items.map(async ...)` without `await Promise.all`, missing `return` in promise chains, or fire-and-forget work inside request/CLI paths. | Await the work, return the promise, or intentionally detach with error handling. |
| Swallowed async errors | `void fn()`, unhandled promise callbacks, or catch blocks convert failed writes to success responses. | Await and propagate errors, or surface partial failure explicitly. |
| State mutation | In-place `sort`, `reverse`, `splice`, object mutation, cache mutation, or prop mutation changes data later reused by callers. | Clone before mutation or keep mutation local to newly created values. |
| Stale React state | Closures, effects, memoization, or callbacks use stale props/state and produce wrong UI or wrong submitted data. | Use correct dependencies, functional updates, refs for mutable external state, or derive state at render time. |
| Schema drift | Runtime schema, inferred type, serialized payload, or API response changed without matching callers. | Update schema and every consumer, or keep backward-compatible fields. |
| Pagination and ordering | Filtering after slicing, unstable sort keys, cursor fields that are not unique, or changed default order skips or duplicates records. | Filter before paging, add deterministic tie-breakers, and preserve cursor contracts. |
| Date and precision | Date-only strings, local timezone parsing, DST boundaries, milliseconds vs seconds, integer rounding, or currency precision changes produce wrong values. | Normalize units and timezones at boundaries and keep decimal math explicit. |
| Import/export breakage | A value import points at a type-only export, a default import targets named exports, or an ESM/CJS boundary no longer matches runtime output. | Use `export type` for types and value exports for runtime symbols, matching the package format. |
| Cleanup and cancellation | Abort handlers, timers, subscriptions, streams, temp files, or locks are not cleaned up on error or unmount. | Use finally blocks, cleanup functions, abort propagation, and scoped resource ownership. |

## False-Positive Controls

- `Promise.all`, `Promise.allSettled`, returned promise chains, and framework-managed async handlers can prove async work is awaited.
- `value ?? defaultValue` preserves `0`, `false`, and `""`; do not report falsey collapse there.
- In-place mutation is safe when the array or object was created locally and is not reused by callers.
- Optional chaining is not a bug when downstream code intentionally handles absence.
- Type assertions are safe when the value comes from a checked schema, trusted factory, or exhaustive discriminated union.
- React hook dependency warnings are not findings by themselves. Show the stale value and user-visible wrong behavior.
- TypeScript compile errors are findings only when the changed code deterministically breaks the build or emitted runtime behavior.

## Minimal Examples

**Report: falsey value regression**

```ts
const limit = Number(searchParams.get("limit")) || 50;
```

If `limit=0` is a documented way to disable fetching, this turns a valid value into `50`.

**Report: dropped async writes**

```ts
users.forEach(async (user) => {
  await sendInvite(user.id);
});
return { sent: users.length };
```

The function reports success before invites finish, and failures are detached from the response.

**Report: schema drift**

```ts
const UserResponse = z.object({ id: z.string(), name: z.string() });
return { id: user.id, displayName: user.name };
```

The returned payload no longer satisfies the runtime schema or callers expecting `name`.

**Do not report: awaited async map**

```ts
await Promise.all(users.map((user) => sendInvite(user.id)));
```

The promises are joined and errors propagate through the awaited call.
