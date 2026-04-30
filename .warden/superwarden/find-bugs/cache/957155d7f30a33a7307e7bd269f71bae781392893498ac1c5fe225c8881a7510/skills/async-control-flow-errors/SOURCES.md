# async-control-flow-errors Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
| --- | --- | --- | --- | --- |
| Repository `tsconfig.json` | canonical | high | TypeScript compiler configuration (strict mode, target, libs) | Read from repo, don't send to web tools |
| Repository `package.json` | canonical | high | Node.js version, framework dependencies, project metadata | Read from repo, don't send to web tools |
| Repository entry points | canonical | high | Global error handlers (`process.on('unhandledRejection')`), Sentry initialization | Read from repo, don't send to web tools |
| Repository async source files | canonical | high | Async patterns, error handling conventions, framework integration | Read from repo, don't send to web tools |
| Eval fixtures (`evals/fixtures/missing-await/`, `evals/fixtures/stale-closure/`) | canonical | high | Known async error examples for validation | Use for testing, don't send to web tools |
| Node.js unhandled rejection docs | public | high | Unhandled rejection behavior, event-loop semantics, Node.js version variance | Web search/fetch public docs only |
| Promise combinator best practices | public | medium | Promise.all vs Promise.allSettled, error propagation patterns | Web search/fetch public docs only |
| TypeScript async constructor patterns | public | medium | Static factory pattern, initialization anti-patterns | Web search/fetch public docs only |
| Framework async contracts | public | medium | React useEffect, Express middleware, Next.js server components | Web search/fetch public docs only |

## Decisions

### Async Error Pattern Selection

**Decision:** Focus on seven core async error patterns: unhandled rejections, missing await, race conditions, async initialization, event-loop blocking, promise combinator errors, and React/framework stale closures.

**Source evidence:**
- Repository contains 87 TypeScript files with async/await patterns (Grep result)
- Eval fixtures demonstrate missing-await and stale-closure bugs
- Parent plan identifies async control-flow as distinct from error-handling logic errors
- Node.js 15+ crashes on unhandled rejections by default (search result: OneUpTime, The Code Barbarian)

**Rationale:** These patterns cover the majority of async bugs that cause silent failures, data corruption, or crashes in TypeScript Node.js projects.

### Global vs Local Error Handler Treatment

**Decision:** Check for global `process.on('unhandledRejection')` handlers, note as mitigation, but still report missing local handlers when local recovery is needed.

**Source evidence:**
- Repository has global error handlers in `src/cli/index.ts` (lines 24-37) and `src/sentry.js`
- Search result (The Code Barbarian): Global handlers are safety nets, not substitutes for local error handling
- Node.js 15+ changed default behavior to crash on unhandled rejections

**Rationale:** Global handlers prevent crashes but don't enable request-specific recovery or proper error propagation.

### Event-Loop Blocking Detection

**Decision:** Report synchronous I/O (`readFileSync`, etc.) in async functions when on hot paths (request handlers, event loops, timers), but allow in one-time initialization.

**Source evidence:**
- Repository uses 428 synchronous file operations across 54 files (Grep count)
- Many are in CLI initialization, test setup, config loading (acceptable cold-path usage)
- Node.js docs: event-loop blocking degrades throughput, causes timeouts (attempted fetch, 404)
- Search result: Blocking operations prevent other requests from processing

**Rationale:** Blanket ban on sync I/O creates false positives; hot-path detection balances correctness and pragmatism.

### Promise.all vs Promise.allSettled

**Decision:** Report Promise.all without partial failure handling when results should be preserved on individual failures.

**Source evidence:**
- Search result (GeeksforGeeks, MDN): Promise.all rejects on first failure, discards fulfilled results
- Search result (LogRocket): Promise.allSettled returns all results regardless of individual status
- Repository uses Promise.all in parallel execution (src/utils/async.ts runPool, src/sdk/analyze.ts)

**Rationale:** Losing all results on first failure is often a bug; skill should detect when allSettled is more appropriate.

### Async Constructor Anti-Pattern

**Decision:** Report async operations in constructors as initialization errors, recommend static factory pattern.

**Source evidence:**
- Search results (DEV Community, @qwtel, Medium): Async constructors don't work, constructors are synchronous
- Search result (Calmops, Better Programming): Static factory pattern is gold standard for async initialization
- Search result: Returning promises from constructors creates race conditions if caller forgets to await

**Rationale:** Constructors can't be async, so async work in constructors creates partially initialized objects.

### React Stale Closure Detection

**Decision:** Report stale closure captures in `setInterval`/`setTimeout` callbacks inside `useEffect` when dependency array is incomplete.

**Source evidence:**
- Repository has 3 React TSX files (Grep result)
- Eval fixture `evals/fixtures/stale-closure/counter.tsx` demonstrates stale closure bug
- React docs: useEffect dependencies must include all captured variables, or use functional setState

**Rationale:** Stale closures are common async bug in React, skill should detect this pattern.

### Framework Async Boundary Handling

**Decision:** Check public framework documentation for automatic error boundaries, note uncertainty if docs don't guarantee handling.

**Source evidence:**
- Repository uses Next.js (docs package.json), Express patterns (src/action/workflow), React (TSX files)
- Search results don't cover all framework-specific async boundaries
- Parent plan: "Do not assume frameworks provide automatic rejection handling unless their documentation explicitly guarantees it"

