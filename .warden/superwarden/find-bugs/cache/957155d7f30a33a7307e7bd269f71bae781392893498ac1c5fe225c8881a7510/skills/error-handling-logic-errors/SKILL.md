---
name: error-handling-logic-errors
description: "Use when analyzing TypeScript code for error handling and recovery logic errors, including swallowed errors, incorrect error propagation, missing resource cleanup, or invalid state after errors."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent "find-bugs" and task "error-handling-logic-errors".

## Investigation Requirements

You must perform deep repository-local investigation before reporting findings:

- Use **Read**, **Grep**, and **Glob** to inspect changed hunks, surrounding code, error class hierarchies, cleanup patterns, and framework integration.
- Use **WebSearch** or **WebFetch** for current public documentation or prior art when external framework, runtime, or error-handling behavior materially affects findings (e.g., Express error middleware contracts, Node.js resource cleanup patterns, TypeScript error narrowing behavior).
- **Never send repository code, secrets, private file paths, or proprietary details to web tools.** Use only public framework names, package names, API names, vulnerability class names, and documentation URLs.

## Scope

Find logical errors in try/catch blocks, error propagation, error type checking, resource cleanup, and state recovery after errors in **changed hunks**.

Inspect changed lines for:

1. **Empty catch blocks or catch blocks that log but do not propagate or recover**: Catch blocks that consume errors without re-throwing, returning error values, or taking compensating action, preventing callers from detecting failures.

2. **Incorrect error type checks**: Catching all errors but only handling specific types, using string matching on error messages instead of error codes or instanceof checks, or failing to narrow `unknown` catch variables before accessing properties.

3. **Missing finally blocks or cleanup code for resources**: File handles, database connections, network sockets, timers (setTimeout/setInterval), event listeners, child processes, streams, or AbortController signals acquired without cleanup on all paths (success, error, early return).

4. **State mutations before error-prone operations without rollback or compensation**: Modifying object properties, class state, module-level variables, or shared state before operations that can throw, leaving objects in inconsistent states when errors occur.

5. **Re-throwing errors with lost context**: `throw new Error(message)` without wrapping the original error as `cause`, or catching and re-throwing without preserving stack traces or error codes.

6. **Returning success values or default values from catch blocks when callers expect errors to propagate**: Catch blocks that return fallback values (null, empty arrays, default objects) when the calling contract expects errors to propagate, masking failures.

## Evidence Requirements

For each finding, you **must** provide:

- **Changed line number** containing the error handling code (try/catch/finally, error check, or cleanup code).
- **Control-flow trace** showing the error swallowing, missing cleanup, or incorrect propagation. Trace all paths: success, error, early return, re-throw.
- **Evidence that the behavior contradicts caller expectations or framework error-handling contracts**. Check:
  - Whether the repository uses a standard error class hierarchy (inspect other throw sites, error class definitions).
  - Whether the codebase uses framework error boundaries (e.g., Express error middleware, React error boundaries) and whether changed code integrates correctly.
  - Whether callers expect errors to propagate (inspect call sites, function signatures, return types).
  - Whether the repository uses RAII patterns, async cleanup hooks (Symbol.dispose, Symbol.asyncDispose), or manual cleanup conventions.
- **Description of the potential impact**: silent failure (caller cannot detect the error), resource leak (file handles, connections, timers not released), invalid state (object left inconsistent), lost error context (stack trace or error code discarded).
- **Reference to repository error class conventions or framework error boundaries** when analyzing integration (e.g., "This function is called from Express route handlers, which expect errors to be thrown or passed to next(err), but this catch block silently logs and returns null").

## Out of Scope

Do **not** report:

- **Style preferences** for error handling patterns (throw vs return error values, async/await vs .then/.catch).
- **Missing error handling in unchanged code** unless directly relevant to understanding a changed-line bug.
- **Architectural concerns** about error boundary placement, centralized error logging strategy, or error propagation layer design.
- **Error message wording or localization**.

## Analysis Steps

1. **Identify error handling in changed hunks**: Find try/catch/finally blocks, `.catch()` calls, error checks, cleanup code, or resource acquisition in changed lines.

2. **Trace control flow**: For each error handling site, trace all paths:
   - Success path: Does cleanup happen?
   - Error path: Does the error propagate (throw, return error value, callback with error)?
   - Early return path: Does cleanup happen before return?
   - Re-throw path: Is the original error preserved?

3. **Check repository error class conventions**:
   - Grep for `class \w+Error extends` to find custom error classes.
   - Read examples of throw sites to understand error wrapping patterns (e.g., `{ cause: originalError }`).
   - Check if the repository uses error codes (e.g., `SkillRunnerError` with `code` property).

4. **Check framework error boundaries**:
   - Grep for framework-specific error handlers (Express `app.use((err, req, res, next) => ...)`, React `componentDidCatch`, etc.).
   - Verify changed code integrates correctly (e.g., Express route handlers should throw or call `next(err)`, not return null).

5. **Check resource cleanup patterns**:
   - Grep for resource acquisition patterns (`readFileSync`, `createReadStream`, `setTimeout`, `setInterval`, `addEventListener`, `spawn`, `createConnection`).
   - Check if the repository uses RAII patterns (Symbol.dispose), finally blocks, or manual cleanup.
   - Verify all acquired resources are released on all paths.

6. **Trace error propagation across function boundaries**:
   - If a function catches and logs an error but does not re-throw or return an error value, grep for call sites to confirm callers can detect the failure.
   - Check function signatures and return types (Promise<void> vs Promise<Result>, etc.).

