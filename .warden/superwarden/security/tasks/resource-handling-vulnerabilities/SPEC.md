# resource-handling-vulnerabilities Specification

## Intent

This child skill detects resource exhaustion, denial-of-service conditions, unbounded loops, memory leaks, and missing input size limits in code changes. It is synthesized from the parent **security** Superwarden skill to provide focused, deep analysis of resource handling vulnerabilities.

The skill targets vulnerabilities where attackers can cause service degradation or outage by consuming excessive memory, CPU, file descriptors, network connections, or other system resources without proper limits or cleanup.

## Scope

### In Scope

- **Unbounded resource allocation**: Arrays, buffers, collections, strings, objects allocated with user-controlled size lacking upper bounds.
- **Missing request size limits**: HTTP body parsing, file uploads, multipart forms, streaming data without size validation or quotas.
- **Algorithmic complexity vulnerabilities**: Regular expressions with catastrophic backtracking (ReDoS), nested loops with quadratic or worse complexity, inefficient algorithms on user input, recursive parsing without depth limits.
- **Uncontrolled recursion**: Recursive functions, mutual recursion, tree/graph traversal without depth counters or cycle detection.
- **Resource leaks**: Event listeners, timers, file descriptors, database connections, promises allocated without guaranteed cleanup.
- **Unbounded loops and iteration**: While loops, for loops, array operations, async generators with user-controlled bounds or termination lacking limits.
- **Missing timeouts and deadlines**: Long-running operations, I/O, network requests without timeout enforcement.
- **Missing pagination and batch limits**: Data queries, batch processing, iteration lacking cursor limits or page size validation.
- **Cache and collection growth**: Maps, Sets, in-memory caches without eviction policies or maximum size constraints.

### Out of Scope

Explicitly excluded to avoid overlap with sibling tasks:

- **Injection vulnerabilities** (SQL injection, command injection, code injection, template injection): Owned by `injection-vulnerabilities`.
- **Access control** (authentication bypass, authorization flaws, privilege escalation, IDOR): Owned by `access-control-vulnerabilities`.
- **Cryptographic flaws** (weak algorithms, insecure random, hardcoded keys, certificate validation): Owned by `cryptographic-vulnerabilities`.
- **Secrets exposure** (hardcoded credentials, API keys, tokens in source or logs): Owned by `secrets-exposure`.
- **Dependency vulnerabilities** (known CVEs in third-party packages): Owned by `dependency-vulnerabilities`.

Also excluded:

- Performance optimization or efficiency improvements without security impact.
- Logging volume or monitoring overhead unrelated to resource exhaustion.
- Code quality, style, or formatting issues.
- Business logic errors not causing resource exhaustion.

## Users And Trigger Context

- **Primary users**: Developers, security engineers, code reviewers analyzing code changes for resource exhaustion risks.
- **Trigger context**: Pull request reviews, local CLI scans, scheduled repository scans.
- **Common requests**: "Check this PR for DoS vulnerabilities", "Scan for memory leaks", "Find unbounded loops in changed code".
- **Should not trigger for**: Code unrelated to resource allocation, configuration-only changes without code behavior impact, documentation updates.

## Runtime Contract

### Execution Agent Requirements

1. **Deep repository investigation**: Use Read, Grep, and Glob to inspect changed files, dependency manifests, configuration, middleware setup, and resource allocation patterns.
2. **Technology stack detection**: Identify runtime environment (Node.js, Python, Go, Rust, Java, etc.) from package.json, requirements.txt, go.mod, Cargo.toml, pom.xml.
3. **Public documentation lookup**: Use WebSearch or WebFetch to retrieve current framework-specific resource limit patterns, runtime defaults, known vulnerability patterns, and best practices when specific platforms are detected.
4. **Privacy enforcement**: Do NOT send repository code, secrets, private file paths, or proprietary details to web tools. Use only public package names, framework names, API documentation URLs.
5. **Changed-line anchoring**: Every finding must reference specific changed line ranges from the diff.
6. **Evidence-based reporting**: Report findings only when all evidence requirements are satisfied. Return no findings when evidence is insufficient or protections are present.
7. **Standard schema compliance**: Use Warden's existing findings schema. Do not invent custom output formats.

### Evidence Requirements (All Required)

Every reported finding must include:

1. **Changed line range**: Specific lines in the diff showing the vulnerable resource allocation, missing limit, or cleanup gap.
2. **Exhaustion vector**: Control flow or data flow path demonstrating how an attacker can trigger unbounded resource consumption.
3. **Missing protection**: Concrete absence of size limits, timeouts, circuit breakers, pagination, cleanup mechanisms, or framework protections at the vulnerable point.
4. **Framework/runtime documentation** (when applicable): Public source showing expected limit pattern or protection for the detected platform, OR evidence that framework defaults are insufficient.

