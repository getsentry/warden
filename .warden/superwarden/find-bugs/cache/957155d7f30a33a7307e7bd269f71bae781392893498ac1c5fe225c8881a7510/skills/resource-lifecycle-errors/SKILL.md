---
name: resource-lifecycle-errors
description: "Use when analyzing TypeScript code for resource lifecycle and cleanup errors including missing cleanup for timers, event listeners, child processes, file handles, and React effects that can cause memory leaks or handle exhaustion."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent **find-bugs** and task **resource-lifecycle-errors**.

## Objective

Find logical errors in resource acquisition, usage, and cleanup that cause leaks, handle exhaustion, or zombie processes in changed TypeScript code.

## Investigation Protocol

### Required Repository Investigation

You **must** perform deep repo-local investigation with Read, Grep, and Glob before reporting findings:

1. **Read tsconfig.json** to confirm TypeScript strict mode settings and whether the repository enables compile-time resource safety.

2. **Search for cleanup patterns** across the repository:
   - `clearTimeout`, `clearInterval`, `removeEventListener`, `off(`, `destroy(`, `close(`, `end(`
   - `finally` blocks, try-catch-finally patterns
   - `useEffect` cleanup return functions in React components
   - `Symbol.dispose`, `Symbol.asyncDispose`, `using`, `await using` for modern disposal patterns
   - Framework lifecycle hooks: `componentWillUnmount`, `ngOnDestroy`, etc.

3. **Identify repository cleanup conventions**:
   - Does the repository use RAII patterns, AsyncDisposable, or manual cleanup?
   - Are there helper functions or utilities that manage resource cleanup?
   - What patterns exist in unchanged code for similar resource types?

4. **Trace control flow** for each changed resource acquisition:
   - All success paths
   - Error paths (catch blocks, early returns, guard failures)
   - Framework lifecycle paths (component unmount, route changes, etc.)

### External Documentation Usage

You **must** use WebSearch or WebFetch for current public documentation when external behavior affects findings:

- **TypeScript / Node.js resource management**: Use official TypeScript, Node.js, and TC39 documentation for `Symbol.dispose`, `Symbol.asyncDispose`, `AsyncDisposableStack`, and `using` keywords.
- **Framework lifecycle hooks**: Use official React, Angular, Vue, or other framework documentation for cleanup patterns in `useEffect`, `componentWillUnmount`, etc.
- **Node.js event emitters**: Use Node.js documentation for `EventEmitter`, `removeListener`, `removeAllListeners`, and memory leak prevention.
- **Child process handling**: Use Node.js documentation for child process cleanup, exit handlers, and zombie process prevention.

**Prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.** Use only public framework, package, API, and documentation names.

## Evidence Requirements

Report findings **only** when you have concrete evidence:

1. **Changed line number** containing the resource acquisition:
   - `setTimeout`, `setInterval`
   - `addEventListener`, `.on()`, `.once()`
   - `spawn`, `exec`, `fork`
   - `createReadStream`, `createWriteStream`, `fs.open`
   - `createConnection`, `pool.connect`
   - React `useEffect`, Angular `ngOnInit`, etc.
   - `new AbortController()`, `signal` creation

2. **Control-flow trace** showing the missing cleanup path:
   - Success path without cleanup
   - Error path (catch block, early return) without cleanup
   - Component unmount / lifecycle termination without cleanup

3. **Resource type evidence**:
   - Confirm the resource type requires explicit cleanup (not garbage-collected)
   - Show no cleanup exists on **all** paths
   - Demonstrate cleanup is not handled by framework or helper utilities

4. **Impact description**:
   - Resource leak (timers continue after component unmount)
   - Handle exhaustion (too many open file descriptors, connections)
   - Zombie process (child process not reaped)
   - Memory leak (event listeners accumulate)

5. **Repository context**:
   - Reference to repository cleanup conventions when analyzing integration
   - Framework lifecycle hooks and whether changed code follows them
   - Evidence from unchanged code showing expected cleanup patterns

## Scope and Out-of-Scope

### In Scope

- **Timers**: `setTimeout`, `setInterval` without `clearTimeout`, `clearInterval`
- **Event listeners**: `addEventListener`, `.on()`, `.once()` without `removeEventListener`, `.off()`
- **Child processes**: `spawn`, `exec`, `fork` without exit handlers or `kill()` calls
- **File handles**: File streams, `fs.open` without close or destroy
- **Database connections**: Connection pools, clients without close or destroy
- **Streams**: Readable, Writable, Transform without end, destroy, or error handlers
- **AbortController**: Signals created but not used to cancel pending operations
- **React effects**: `useEffect` without cleanup return function for subscriptions, timers, listeners
- **Framework lifecycle**: Angular `ngOnDestroy`, Vue `beforeUnmount` missing cleanup

### Out of Scope

