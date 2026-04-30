# resource-lifecycle-errors Specification

## Intent

This child skill detects resource lifecycle and cleanup errors in TypeScript code: missing cleanup for timers, event listeners, child processes, file handles, database connections, streams, AbortController signals, and framework lifecycle hooks (React useEffect, Angular ngOnDestroy, etc.). These errors cause memory leaks, handle exhaustion, and zombie processes in long-lived applications.

## Scope

### In Scope

- **Timer leaks**: `setTimeout`, `setInterval` without `clearTimeout`, `clearInterval` on all control-flow paths
- **Event listener leaks**: `addEventListener`, `.on()`, `.once()` without `removeEventListener`, `.off()`
- **Child process leaks**: `spawn`, `exec`, `fork` without exit handlers or `kill()` calls
- **File handle leaks**: File streams, `fs.open` without close or destroy
- **Database connection leaks**: Connection pools, clients without close or destroy
- **Stream leaks**: Readable, Writable, Transform without end, destroy, or error handlers
- **AbortController misuse**: Signals created but not used to cancel pending operations
- **React effect leaks**: `useEffect` without cleanup return function for subscriptions, timers, listeners
- **Framework lifecycle leaks**: Angular `ngOnDestroy`, Vue `beforeUnmount` missing cleanup
- **Control-flow validation**: Cleanup missing on success, error, or early return paths
- **Repository cleanup conventions**: Verification that changed code follows existing patterns

### Out of Scope

- Style preferences for cleanup patterns (finally vs defer vs automatic disposal)
- Missing cleanup in unchanged code unless directly relevant to understanding a changed-line bug
- Architectural concerns about resource management strategy or centralized cleanup
- Performance impact of cleanup operations
- Cleanup that is handled correctly (no false positives)

## Users And Trigger Context

- **Primary users**: Warden users running find-bugs against TypeScript repositories with timers, event listeners, child processes, file I/O, database connections, or React/framework components.
- **Trigger language**: "resource lifecycle errors", "missing cleanup", "memory leak", "timer leak", "event listener leak", "zombie process", "useEffect cleanup", "handle exhaustion"
- **Should not trigger for**: Correctly cleaned up resources, short-lived CLI processes that exit immediately (unless deployment context is long-lived), intentional module-level singletons.

## Runtime Contract

### Required Investigation

1. **Read tsconfig.json** to confirm strict mode and resource safety settings.
2. **Grep for cleanup patterns** across the repository: `clearTimeout`, `clearInterval`, `removeEventListener`, `off(`, `destroy(`, `close(`, `end(`, `finally`, `useEffect`, `Symbol.dispose`, `Symbol.asyncDispose`.
3. **Identify repository cleanup conventions**: RAII patterns, AsyncDisposable, manual cleanup, helper functions.
4. **Trace control flow** for each changed resource acquisition: success paths, error paths, framework lifecycle paths.

### External Documentation

Use WebSearch or WebFetch for current public documentation when external behavior affects findings:

- TypeScript / Node.js: `Symbol.dispose`, `Symbol.asyncDispose`, `AsyncDisposableStack`, `using` keywords
- Framework lifecycle: React `useEffect`, Angular `ngOnDestroy`, Vue `beforeUnmount`
- Node.js EventEmitter: `removeListener`, `removeAllListeners`, memory leak prevention
- Child process handling: exit handlers, zombie prevention

**Prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.**

### Evidence Requirements

1. **Changed line number** containing resource acquisition
2. **Control-flow trace** showing missing cleanup path (success, error, or early return)
3. **Resource type evidence**: Confirm resource requires explicit cleanup and no cleanup exists on all paths
4. **Impact description**: Resource leak, handle exhaustion, zombie process, memory leak
5. **Repository context**: Reference to cleanup conventions, framework lifecycle hooks, unchanged code patterns

### Output Format

Return only concrete findings accepted by Warden's existing report schema. Do not invent a custom output schema.

Return no findings when evidence is insufficient.

## Source And Evidence Model

### Authoritative Sources

