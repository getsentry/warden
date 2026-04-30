# async-control-flow-errors Specification

## Intent

This child skill detects asynchronous control-flow errors in TypeScript code that cause silent failures, incorrect ordering, or unhandled rejections. It focuses on logical errors in async/await usage, promise chains, parallel execution, and async initialization that lead to runtime failures.

The skill is synthesized from the parent Superwarden skill `find-bugs` and inherits its quality bar: vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, concrete remediation patterns, and framework/runtime caveats.

## Scope

### In Scope

1. **Unhandled promise rejections** - promises returned but not awaited or caught, async functions without try/catch or .catch()
2. **Missing await keywords** - sequential ordering violations, promise objects treated as resolved values
3. **Race conditions** - concurrent writes to shared state, parallel file operations without locking
4. **Async initialization errors** - async operations in constructors, top-level await without error handling
5. **Event-loop blocking** - synchronous I/O in async functions, CPU-intensive loops blocking the event loop
6. **Promise combinator errors** - Promise.all without partial failure handling, missing final .catch() handlers
7. **React/framework async patterns** - useEffect cleanup, stale closures, missing event listener cleanup

### Out of Scope

1. Style preferences for promise vs async/await syntax
2. Architectural concerns about async boundaries or callback-based APIs
3. Unhandled rejections in unchanged code unless directly relevant to changed-line bugs
4. Performance optimization suggestions for async operations
5. Intentional fire-and-forget patterns where failure is acceptable

## Users And Trigger Context

- **Primary users:** Developers reviewing TypeScript pull requests, CI/CD workflows validating async correctness
- **Trigger context:** Changed hunks introducing or modifying async operations, promise chains, or concurrent logic
- **Common requests:** "Find unhandled rejections in this PR", "Check for missing awaits", "Detect race conditions in concurrent code"
- **Should not trigger for:** Style-only changes, documentation updates, test fixtures demonstrating intentional errors

## Runtime Contract

### Input

- Changed hunks from TypeScript files containing async/await, promises, or concurrent operations
- Repository context: `tsconfig.json`, `package.json`, global error handlers, framework configuration
- Access to Read, Grep, Glob tools for repo-local investigation
- Access to WebSearch, WebFetch for public Node.js/framework async documentation

### Output

- Findings matching Warden's standard schema (severity, confidence, title, description, location, suggestedFix, category)
- NO findings when evidence is insufficient
- NO custom output schema or analysis summaries

### Tool Usage Constraints

- **Local tools (Read, Grep, Glob):** MUST inspect tsconfig.json, package.json, entry points, changed files, error handling patterns
- **Web tools (WebSearch, WebFetch):** Use ONLY for public framework/runtime docs, NEVER for repository code or secrets
- **Public-only queries:** Framework names (Node.js, React, Express), package names, API surface, documentation URLs

## Source And Evidence Model

### Authoritative Sources

1. **Repository source files:** Changed hunks, tsconfig.json, package.json, entry points, error handler registration
2. **Node.js async documentation:** Unhandled rejection behavior, event-loop blocking patterns, promise semantics
3. **Framework async contracts:** React useEffect cleanup, Express error middleware, Next.js server component async
4. **TypeScript async patterns:** Constructor initialization anti-patterns, type system interaction with promises

### Evidence Chain Requirements

Each finding requires:

1. **Changed line** containing async operation, promise creation, or missing await
2. **Data-flow or control-flow trace** showing unhandled path or missing await consequence
3. **Handler absence proof** - no try/catch, no .catch(), no global handler covers this path
4. **Runtime impact** - silent failure, incorrect ordering, timeout, crash, data corruption
5. **Public reference** - Node.js docs, framework docs, TypeScript async guidance

### Missing Context Handling

When context is missing:

- **Deployment environment unknown:** Note how serverless/edge amplifies impact in finding rationale
- **Framework boundaries unclear:** Check public framework docs, note uncertainty if docs don't guarantee handling
- **Concurrency model unclear:** Report obvious violations, note missing context for borderline cases
- **TypeScript config missing:** Attempt to infer from source, note reduced confidence