### False Positive Controls

Exclude findings when:

- Size limits, maximum bounds, or length validation are present before allocation.
- Timeouts, deadlines, or abort signals protect long-running operations.
- Pagination, cursors, or streaming with backpressure limit data processing.
- Circuit breakers, rate limiters, or semaphores control concurrency.
- Resource cleanup is guaranteed via try/finally, defer, RAII, using statement, or framework disposal hooks.
- Framework defaults provide adequate protection (cite public documentation).
- Processing is bounded by application constants or admin-controlled limits (not user input).
- The allocation occurs in admin-only or trusted code paths with explicit access control.

### Severity and Confidence Calibration

**High Severity**:
- Unauthenticated remote DoS via unbounded allocation.
- Memory exhaustion reachable with minimal attacker effort (single request, small payload).
- Algorithmic complexity attack (ReDoS, nested loops) with exponential cost on user input.
- Resource leak in high-frequency code path (per-request, per-connection).

**Medium Severity**:
- Authenticated DoS requiring elevated privileges or account creation.
- Resource exhaustion requiring sustained attack (many requests, large cumulative payload).
- Missing limits with partial mitigations (timeout present but no size limit, or vice versa).
- Memory leak in moderate-frequency operations (periodic jobs, scheduled tasks).

**Low Severity**:
- Resource consumption bounded by deployment constraints (container limits, serverless timeouts).
- DoS requiring impractical attack volume (millions of requests, multi-GB payload).
- Leak in rarely-executed code paths (admin operations, debug endpoints).
- Performance degradation without availability impact (slowdown but no crash).

**High Confidence**:
- Direct input-to-allocation path visible in changed code.
- No size limits, timeouts, or cleanup detected after thorough inspection.
- Public vulnerability pattern match (e.g., ReDoS regex identified by tool or documentation).

**Medium Confidence**:
- Indirect dataflow requiring multiple hops or cross-function analysis.
- Some mitigations present but insufficient (e.g., timeout but no concurrency limit).
- Framework-specific behavior documented but actual configuration unclear.

**Low Confidence**:
- Speculative risk based on code structure without confirmed input path.
- Theoretical algorithmic complexity without validated user control.
- Unclear whether deployment environment provides adequate constraints.

### Remediation Expectations

Provide concrete, actionable remediation tailored to detected technology:

**Input Size Validation**:
- Node.js/Express: `app.use(express.json({limit: '1mb'}))`
- Go: `http.MaxBytesReader(w, r.Body, maxBytes)`
- Python/Flask: `app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024`
- Rust/Actix: `web::JsonConfig::default().limit(1048576)`

**Timeout Enforcement**:
- Node.js: `AbortController` with `signal` parameter, `setTimeout` with abort.
- Go: `context.WithTimeout`, `context.WithDeadline`.
- Python: `asyncio.wait_for(coro, timeout=30)`.
- Java: `ExecutorService.invokeAll(tasks, timeout, TimeUnit.SECONDS)`.

**Resource Cleanup**:
- JavaScript: `try/finally`, `removeEventListener`, `clearInterval`, `WeakMap` for caches.
- Go: `defer conn.Close()`, context cancellation for goroutines.
- Python: `with` statement (context managers), `asyncio.shield` for cleanup.
- Rust: `Drop` trait, `Arc`/`Weak` for shared ownership.
- Java: `try-with-resources` for `AutoCloseable`.

**Algorithmic Complexity**:
- ReDoS: Replace backtracking-prone patterns with linear alternatives, use `safe-regex` or regex analyzers.
- Nested loops: Impose depth limits (`if (depth > MAX_DEPTH) return`), use indexed lookups (Map/Set).
- Recursion: Add depth counters, convert to iteration with explicit stack, use tail-call optimization.

**Concurrency Control**:
- Node.js: Semaphore pattern or `p-limit` library.
- Go: Buffered channels or worker pool pattern.
- Python: `asyncio.Semaphore(max_concurrent)`.
- Java: `Executors.newFixedThreadPool(poolSize)`.

## Source And Evidence Model

### Authoritative Sources

