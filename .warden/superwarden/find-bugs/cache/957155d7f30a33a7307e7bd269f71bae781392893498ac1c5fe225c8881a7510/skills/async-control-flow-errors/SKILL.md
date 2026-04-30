---
name: async-control-flow-errors
description: "Use when analyzing TypeScript code for asynchronous control-flow errors: unhandled promise rejections, missing await keywords, race conditions from concurrent operations, async initialization errors, and event-loop blocking operations that cause silent failures, incorrect ordering, or timeouts."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill synthesized from parent skill `find-bugs` for task `async-control-flow-errors`.

## Task

Analyze TypeScript code for asynchronous control-flow errors that cause silent failures, incorrect ordering, or unhandled rejections. Find logical errors in async/await usage, promise chains, parallel execution, and async initialization.

## Execution Instructions

### Repository Investigation Requirements

You MUST perform deep repo-local investigation before reporting findings:

1. **Use Read, Grep, and Glob** to inspect:
   - `tsconfig.json` for TypeScript compiler configuration (strict mode, target runtime)
   - `package.json` for Node.js version requirements and framework dependencies
   - Entry points (`src/cli/index.ts`, `src/action/main.ts`) for global unhandled rejection handlers
   - Changed files and their imports to trace async operations and error boundaries
   - Project-wide patterns for error handling (try/catch, `.catch()`, process-level listeners)
   - Framework-specific async patterns (React useEffect cleanup, Express middleware, etc.)

2. **Use WebSearch or WebFetch** for current public documentation when:
   - Node.js async behavior affects finding correctness (e.g., unhandled rejection policies, event-loop semantics)
   - Framework-specific async boundaries matter (e.g., Next.js server components, React concurrent rendering)
   - Library async contracts are unclear (e.g., Promise.all error propagation, AbortController integration)

3. **NEVER send to web tools:**
   - Repository code excerpts, file paths, or proprietary implementation details
   - Secrets, API keys, customer data, or internal service names
   - Use only public framework names, package names, API surface, and documentation URLs

### Async Error Patterns to Detect

Inspect changed hunks for these async control-flow errors:

#### 1. Unhandled Promise Rejections

- **Pattern:** Promises returned from functions but not awaited or caught by callers
- **Pattern:** Async functions whose rejections are not handled with try/catch or .catch()
- **Analysis:** Trace the async operation to confirm whether a handler exists
- **Check:** Look for global unhandled rejection handlers (`process.on('unhandledRejection')`) in entry points
- **Mitigation:** If a global handler exists, note it but still report missing local handlers when local recovery is needed
- **Impact:** Silent failure, incorrect ordering, timeout, or process crash (especially in Node.js 15+)

#### 2. Missing Await Keywords

- **Pattern:** Missing await where sequential ordering is required
- **Pattern:** Assigning promise to variable without await, treating promise object as resolved value
- **Example:** `const cached = loadFromCache(key);` when `loadFromCache` returns `Promise<string>`
- **Analysis:** Trace data flow to confirm the value is used as if synchronous
- **Impact:** Logic errors, type coercion bugs, truthy checks always passing on Promise objects

#### 3. Race Conditions from Concurrent Operations

- **Pattern:** Parallel writes to shared state without synchronization
- **Pattern:** Concurrent file operations without locking or ordering guarantees
- **Pattern:** Multiple async operations that assume sequential execution order
- **Analysis:** Trace whether concurrent access is possible (multiple event handlers, parallel Promise.all, timers)
- **Check:** Look for synchronization primitives (Semaphore, Mutex, queues) in the codebase
- **Impact:** Corrupted state, inconsistent data, non-deterministic failures

#### 4. Async Initialization Errors

- **Pattern:** Async operations in constructors that can fail silently
- **Pattern:** Top-level await in modules without proper error handling
- **Pattern:** Static factory methods that return promises but callers don't await them
- **Analysis:** Check if constructor performs async work vs. using static factory pattern
- **Reference:** Consult public TypeScript async constructor anti-patterns when analyzing initialization
- **Impact:** Partially initialized objects, silent failures during cold starts, race conditions on first use

#### 5. Event-Loop Blocking Operations