## Reference Architecture

### Async Error Patterns

#### Unhandled Promise Rejections

**Vulnerability prerequisite:** Promise rejection occurs, no handler on rejection path, no global fallback

**Exploitable dataflow:**
```typescript
// Changed line: async operation without await or .catch()
async function processData(id: string) {
  fetchData(id); // Returns Promise<Data>, rejection unhandled
  return "success";
}
```

**False-positive control:** Check for global `process.on('unhandledRejection')` handler, verify framework doesn't auto-handle

**Remediation:**
```typescript
async function processData(id: string) {
  await fetchData(id); // Now rejection propagates to caller
  return "success";
}
// OR
async function processData(id: string) {
  fetchData(id).catch(err => logger.error('Failed to fetch', err));
  return "success";
}
```

#### Missing Await

**Vulnerability prerequisite:** Async function returns promise, caller treats return value as synchronous

**Exploitable dataflow:**
```typescript
// Changed line: missing await
const cached = loadFromCache(key); // Returns Promise<string | null>
if (cached) { // Promise is truthy, always true!
  return cached; // Returns Promise object, not string
}
```

**False-positive control:** Verify value is actually used synchronously (property access, type checks, return)

**Remediation:**
```typescript
const cached = await loadFromCache(key);
if (cached) {
  return cached;
}
```

#### Race Conditions

**Vulnerability prerequisite:** Multiple concurrent operations mutate shared state, no synchronization

**Exploitable dataflow:**
```typescript
// Changed line: concurrent writes without synchronization
await Promise.all(items.map(item => {
  cache.set(item.key, item.value); // Race on cache Map
  stats.processed++; // Race on counter
}));
```

**False-positive control:** Check for immutability patterns, synchronization primitives, single-threaded guarantees

**Remediation:**
```typescript
const semaphore = new Semaphore(1);
await Promise.all(items.map(async item => {
  await semaphore.acquire();
  try {
    cache.set(item.key, item.value);
    stats.processed++;
  } finally {
    semaphore.release();
  }
}));
```

#### Async Initialization

**Vulnerability prerequisite:** Constructor performs async work, caller uses object before initialization completes

**Exploitable dataflow:**
```typescript
// Changed line: async in constructor
class DataStore {
  private data: Map<string, string>;
  constructor() {
    this.loadFromDisk(); // Returns Promise, not awaited
  }
  async loadFromDisk() {
    this.data = await readData();
  }
}
```

**False-positive control:** Check for static factory pattern, initialization guards, documented async contract

**Remediation:**
```typescript
class DataStore {
  private data: Map<string, string>;
  private constructor() {}
  static async create(): Promise<DataStore> {
    const store = new DataStore();
    store.data = await readData();
    return store;
  }
}
```

#### Event-Loop Blocking

**Vulnerability prerequisite:** Synchronous blocking operation inside async function on hot path

**Exploitable dataflow:**
```typescript
// Changed line: sync I/O in async request handler
async function handleRequest(req: Request) {
  const config = JSON.parse(readFileSync('./config.json', 'utf-8')); // Blocks event loop
  return processRequest(req, config);
}
```

**False-positive control:** Check if operation is on hot path vs. one-time initialization, small vs. large files

**Remediation:**
```typescript
async function handleRequest(req: Request) {
  const config = JSON.parse(await readFile('./config.json', 'utf-8'));
  return processRequest(req, config);
}
```

#### Promise.all Partial Failures

**Vulnerability prerequisite:** Promise.all used when some operations can fail, results lost on first rejection

**Exploitable dataflow:**
```typescript
// Changed line: Promise.all without partial failure handling
const results = await Promise.all([
  fetchUser(id1),
  fetchUser(id2),
  fetchUser(id3),
]); // If any fetch fails, all results lost
```

**False-positive control:** Check if all-or-nothing semantics are correct for this use case

