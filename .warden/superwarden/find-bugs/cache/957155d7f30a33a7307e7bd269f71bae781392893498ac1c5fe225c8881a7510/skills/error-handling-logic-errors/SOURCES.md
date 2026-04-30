# error-handling-logic-errors Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|------------|--------------|-------------------|
| Warden repository source (src/) | canonical | high | Error class hierarchy, cleanup patterns, framework integration, tsconfig.json strict mode settings. | Do not send repository code to web tools; use for local inspection only. |
| tsconfig.json | canonical | high | TypeScript strict mode settings (`strict: true`, `useUnknownInCatchVariables: true`) affect catch variable types. | Read locally; do not send to web tools. |
| Superwarden parent plan | canonical | high | Task scope, evidence requirements, out-of-scope exclusions. | Preserve task intent and constraints. |
| [TypeScript try...catch documentation (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) | authoritative | high | Core try/catch/finally semantics, catch variable type (unknown in strict mode). | Use for public TypeScript behavior only. |
| [TypeScript error handling best practices (basarat.gitbook.io)](https://basarat.gitbook.io/typescript/type-system/exceptions) | community | high | Type safety in catch blocks, custom error classes, type narrowing patterns. | Use for common patterns and best practices. |
| [JavaScript explicit resource management (V8)](https://v8.dev/features/explicit-resource-management) | authoritative | high | Symbol.dispose, Symbol.asyncDispose, `using` and `await using` keywords for RAII patterns. | Use for modern resource cleanup patterns (ES2024+). |
| [Node.js resource cleanup patterns (various)](https://copyprogramming.com/howto/what-are-active-handles-in-node-js) | community | medium | File handles, database connections, timers, event listeners, child processes, graceful shutdown. | Use for Node.js-specific resource management guidance. |
| [TypeScript async error propagation (LogRocket)](https://blog.logrocket.com/async-await-typescript/) | community | medium | Async/await error handling, error re-throwing, Result type pattern. | Use for async error propagation patterns. |

## Decisions

### Catch Variable Type (unknown vs any)

**Decision**: Check tsconfig.json for `strict: true` or `useUnknownInCatchVariables: true`. If present, catch variables are `unknown` and require type narrowing before property access. If absent, assume `unknown` as a safe default.

**Source evidence**:
- Warden repository tsconfig.json has `"strict": true` (line 9), so catch variables are `unknown`.
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/exceptions): "Enable strict mode (or useUnknownInCatchVariables) to make catch variables unknown. This forces type checks, preventing runtime errors from invalid property access."

**Impact**: Findings must check whether catch blocks narrow `unknown` catch variables with `instanceof`, `typeof`, or type guards before accessing error properties.

### Error Wrapping Pattern

**Decision**: The repository standard is `throw new CustomError(message, { cause: originalError })` to preserve error context.

**Source evidence**:
- Grep results show consistent use of `{ cause: error }` in throw statements:
  - `src/event/context.ts`: `throw new EventContextError('Invalid event payload', { cause: payloadResult.error });`
  - `src/config/loader.ts`: `throw new ConfigLoadError('Failed to parse TOML configuration', { cause: error });`
  - `src/coordinator/plan.ts`: `throw new CoordinatorPlanError('Superwarden synthesis failed', { cause: error });`

**Impact**: Findings should report `throw new Error(message)` without `{ cause: originalError }` as lost error context.

### Resource Cleanup Pattern

**Decision**: The repository uses manual cleanup with try/catch/finally blocks. No evidence of `using` or `await using` keywords.

**Source evidence**:
- Grep for `finally\s*\{` found 11 files with finally blocks.
- Grep for `.finally\(` (promise cleanup) found no matches.
- No `Symbol.dispose` or `Symbol.asyncDispose` usage found in source.
- Example: `src/utils/exec.ts` uses synchronous child process execution without cleanup (no file handles or persistent resources to clean up).

**Impact**: Findings should expect cleanup in finally blocks, not Symbol.dispose. If future repository adopts explicit resource management (TC39 proposal), update this decision.

### Intentional Error Suppression

**Decision**: Empty catch blocks are acceptable when justified by comments (e.g., "Never break the workflow" for telemetry errors).

**Source evidence**:
- `src/sentry.ts` lines 45, 58, 71: Empty catch blocks with comment "Never break the workflow" for Sentry telemetry errors.

**Impact**: Findings should not report empty catch blocks when surrounding comments or code context justify intentional suppression for optional operations (telemetry, logging, non-critical features).

### Framework Error Boundaries

**Decision**: No evidence of Express, React, or other framework error boundaries in current repository source. If future repository adopts such frameworks, update skill to check integration.

**Source evidence**:
- Grep for Express error middleware patterns (`app.use((err, req, res, next)`) found no matches in src/.
- Grep for React error boundary patterns (`componentDidCatch`, `getDerivedStateFromError`) found no matches in src/.

**Impact**: Findings should not assume framework-provided error boundaries exist. If deployment context suggests framework usage (e.g., package.json dependencies), note missing evidence in finding rationale.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| **Vulnerability prerequisites** | complete | Swallowed errors, missing cleanup, lost context, invalid state require changed lines with error handling code and control-flow traces. |
| **Exploitable dataflow examples** | complete | Traced control flow from error handling sites (try/catch/finally) to callers, resource acquisition to cleanup, state mutations to error throws. |
| **False-positive controls** | complete | Intentional error suppression (Sentry telemetry), framework-provided cleanup (none in current repo), correct error wrapping with cause. |
| **Severity/confidence calibration** | complete | High confidence for critical paths (auth, payment, data writes) and scarce resources (DB connections); medium confidence when deployment context unknown; low confidence when caller expectations ambiguous. |
| **Remediation patterns** | complete | Re-throw errors, add finally blocks, wrap errors with { cause }, move state updates after error-prone operations, document error suppression. |
| **Framework/runtime caveats** | complete | TypeScript strict mode (unknown catch variables), Node.js resource cleanup (file handles, timers, connections), Express/React error boundaries (not present in current repo). |
| **API surface** | complete | try/catch/finally, Promise.catch(), error class constructors, Symbol.dispose (not used), AbortController. |
| **Config/runtime options** | complete | tsconfig.json strict mode, useUnknownInCatchVariables. |
| **Common use cases** | complete | Swallowed errors in async operations, missing cleanup for file handles/timers/connections, lost error context in re-throws, state mutations before throws. |
| **Known issues/workarounds** | complete | Deployment context unknown (CLI vs server affects leak impact), caller expectation inference (when function contracts undocumented), framework integration inference (when framework usage unclear). |
| **Version/migration variance** | complete | TypeScript catch variable type changed in TS 4.4+ (unknown by default in strict mode); explicit resource management (Symbol.dispose) is ES2024+ and not yet used in repository. |

## Open Gaps

### Deployment Context

**Gap**: The skill cannot determine whether the repository is a short-lived CLI script (where resource leaks may be tolerable because the process exits) or a long-lived server (where resource leaks cause exhaustion over time).

**Validation step**: Inspect package.json scripts, Dockerfile, or deployment manifests to infer deployment mode. Currently low-yield because Warden is both a CLI and a library, and deployment context varies by user.

**Mitigation**: Note deployment ambiguity in finding rationale when reporting resource leaks. State that long-lived processes (servers, daemons) are more affected than short-lived processes (CLI scripts, serverless functions).

### Framework Integration

**Gap**: If the repository adopts a framework with automatic error boundaries (Express, React, NestJS) in the future, the skill must update to check integration with those boundaries.

**Validation step**: Grep for framework-specific error handler patterns (Express middleware, React componentDidCatch) when generating findings. Currently low-yield because no such frameworks are used.

**Mitigation**: Document this gap in Known Limitations. Update skill when framework adoption is detected.

### Caller Expectation Inference

**Gap**: When a function's error handling contract is not documented (no JSDoc, no explicit return type like `Promise<Result>`), the skill infers caller expectations from call sites. If call sites are inconsistent or missing, inference is uncertain.

**Validation step**: Read function signatures, JSDoc comments, and return types to establish error handling contracts. Grep for call sites to cross-check expectations. Currently covered in evidence requirements.

**Mitigation**: Reduce confidence when caller expectations are ambiguous. Include rationale in findings.

### Additional Retrieval

No additional retrieval is currently high-yield. The skill has sufficient local source evidence (error class hierarchy, cleanup patterns, tsconfig.json) and external documentation (TypeScript handbook, Node.js resource cleanup guides, TC39 explicit resource management proposal) to operate correctly.

Future retrieval triggers:
- Repository adopts new frameworks (Express, React) → retrieve framework error handling documentation.
- TypeScript or Node.js release new error handling features → retrieve updated language/runtime documentation.
- Repository adopts Symbol.dispose or explicit resource management → retrieve TC39 proposal and V8 implementation details.

## Changelog

### 2026-04-30: Initial Superwarden synthesis

- Synthesized child skill from parent "find-bugs" task "error-handling-logic-errors".
- Inspected Warden repository source for error class hierarchy (`src/sdk/errors.ts`, grep for `class \w+Error extends`), cleanup patterns (grep for `finally`, no Symbol.dispose usage), tsconfig.json strict mode (`"strict": true`).
- Consulted external sources:
  - [TypeScript try...catch (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) for catch variable types.
  - [TypeScript Deep Dive (basarat.gitbook.io)](https://basarat.gitbook.io/typescript/type-system/exceptions) for type safety in catch blocks.
  - [JavaScript explicit resource management (V8)](https://v8.dev/features/explicit-resource-management) for Symbol.dispose and using/await using keywords.
  - [Node.js resource cleanup patterns](https://copyprogramming.com/howto/what-are-active-handles-in-node-js) for file handles, timers, connections.
  - [TypeScript async error propagation (LogRocket)](https://blog.logrocket.com/async-await-typescript/) for async/await error handling.
- Documented decisions: catch variable type (unknown in strict mode), error wrapping pattern ({ cause: originalError }), resource cleanup pattern (manual finally blocks), intentional error suppression (Sentry telemetry), no framework error boundaries.
- Documented open gaps: deployment context (CLI vs server), framework integration inference, caller expectation inference.
- Documented known limitations: deployment context unknown, framework integration not evident, caller expectation inference from call sites.
- Applied skill-writer security-review quality bar: vulnerability prerequisites (changed lines with error handling), exploitable dataflow examples (control-flow traces), false-positive controls (intentional suppression, framework cleanup), severity/confidence calibration (critical paths vs optional operations), remediation patterns (re-throw, finally, wrap with cause), framework/runtime caveats (TypeScript strict mode, Node.js resources, no Express/React).