7. **Narrow TypeScript `unknown` catch variables**:
   - If tsconfig.json has `strict: true` or `useUnknownInCatchVariables: true`, catch variables are `unknown`.
   - Check if catch blocks perform type narrowing (`instanceof`, `typeof`, type guards) before accessing error properties.

8. **Check for deployment or framework context**: If missing, note in the finding rationale how missing error boundaries might affect impact; still report errors that prevent callers from detecting failures or that leak resources.

## False Positive Controls

- **Empty catch blocks for intentional error suppression**: If surrounding comments or code context (e.g., `// Ignore telemetry errors`) justify silent error suppression, and the operation is truly optional, do not report.
- **Catch-and-return-default for optional operations**: If the function contract clearly documents that errors result in a default value (e.g., `getConfigOrDefault`), and callers do not need to distinguish success from failure, do not report.
- **Framework-provided cleanup**: If a framework guarantees automatic cleanup (e.g., React useEffect cleanup, ORM connection pooling), and the repository uses that framework correctly, do not report missing manual cleanup.
- **Intentional error re-throw without wrapping**: If the repository pattern is to re-throw errors as-is (grep for examples), and the original stack trace is preserved, do not report lost context.

## Confidence and Severity Calibration

- **High confidence, high severity**: Swallowed errors in critical paths (authentication, payment processing, data writes), resource leaks for scarce resources (database connections, file handles), state corruption in shared state.
- **High confidence, medium severity**: Swallowed errors in non-critical paths (telemetry, logging), resource leaks for abundant resources (timers, event listeners), lost error context in propagation.
- **Medium confidence, medium severity**: Missing cleanup when deployment context is unknown (could be short-lived CLI script or long-lived server), incorrect error type checks when error class hierarchy is inferred but not documented.
- **Low confidence**: Missing error handling when caller expectations are ambiguous, resource cleanup when framework integration is unclear.

When confidence is below high, include the rationale in the finding and cite missing context.

## Remediation Expectations

For each finding, describe the expected fix:

- **Swallowed errors**: Re-throw the error (`throw error`), return an error value (Result type, callback with error), or take compensating action (retry, fallback) and document why suppression is correct.
- **Incorrect error type checks**: Use `instanceof` for error classes, check error codes instead of message strings, narrow `unknown` catch variables with type guards.
- **Missing cleanup**: Add `finally` block, use `Symbol.dispose`/`Symbol.asyncDispose` for RAII, or move cleanup to a dedicated function called on all paths.
- **State mutations before errors**: Move state updates after error-prone operations, or implement rollback/compensation logic in catch blocks.
- **Lost error context**: Wrap errors with `{ cause: originalError }`, preserve error codes, include original stack trace.
- **Returning success from catch**: Remove the catch block (let error propagate), or change function contract to document that errors return default values.

## Output Requirements

Report findings using Warden's **existing report schema**. Do **not** invent a custom output format.

- Each finding must cite the **changed line number**, the error handling issue, the affected control-flow paths, and the potential impact.
- When evidence is insufficient (e.g., caller expectations are ambiguous, framework integration is unclear, deployment context is missing), do **not** report a finding. Instead, note the missing context in the rationale if you report related findings.
- Return **no findings** when concrete evidence does not meet the threshold.

## Framework and Runtime Caveats

- **TypeScript strict mode**: If tsconfig.json has `strict: true`, catch variables are `unknown` by default. Check if catch blocks narrow types before accessing properties.
- **Node.js event loop**: Long-lived processes (servers, daemons) amplify resource leak impact. Short-lived processes (CLI scripts, serverless functions) may tolerate leaks. If deployment context is missing, note this in the finding rationale.
- **Express error middleware**: Express applications should use `app.use((err, req, res, next) => ...)` for centralized error handling. Route handlers should throw or call `next(err)`, not return null or log and continue.
- **React error boundaries**: React components should use `componentDidCatch` or error boundaries. Errors in render should propagate, not be caught and suppressed.
- **Symbol.dispose and Symbol.asyncDispose**: Modern JavaScript (ES2024+) supports explicit resource management with `using` and `await using` keywords. If the repository uses these, verify they are applied consistently.
- **AbortController**: Async operations that support cancellation should check `abortController.signal.aborted` and clean up when aborted. Missing abort handling can cause resource leaks or incorrect behavior.

## Example Patterns

**Swallowed error (report)**:
```typescript
try {
  await sendNotification(user);
} catch (error) {
  console.error('Notification failed', error); // Logged but not propagated
}
// Caller cannot detect notification failure
```

**Missing cleanup (report)**:
```typescript
const handle = fs.openSync(path, 'r');
try {
  processFile(handle);
} catch (error) {
  throw error; // Re-throws but does not close handle on error path
}
fs.closeSync(handle); // Only closes on success path
```

**Lost error context (report)**:
```typescript
try {
  await fetchData();
} catch (error) {
  throw new Error('Fetch failed'); // Original error and stack trace lost
}
```

**Correct error wrapping (do not report)**:
```typescript
try {
  await fetchData();
} catch (error) {
  throw new DataFetchError('Fetch failed', { cause: error }); // Preserves original error
}
```

**Correct cleanup (do not report)**:
```typescript
const handle = fs.openSync(path, 'r');
try {
  processFile(handle);
} finally {
  fs.closeSync(handle); // Cleanup on all paths
}
```

**Intentional error suppression with justification (do not report)**:
```typescript
try {
  Sentry.captureException(error);
} catch {
  // Ignore telemetry errors; never break the workflow
}
```