**Remediation:**
```typescript
const results = await Promise.allSettled([
  fetchUser(id1),
  fetchUser(id2),
  fetchUser(id3),
]);
const users = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
const errors = results
  .filter(r => r.status === 'rejected')
  .map(r => r.reason);
```

#### React Stale Closures

**Vulnerability prerequisite:** useEffect captures state variable, timer callback reads stale value

**Exploitable dataflow:**
```typescript
// Changed line: stale closure in setInterval
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // Captures stale count from mount time
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps, closure never updates
```

**False-positive control:** Check dependency array, functional setState, effect cleanup

**Remediation:**
```typescript
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1); // Functional update, no stale closure
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### Framework and Runtime Caveats

#### Node.js Version Variance

- **Node.js 15+:** Unhandled rejections crash the process by default
- **Node.js 14 and earlier:** Unhandled rejections log warnings but don't crash
- **Impact:** Same code has different failure modes depending on runtime version
- **Detection:** Check `package.json` engines field for Node.js version requirements

#### TypeScript Strict Mode

- **Strict mode enabled:** Compiler catches some missing await cases via type checking
- **Strict mode disabled:** More runtime errors slip through, reduced confidence in type safety
- **Detection:** Check `tsconfig.json` for `"strict": true`

#### Framework Async Boundaries

- **Express:** Error middleware catches async route handler errors if handler is wrapped properly
- **Next.js:** Server components automatically handle async errors, API routes need explicit try/catch
- **React:** useEffect cleanup prevents memory leaks, but doesn't catch async errors
- **Detection:** Check framework imports, look for error middleware registration, consult framework docs

#### Serverless and Edge Runtimes

- **Cold starts:** Async initialization errors more likely, longer timeout windows
- **Request timeouts:** Event-loop blocking causes timeouts faster than traditional servers
- **Memory constraints:** Resource leaks from missing cleanup hit limits faster
- **Detection:** Note in finding rationale when deployment environment is unknown

## Evaluation

### Lightweight Validation

1. **Grep for async patterns:** Find files with `async`, `Promise`, `await`
2. **Read sample files:** Verify skill can trace async operations across functions
3. **Check external sources:** Confirm Node.js async docs are accessible and current

### Behavioral Validation

1. **True positives:** Detect missing await in `evals/fixtures/missing-await/cache.ts`
2. **True positives:** Detect stale closure in `evals/fixtures/stale-closure/counter.tsx`
3. **False positives:** Don't report global error handlers that properly catch rejections
4. **False positives:** Don't report intentional fire-and-forget patterns with fallback logic

### Acceptance Gates

- All findings anchor to changed lines with concrete evidence
- No findings when repository uses framework error boundaries that auto-handle rejections
- Severity calibration matches impact: high for request handlers, medium for background tasks, low for test code
- Remediation includes concrete code examples, not vague suggestions

## Known Limitations

1. **Static analysis limits:** Cannot detect all race conditions without runtime profiling
2. **Framework knowledge gaps:** May miss framework-specific async boundaries without current docs
3. **Concurrency model assumptions:** Harder to detect races in complex event-driven architectures
4. **TypeScript type system:** Cannot rely on types for runtime promise behavior (types are compile-time only)

## Maintenance Notes

### Update Triggers

- **Node.js async behavior changes:** New unhandled rejection policies, event-loop semantics
- **Framework async boundary changes:** New error handling mechanisms, lifecycle hooks
- **TypeScript async features:** New async/await syntax, promise-related type improvements
- **Repository patterns evolve:** New synchronization primitives, error handling conventions

### Calibration Needs

- **False positive rate:** If skill reports too many intentional fire-and-forget patterns, tighten evidence requirements
- **False negative rate:** If missing critical async errors, expand pattern coverage or improve data-flow tracing
- **Severity drift:** Recalibrate severity when deployment environment or failure modes change

### External Source Refresh

- **Node.js docs:** Refresh when major Node.js versions release (check async behavior changes)
- **Framework docs:** Refresh when major framework versions release (check async boundary changes)
- **TypeScript docs:** Refresh when TypeScript releases new async features or patterns