- **Style preferences** for cleanup patterns (finally vs defer vs automatic disposal)
- **Missing cleanup in unchanged code** unless directly relevant to understanding a changed-line bug
- **Architectural concerns** about resource management strategy or centralized cleanup
- **Performance impact** of cleanup operations
- **Cleanup that is handled correctly** (don't report false positives when cleanup exists)

## False-Positive Controls

### Do Not Report

1. **Cleanup exists on all paths**: If try-finally, framework cleanup hook, or disposal pattern correctly cleans up the resource.

2. **Framework handles cleanup**: React unmount, Angular destroy, or other framework lifecycle automatically cleans up (verify with official docs).

3. **Resource is short-lived**: CLI scripts, serverless functions, or one-shot processes where the process exits immediately (but note the deployment context in rationale).

4. **Intentional long-lived resources**: Module-level singletons, global event emitters, or process-level listeners that should not be cleaned up.

5. **Cleanup handled by library**: When a library or utility function owns the resource and provides cleanup guarantees (verify from library docs or repo patterns).

### Exploitability Prerequisites

For each finding, confirm:

- **Deployment environment matters**: Long-lived processes (servers, daemons) vs short-lived (CLI, serverless). Note in rationale when deployment is unknown.
- **Trigger frequency**: How often the resource is acquired (per request, per component render, per event).
- **Leak accumulation**: Whether repeated acquisition without cleanup exhausts resources (file descriptors, memory, connections).

## Confidence and Severity Calibration

### High Confidence

- Control-flow analysis proves cleanup is missing on all paths
- Repository cleanup conventions exist and changed code violates them
- Resource type is documented as requiring explicit cleanup
- Similar code in the repository correctly performs cleanup

### Medium Confidence

- Cleanup appears missing but repository conventions are unclear
- Framework lifecycle may handle cleanup but documentation is ambiguous
- Deployment environment unknown (long-lived vs short-lived process)

### Low Confidence

- Unclear whether library or framework provides automatic cleanup
- Repository uses custom cleanup patterns not fully understood from local inspection

### Severity Levels

**Critical**: Child process leak causing zombie accumulation, file handle leak causing system-wide descriptor exhaustion in production servers.

**High**: Timer or event listener leak in React components causing memory growth on every render or navigation, database connection leak causing pool exhaustion.

**Medium**: Timer leak in long-lived server process but infrequent trigger, AbortController not used to cancel requests (causes unnecessary work but not handle exhaustion).

**Low**: Missing cleanup in short-lived CLI process that exits immediately, or cleanup missing in test fixtures.

## Remediation Patterns

Provide **concrete, actionable remediation** for each finding:

### Timers

```typescript
// Bad
useEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
}, []);

// Good
useEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(timer);
}, []);
```

### Event Listeners

```typescript
// Bad
useEffect(() => {
  window.addEventListener('resize', handler);
}, []);

// Good
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### Child Processes

```typescript
// Bad
const child = spawn('command');

// Good
const child = spawn('command');
child.on('exit', (code) => console.log('exited', code));
child.on('error', (err) => console.error('error', err));
// Ensure kill on parent exit
process.on('exit', () => child.kill());
```

### AbortController

```typescript
// Bad
const controller = new AbortController();
fetch(url); // signal not used

// Good
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// Cleanup on unmount
return () => controller.abort();
```

### Modern Disposal (TypeScript 5.2+)

```typescript
// Using Symbol.asyncDispose
class Resource implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await this.cleanup();
  }
}

// Using await using
await using resource = new Resource();
// Automatically disposed at scope exit
```

## Framework and Runtime Caveats

### React

- **useEffect cleanup**: Must return cleanup function for subscriptions, timers, listeners.
- **Stale closures**: Ensure cleanup captures current values or uses functional setState.
- **React 18+**: StrictMode may unmount/remount in dev; cleanup must be idempotent.

### Node.js

- **EventEmitter**: `removeListener` removes one listener; `removeAllListeners` removes all (may affect third-party code).
- **Child processes**: Must handle both `exit` and `error` events to prevent zombies.
- **AsyncDisposable**: Requires Node.js 20.9+ and TypeScript 5.2+.

### Deployment Context

- **Long-lived processes** (servers, daemons): Resource leaks accumulate and cause exhaustion.
- **Short-lived processes** (CLI, serverless): Leaks may be acceptable if process exits immediately.
- **Unknown deployment**: Report the issue but note in rationale that impact depends on process lifetime.

## Output Format

Return **only** concrete findings accepted by Warden's existing report schema. Do **not** invent a custom output schema.

For each finding:

- **File path and line number**: Changed line containing resource acquisition
- **Severity and confidence**: Calibrated per guidelines above
- **Title**: "Missing cleanup for [resource type]"
- **Description**: Changed line, resource type, missing cleanup path, potential impact
- **Evidence**: Control-flow trace, repository cleanup conventions, framework lifecycle hooks
- **Remediation**: Concrete code example showing correct cleanup pattern

**Return no findings when evidence is insufficient.** Do not report style issues, missing comments, or architectural concerns.

## Quality Bar: Security-Review Synthesis

This child skill has been synthesized to meet the security-review quality bar:

- ✓ **Vulnerability prerequisites**: Deployment environment, trigger frequency, leak accumulation
- ✓ **Exploitable dataflow examples**: Control-flow traces showing missing cleanup on all paths
- ✓ **False-positive controls**: Framework cleanup, short-lived processes, intentional long-lived resources
- ✓ **Severity/confidence calibration**: Based on deployment context, resource type, and repository conventions
- ✓ **Concrete remediation patterns**: Code examples for timers, listeners, processes, AbortController, modern disposal
- ✓ **Framework/runtime caveats**: React useEffect, Node.js EventEmitter, AsyncDisposable support, deployment context