- **Changed code in diff**: Primary evidence source. Must contain visible vulnerable pattern.
- **Repository configuration**: package.json, requirements.txt, go.mod, Cargo.toml, pom.xml for stack detection. Dockerfile, kubernetes manifests, serverless.yml for deployment constraints.
- **Middleware and framework setup**: Application initialization code showing request parsers, timeout middleware, rate limiters.
- **Public framework documentation**: Official docs for Express.js, Flask, Go net/http, Rust Actix, etc. showing recommended limit patterns.
- **Public vulnerability databases**: OWASP, CWE, CVE entries for ReDoS, unbounded allocation, memory exhaustion patterns.
- **Security best practices**: MDN, Better Stack, AppSignal, and framework-specific security guides for resource cleanup patterns.

### Useful Improvement Sources

- User feedback on false positives (limits present but not detected, framework defaults adequate).
- User feedback on false negatives (known DoS vulnerabilities missed, insufficient dataflow analysis).
- Runtime profiling data showing actual resource consumption (memory leaks confirmed, timeout patterns).
- Deployment environment details (container limits, serverless constraints, cloud provider quotas).
- Framework version-specific behavior (changes in defaults, new protection mechanisms).

### Data That Must Not Be Stored

- Repository code excerpts beyond what's necessary for finding description.
- Secrets, credentials, API keys detected during analysis.
- Private file paths or internal infrastructure details.
- Customer data or sensitive business logic.
- Proprietary algorithms or intellectual property.

## Reference Architecture

### Vulnerability Detection Flow

1. **Stack Detection Phase**:
   - Read dependency manifests (package.json, requirements.txt, go.mod, etc.).
   - Identify runtime (Node.js, Python, Go, Rust, Java) and frameworks (Express, Flask, Gin, Actix, Spring).
   - Determine language version and major framework versions.

2. **Pattern Search Phase**:
   - Grep for resource allocation keywords: `new Array`, `new Map`, `new Set`, `Buffer.alloc`, `malloc`, `Vec::with_capacity`.
   - Grep for loop constructs: `while`, `for`, `forEach`, `map`, `filter`, `reduce`.
   - Grep for recursion: function names appearing in their own bodies.
   - Grep for async operations: `setTimeout`, `setInterval`, `Promise`, `async/await`, goroutines, async def.
   - Grep for event handling: `addEventListener`, `on(`, `once(`, `subscribe`.

3. **Dataflow Analysis Phase**:
   - Read changed files completely to understand context.
   - Trace inputs: request parameters, query strings, body fields, headers, file uploads.
   - Follow dataflow: variable assignments, function calls, method chains.
   - Identify allocation sites: where resources are created dependent on input.
   - Check for limits: size validation, length checks, boundary conditions before allocation.

4. **Protection Detection Phase**:
   - Search for size limits: `if (size > MAX)`, length checks, framework limit configuration.
   - Search for timeouts: `setTimeout`, `context.WithTimeout`, `wait_for`, `Future.timeout`.
   - Search for cleanup: `try/finally`, `defer`, `with`, `using`, `Drop` trait.
   - Search for concurrency controls: semaphores, worker pools, rate limiters.
   - Inspect framework middleware: body-parser config, timeout middleware, request validators.

5. **Public Documentation Lookup Phase** (when needed):
   - WebSearch for framework-specific limit patterns ("Express body-parser size limit").
   - WebSearch for vulnerability patterns ("ReDoS regex catastrophic backtracking").
   - WebFetch official documentation for defaults and recommended configurations.
   - Use ONLY public package/framework names, no repository code or paths.

6. **Finding Generation Phase**:
   - For each vulnerable pattern, validate all evidence requirements.
   - Apply false-positive controls to exclude protected code.
   - Calibrate severity and confidence based on criteria.
   - Generate remediation guidance tailored to detected stack.
   - Anchor finding to changed line range in diff.
   - Format using Warden's standard findings schema.

### Technology-Specific Detection Rules

**Node.js/TypeScript**:
- Check for body-parser, express.json, express.urlencoded limit configuration.
- Detect missing AbortController/AbortSignal in async operations.
- Identify event listeners without removeEventListener.
- Check for setInterval/setTimeout without clear* calls.
- Look for Promise chains holding large closures.
- Detect regex patterns without safe-regex validation.

**Python**:
- Check for Flask/Django MAX_CONTENT_LENGTH configuration.
- Detect missing async context managers (async with).
- Identify recursive functions without sys.setrecursionlimit consideration.
- Check for asyncio operations without wait_for timeout.
- Look for file handles opened without with statement.

**Go**:
- Check for http.MaxBytesReader usage on request bodies.
- Detect goroutines launched without context.WithCancel/WithTimeout.
- Identify recursive functions without depth counters.
- Check for channels without buffer size limits.
- Look for defer statements ensuring cleanup.