- **Repository tsconfig.json**: TypeScript strict mode and compiler settings
- **Repository source code**: Existing cleanup patterns, framework usage, resource acquisition
- **Changed hunks**: Lines containing resource acquisition without cleanup
- **Official TypeScript documentation**: `Symbol.dispose`, `Symbol.asyncDispose`, `using` keyword
- **Official Node.js documentation**: EventEmitter, child processes, streams, file system
- **Official React documentation**: `useEffect` cleanup functions
- **TC39 proposal**: Explicit Resource Management (Symbol.dispose, Symbol.asyncDispose)

### Useful Improvement Sources

- User feedback on false positives (cleanup exists but not detected)
- Framework-specific cleanup patterns not yet covered
- Modern disposal patterns (AsyncDisposableStack, using keyword) adoption in repositories

### Data That Must Not Be Stored

- Repository code excerpts beyond what's needed for reproducible findings
- Private file paths or internal implementation details
- Secrets, credentials, or proprietary resource management logic

## Reference Architecture

### Resource Types and Cleanup Patterns

| Resource Type | Acquisition | Cleanup | Framework Integration |
|---------------|-------------|---------|----------------------|
| Timer | `setTimeout`, `setInterval` | `clearTimeout`, `clearInterval` | React useEffect return |
| Event listener | `addEventListener`, `.on()` | `removeEventListener`, `.off()` | React useEffect return, Angular ngOnDestroy |
| Child process | `spawn`, `exec`, `fork` | exit handlers, `kill()` | Process-level listeners |
| File handle | `fs.open`, `createReadStream` | `fs.close`, `.destroy()` | try-finally, AsyncDisposable |
| DB connection | `createConnection`, `pool.connect` | `.close()`, `.destroy()` | try-finally, AsyncDisposable |
| Stream | `new Readable()`, `new Writable()` | `.end()`, `.destroy()` | pipeline, AsyncDisposable |
| AbortController | `new AbortController()` | `.abort()` on cleanup | React useEffect return |

### Control-Flow Paths

- **Success path**: Resource acquired, used, and function/component completes normally
- **Error path**: Resource acquired, exception thrown, catch block or early return
- **Framework lifecycle**: Component mounts, resource acquired, component unmounts
- **Cleanup verification**: Cleanup must exist on **all** paths or use try-finally / AsyncDisposable

## Evaluation

### Lightweight Validation

- Run grep across test fixtures and eval cases for timers, event listeners, child processes
- Confirm the skill detects missing `clearInterval` in `evals/fixtures/stale-closure/counter.tsx`
- Confirm the skill detects correct cleanup in `src/cli/output/live-status.tsx` (returns cleanup function)

### Behavioral Validation

- Run against eval fixture `evals/fixtures/stale-closure/counter.tsx` (missing cleanup for stale closure, but cleanup function exists—should NOT report)
- Run against synthetic examples: timer without cleanup, event listener without cleanup, child process without exit handler
- Verify findings cite changed line number, control-flow trace, resource type, and remediation

### Acceptance Gates

- No false positives when cleanup exists on all paths
- No false positives for short-lived CLI processes (note in rationale)
- No false positives for framework-managed cleanup (verify with official docs)
- Findings include concrete remediation with code examples
- Findings reference repository cleanup conventions when available

## Known Limitations

- **Cannot detect dynamic resource acquisition**: If resource creation is in a helper function not visible in changed hunks, may miss leaks.
- **Framework-specific patterns**: May not recognize all framework cleanup patterns without explicit documentation lookup.
- **Deployment context unknown**: Cannot always distinguish long-lived servers from short-lived CLI processes; must note in rationale.
- **Custom disposal patterns**: Repositories using custom RAII or disposal utilities may not be recognized without deep investigation.

## Maintenance Notes

- **Update for new disposal patterns**: When TC39 `using` keyword and `Symbol.dispose` become widely adopted, update examples and detection.
- **Add framework coverage**: When new frameworks or lifecycle hooks are added to repositories, update framework lifecycle detection.
- **Refine false-positive controls**: As user feedback identifies false positives, refine control-flow analysis and framework detection.
- **Monitor Node.js / TypeScript releases**: Track new resource management features (AsyncDisposable, DisposableStack) and update documentation references.