- **Pattern:** Synchronous I/O (readFileSync, writeFileSync, existsSync) inside async functions
- **Pattern:** CPU-intensive loops or recursion inside async functions
- **Pattern:** Large JSON.parse or JSON.stringify calls without chunking
- **Analysis:** Check if synchronous operation is on hot path (request handlers, event loops, timers)
- **Reference:** Use Node.js event-loop guidance to understand blocking vs. non-blocking
- **Impact:** Degraded throughput, request timeouts, unresponsive CLI, cold-start delays in serverless

#### 6. Promise Combinator Error Handling

- **Pattern:** Promise.all without error handling for partial failures
- **Pattern:** Promise.race without timeout or fallback handling
- **Pattern:** Missing .catch() on final handler in promise chains
- **Analysis:** Verify that errors propagate to a final handler
- **Reference:** Consult public Promise.all / Promise.allSettled best practices
- **Impact:** One rejection stops all operations, lost results, silent failures

#### 7. React/Framework-Specific Async Patterns

- **Pattern:** useEffect with async callbacks but missing cleanup
- **Pattern:** Stale closure captures in setInterval/setTimeout callbacks
- **Pattern:** Event listeners added without removeEventListener in cleanup
- **Example:** `setInterval(() => setCount(count + 1), 1000)` captures stale `count`
- **Analysis:** Check for cleanup return value in useEffect, dependency array correctness
- **Impact:** Memory leaks, stale data, incorrect state updates

### Evidence Requirements

Report findings ONLY when you have ALL of:

1. **Changed line number** containing the async operation, promise creation, or missing await
2. **Control-flow or data-flow trace** showing the unhandled rejection path or missing await consequence
3. **Concrete evidence** that no try/catch, .catch(), or process-level handler covers the rejection
4. **Runtime impact description:** silent failure, incorrect ordering, timeout, or process crash
5. **Public reference** to Node.js or framework async documentation when analyzing framework-provided error boundaries

### False-Positive Controls

**Do NOT report:**

- Style preferences for promise vs async/await syntax
- Architectural concerns about async boundaries or callback-based APIs
- Unhandled rejections in unchanged code unless directly relevant to understanding a changed-line bug
- Performance optimization suggestions for async operations
- Intentional fire-and-forget patterns where failure is acceptable (e.g., best-effort logging)
- Framework-provided error boundaries that automatically catch rejections (verify framework docs)

### Severity and Confidence Calibration

**Severity:**

- **High:** Unhandled rejection in request handler, missing await causing data corruption, constructor async initialization
- **Medium:** Missing error handler in background task, race condition in non-critical path, event-loop blocking in CLI
- **Low:** Missing await in test code, suboptimal promise combinator usage with degraded UX

**Confidence:**

- **High:** Data-flow trace confirms promise not awaited, no error handler on all paths, repository has no global handler
- **Medium:** Likely unhandled but framework may provide automatic boundary (check framework docs)
- **Low:** Unclear if caller handles rejection, deployment environment unknown, missing context on concurrency model

### Remediation Expectations

Each finding MUST include concrete remediation guidance:

- **Missing await:** Add `await` keyword or handle promise with `.then()/.catch()`
- **Unhandled rejection:** Wrap in try/catch, add `.catch()`, or propagate to caller with `async` signature
- **Race condition:** Use synchronization primitive (Semaphore, Mutex), serialize operations, or use immutable updates
- **Async initialization:** Refactor to static factory method, add initialization guard, document async contract
- **Event-loop blocking:** Replace sync I/O with async equivalent (`readFile` not `readFileSync`), move CPU work to worker thread
- **Promise.all partial failure:** Use `Promise.allSettled()` or wrap promises with error recovery

### Framework and Runtime Caveats

Note in finding rationale when:

- **Deployment environment unknown:** How serverless/edge runtimes amplify impact (cold-start failures, request timeouts)
- **Framework async boundaries unclear:** Whether framework provides automatic error handling (check docs, don't assume)
- **Node.js version matters:** Unhandled rejection behavior changed in Node.js 15+ (now crashes by default)
- **TypeScript strict mode disabled:** Missing compile-time async checks, increased runtime error risk

## Output Contract

Return findings using Warden's normal finding schema. Each finding must include:

- `severity`: 'low' | 'medium' | 'high'
- `confidence`: 'low' | 'medium' | 'high'
- `title`: Concise description of the async error
- `description`: Detailed explanation with control-flow trace, missing handler evidence, and runtime impact
- `location`: Changed line number, file path
- `suggestedFix`: Concrete remediation with code example
- `category`: 'bug'

Return NO findings when evidence is insufficient. Do not invent a custom output schema.