**Rust**:
- Check for Vec::with_capacity with user-controlled capacity.
- Detect missing Drop trait implementations for custom resources.
- Identify recursive functions without explicit stack limits.
- Check for async tasks without timeout or cancellation.

**Java**:
- Check for servlet container maxPostSize configuration.
- Detect ExecutorService without bounded thread pools.
- Identify try blocks without try-with-resources for AutoCloseable.
- Check for recursive methods without depth tracking.

## Evaluation

### Lightweight Validation

1. **Schema compliance**: Verify output matches Warden's findings schema (severity, confidence, title, description, location, remediation).
2. **Changed-line anchoring**: Confirm each finding references line ranges from the diff.
3. **Evidence completeness**: Check that all four evidence requirements are present in finding metadata.
4. **Privacy compliance**: Ensure no repository code, secrets, or private paths were sent to web tools.

### Structural Validation

1. **Stack detection accuracy**: Verify correct runtime and framework identification from manifests.
2. **Pattern coverage**: Confirm all six vulnerability classes are represented in detection logic.
3. **False-positive controls**: Test that protected code patterns are excluded.
4. **Remediation quality**: Validate that guidance is technology-specific and actionable.

### Behavioral Validation

1. **True positive rate**: Test against known resource exhaustion vulnerabilities (CVE samples, synthetic test cases).
2. **False positive rate**: Test against properly-protected code (framework defaults, explicit limits).
3. **Severity calibration**: Verify high/medium/low severity assignments match impact criteria.
4. **Confidence calibration**: Verify high/medium/low confidence matches evidence strength.

### Acceptance Gates

- Findings reference changed lines only, not unchanged context.
- Evidence includes dataflow path, missing protection, and framework context when applicable.
- False positives are below 20% on sample corpus with proper protections.
- False negatives are below 10% on known DoS vulnerability samples.
- Remediation includes concrete code examples or configuration for detected stack.
- No privacy violations: zero repository code, secrets, or private paths sent to web tools.

## Known Limitations

1. **Dataflow analysis depth**: Limited to single-file or simple cross-file paths. May miss complex multi-hop dataflows requiring interprocedural analysis.
2. **Framework version variance**: Detection relies on current public documentation. Older framework versions may have different defaults or behaviors.
3. **Deployment constraints**: Cannot always determine if container limits, serverless timeouts, or cloud provider quotas provide adequate protection without explicit configuration files.
4. **Algorithmic complexity**: ReDoS detection limited to known vulnerable patterns. Novel backtracking vulnerabilities may be missed without regex analysis tools.
5. **Indirect recursion**: Mutual recursion across multiple functions may be missed without call graph analysis.
6. **Dynamic allocation**: Resource allocation through reflection, eval, or dynamic code generation may evade static analysis.
7. **Third-party library behavior**: Assumes standard library and framework behavior as documented. Custom or patched versions may differ.

## Maintenance Notes

### Trigger for Updates

- **New framework versions**: When major frameworks (Express, Flask, Spring) release versions with changed resource limit defaults.
- **New vulnerability patterns**: When novel DoS vectors are published (new ReDoS patterns, algorithmic complexity attacks).
- **User feedback**: When false positive or false negative patterns are identified in production use.
- **Runtime updates**: When Node.js, Python, Go, Rust, Java release versions with new resource management APIs.
- **Security guidance changes**: When OWASP, CWE, or framework security docs update recommendations.

### Update Procedure

1. **Review external sources**: Re-run WebSearch for current framework limit patterns, best practices, vulnerability databases.
2. **Update technology-specific rules**: Modify detection patterns for new framework versions or APIs.
3. **Refresh remediation guidance**: Update code examples and configuration for current framework versions.
4. **Validate against new corpus**: Test updated skill against recent CVE samples and framework release notes.
5. **Document changes**: Record updates in SOURCES.md changelog with external source citations.

### Sibling Task Coordination

When boundary cases arise:

- **Injection + Resource**: If unbounded input is used in SQL query causing DB resource exhaustion, coordinate with `injection-vulnerabilities` on primary root cause.
- **Access Control + Resource**: If missing auth allows unauthenticated DoS, report access control issue to `access-control-vulnerabilities` and mention resource impact as secondary effect.
- **Dependency + Resource**: If third-party library has unbounded allocation CVE, defer to `dependency-vulnerabilities` for CVE reporting.

Prefer single-task ownership: assign to task representing primary vulnerability class. Document cross-cutting concerns in finding description without duplicate reporting.