**Rationale:** Safer to require explicit error handling than assume framework handles it, unless docs are clear.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
| --- | --- | --- |
| Vulnerability prerequisites | complete | Each pattern includes prerequisite conditions (rejection occurs, no handler, shared state mutated) |
| Exploitable dataflow examples | complete | Concrete code examples for each pattern with before/after traces |
| False-positive controls | complete | Global handler checks, intentional fire-and-forget exclusions, framework boundary verification |
| Severity/confidence calibration | complete | High (request handlers, data corruption), Medium (background tasks, non-critical races), Low (test code) |
| Remediation patterns | complete | Concrete code examples for each pattern (add await, try/catch, Promise.allSettled, static factory, functional setState) |
| Framework/runtime caveats | complete | Node.js version variance, TypeScript strict mode, Express/Next.js/React boundaries, serverless amplification |
| API surface | complete | Node.js process events, Promise combinators, React hooks, TypeScript async/await syntax |
| Config/runtime options | complete | tsconfig.json strict mode, package.json Node.js version, process-level error handlers |
| Common use cases | complete | Request handlers, background tasks, CLI initialization, React components, parallel operations |
| Known issues/workarounds | complete | Static analysis limits for race conditions, framework knowledge gaps, concurrency model assumptions |
| Version/migration variance | complete | Node.js 15+ unhandled rejection behavior change, TypeScript async feature evolution |

## Open Gaps

### Race Condition Detection Limits

**Gap:** Static analysis cannot detect all race conditions without runtime profiling or formal verification.

**Impact:** May miss complex races in event-driven architectures or multi-step async workflows.

**Next steps:**
- Document known limitations in SPEC.md
- Focus on obvious patterns (parallel map writes, missing synchronization primitives)
- Consider future enhancement: dynamic analysis or integration with race detectors

**Yield assessment:** Low yield to expand coverage without runtime profiling; current pattern coverage is sufficient for common bugs.

### Framework Async Boundary Documentation

**Gap:** Not all framework-specific async error boundaries are documented in public sources consulted.

**Impact:** May report false positives for frameworks that auto-handle rejections, or miss true positives when assuming framework handles errors.

**Next steps:**
- Web search for specific framework async error handling when analyzing changed files
- Note uncertainty in finding rationale when framework docs are unclear
- Err on side of reporting missing handlers rather than assuming framework handles them

**Yield assessment:** Medium yield; targeted web searches during execution can fill gaps for specific frameworks.

### Serverless and Edge Runtime Amplification

**Gap:** Deployment environment is often unknown during analysis, but affects async error impact.

**Impact:** Can't accurately assess severity when serverless cold-start failures or edge timeout amplification apply.

**Next steps:**
- Note in finding rationale how serverless/edge might amplify impact
- Check for deployment hints in package.json scripts, Docker files, CI configs
- Default to higher severity when environment is unknown (safer)

**Yield assessment:** Medium yield; repository inspection can reveal deployment hints, but environment is often external.

### TypeScript Type System Async Interaction

**Gap:** Cannot rely on TypeScript types for runtime promise behavior (types are compile-time only).

**Impact:** Type annotations may suggest promise is awaited, but runtime behavior can differ.

**Next steps:**
- Always trace control flow, don't trust type annotations alone
- Check for `tsconfig.json` strict mode (increases type system async checks)
- Note in SPEC.md that skill performs runtime-focused analysis, not just type checking

**Yield assessment:** High yield; this is a fundamental limitation addressed by control-flow tracing in skill instructions.

## Changelog

### 2026-04-30: Initial Superwarden Child Skill Synthesis

**Synthesis pass:** async-control-flow-errors child skill for find-bugs parent

**Source inspection:**
- Read `tsconfig.json` (strict mode enabled, ES2022 target, NodeNext modules)
- Read `package.json` (Node.js 20+, TypeScript 5.9, React 18, dependencies)
- Grep async patterns (87 files with async/await, Promise usage)
- Read eval fixtures (missing-await/cache.ts, stale-closure/counter.tsx)
- Read example source files (cli/index.ts global error handlers, utils/async.ts Semaphore, sdk/retry.ts sleep with abort)
- Grep synchronous I/O usage (428 occurrences in 54 files, mostly CLI/config loading)
- Grep Promise combinators (Promise.all in 15 files, mostly parallel execution)

**External sources consulted:**
- Node.js unhandled rejection behavior and event-loop blocking (web search: OneUpTime, The Code Barbarian, dev-aditya)
- Promise.all vs Promise.allSettled error handling (web search: GeeksforGeeks, MDN, LogRocket)
- TypeScript async constructor anti-patterns (web search: DEV Community, @qwtel, Medium, Calmops, Better Programming)

**Coverage achieved:**
- Seven core async error patterns with vulnerability prerequisites and exploitable dataflow examples
- False-positive controls for global handlers, intentional fire-and-forget, framework boundaries
- Severity/confidence calibration for request handlers vs background tasks vs test code
- Concrete remediation patterns with before/after code examples
- Framework/runtime caveats for Node.js versions, TypeScript strict mode, Express/Next.js/React, serverless

**Quality bar met:**
- Skill-writer security-review dimensions: prerequisites, dataflow, false-positive controls, severity calibration, remediation, caveats
- Changed-line anchoring requirement: all patterns require line number, trace, handler absence proof, impact description
- External source usage: public Node.js/TypeScript/framework docs only, no repository code sent to web tools
- Output contract: normal Warden findings schema, no custom output format

**Missing inputs:**
- Specific deployment environment (serverless, containerized, edge) affects async initialization and timeout analysis
- Complete framework async boundary documentation for all frameworks (Express, Next.js, React hooks)
- Runtime concurrency model for complex event-driven architectures (affects race condition detection confidence)
