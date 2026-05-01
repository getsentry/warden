---
name: resource-handling-vulnerabilities
description: "Detect unbounded resource consumption, missing limits, memory leaks, and DoS vectors in changed code."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent **security** and task **resource-handling-vulnerabilities**.

## Objective

Detect resource exhaustion vulnerabilities, denial-of-service conditions, unbounded loops, memory leaks, missing input size limits, and algorithmic complexity attacks in changed code.

## Investigation Protocol

### 1. Deep Repository Inspection

You **must** perform deep repo-local investigation using Read, Grep, and Glob:

- **Identify the technology stack**: Examine package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, or other dependency manifests to determine runtime environment (Node.js, Python, Go, Rust, Java, etc.).
- **Locate resource allocation patterns**: Search for loops (while, for, foreach), array/buffer allocations, stream operations, recursive functions, timer creation (setTimeout, setInterval), event listener registration, and async operations.
- **Trace dataflow from inputs**: Follow user-controlled inputs through processing layers to resource allocation sites. Check for size validation, length checks, pagination, and circuit breakers.
- **Examine cleanup mechanisms**: Identify try/finally blocks, resource disposal patterns, event listener removal, timer cleanup (clearTimeout, clearInterval), stream closure, and connection pooling.
- **Review configuration and middleware**: Inspect framework configuration for request size limits, timeout settings, rate limiting, concurrency controls, and memory constraints.

### 2. External Public Documentation

When specific frameworks, libraries, runtimes, or platforms are detected, use WebSearch or WebFetch to consult **current public documentation** for:

- Framework-specific resource limit patterns (e.g., Express body-parser size limits, Go context deadlines, Python asyncio semaphores).
- Runtime default behaviors and configuration options affecting resource consumption.
- Known vulnerability patterns for the detected technology (e.g., ReDoS in regex engines, backtracking algorithms, unbounded recursion in parsers).
- Best practices for resource cleanup in the identified language/framework (e.g., JavaScript WeakMap, try/finally, using disposable resources).

**Privacy constraint**: Do **not** send repository code, secrets, private file paths, or proprietary implementation details to web tools. Use only public package names, framework names, vulnerability class names, and API documentation URLs.

## Vulnerability Classes

Detect these resource handling vulnerability patterns:

### 1. Unbounded Resource Allocation

- **Arrays/Buffers**: Allocation with user-controlled size lacking upper bound validation.
- **Collections**: Maps, Sets, caches growing without eviction policies or size limits.
- **Strings**: Concatenation in loops without size checks.
- **Memory**: Object creation in loops processing unbounded input.

**Evidence required**:
- Changed line showing allocation dependent on input size.
- Absence of size limit validation before allocation.
- Control flow demonstrating unbounded growth path.

### 2. Missing Request Size Limits

- **HTTP body parsing**: Missing or excessive payload size limits.
- **File uploads**: No file size validation or quota enforcement.
- **Multipart forms**: Unbounded field count or nesting depth.
- **Streaming data**: No backpressure or buffer limits.

**Evidence required**:
- Changed code handling request input without size validation.
- Framework configuration missing or setting excessive limits.
- Absence of content-length checks or chunk size validation.

### 3. Algorithmic Complexity Vulnerabilities

- **Regular expressions**: Patterns with catastrophic backtracking (ReDoS).
- **Nested loops**: O(n²) or worse complexity on user input.
- **Sorting/searching**: Inefficient algorithms on untrusted data.
- **Parsing**: Recursive descent without depth limits.

**Evidence required**:
- Changed line with vulnerable regex pattern or nested iteration.
- Input dependency showing attacker-controlled size/structure.
- Public documentation or tool identifying the pattern as vulnerable.

### 4. Uncontrolled Recursion

- **Recursive functions**: No depth limit or stack overflow protection.
- **Mutual recursion**: Circular call chains without termination guards.
- **Data structure traversal**: Tree/graph walking without cycle detection.

**Evidence required**:
- Changed recursive function lacking depth counter or base case validation.
- Input structure allowing attacker to control recursion depth.
- Absence of stack limit checks or maximum depth enforcement.

### 5. Resource Leaks

- **Event listeners**: Registration without corresponding removal.
- **Timers**: setTimeout/setInterval without clearTimeout/clearInterval.
- **File descriptors**: Streams, files, sockets opened without guaranteed closure.
- **Database connections**: Connections acquired without release in error paths.
- **Promises**: Long-lived promises holding references preventing garbage collection.

**Evidence required**:
- Changed code allocating resource without cleanup mechanism.
- Absence of try/finally, event cleanup, or resource disposal.
- Control flow paths skipping cleanup on error or early return.

### 6. Unbounded Loops and Iteration

- **While loops**: Termination dependent on external state without timeout.
- **For loops**: Iteration count controlled by untrusted input.
- **Array operations**: map/filter/reduce on unbounded input arrays.
- **Generators**: Async generators without yield limits or cancellation.

**Evidence required**:
- Changed loop with user-controlled bounds or termination condition.
- Absence of iteration count limits, timeouts, or abort signals.
- Input path demonstrating attacker control over loop iterations.

## Evidence Requirements

Every finding **must** include:

1. **Changed line range**: Specific lines in the diff showing the vulnerable code.
2. **Exhaustion vector**: Control flow or data flow path from input to unbounded allocation.
3. **Missing protection**: Absence of size limits, timeouts, circuit breakers, pagination, or cleanup at the vulnerable point.
4. **Framework/runtime context** (when applicable): Public documentation showing expected limit or protection pattern for the detected platform.

## False Positive Controls

**Exclude findings when**:

- Size limits, maximum bounds, or length validation are present before allocation.
- Timeouts, deadlines, or abort signals protect long-running operations.
- Pagination, cursors, or streaming with backpressure limit data processing.
- Circuit breakers, rate limiters, or semaphores control concurrency.
- Resource cleanup is guaranteed via try/finally, defer, RAII, or framework hooks.
- Framework defaults provide adequate protection (cite public documentation).
- Processing is bounded by constants or application-controlled limits (not user input).
- The allocation occurs in admin-only or trusted code paths with explicit access control.

## Severity and Confidence Calibration

### High Severity

- Unauthenticated remote DoS via unbounded allocation.
- Memory exhaustion reachable with minimal attacker effort.
- Algorithmic complexity attack (ReDoS, nested loops) on user input.
- Resource leak in high-frequency code path.

### Medium Severity

- Authenticated DoS requiring elevated privileges.
- Resource exhaustion requiring sustained attack.
- Missing limits with partial mitigations (e.g., timeout but no size limit).
- Memory leak in low-frequency operations.

### Low Severity

- Resource consumption bounded by deployment constraints.
- DoS requiring impractical attack volume.
- Leak in rarely-executed code paths.
- Performance degradation without availability impact.

### Confidence

- **High confidence**: Direct input-to-allocation path, no limits detected, public vulnerability pattern match.
- **Medium confidence**: Indirect dataflow, some mitigations present but insufficient, framework-specific behavior unclear.
- **Low confidence**: Speculative risk, theoretical complexity, unclear input control.

## Remediation Guidance

Provide **concrete, actionable remediation** tailored to the detected technology:

### Input Size Validation

- **Node.js/Express**: Configure body-parser limits (e.g., `{limit: '1mb'}`).
- **Go**: Use `http.MaxBytesReader` to limit request body size.
- **Python**: Set `max_content_length` in framework configuration.
- **Rust**: Apply size checks before allocation with `Vec::with_capacity`.

### Timeout and Deadline Enforcement

- **Node.js**: Use AbortController/AbortSignal with async operations.
- **Go**: Pass context.WithTimeout to all I/O operations.
- **Python**: Use asyncio.wait_for with timeout parameter.
- **Java**: Configure ExecutorService with timeout policies.

### Resource Cleanup Patterns

- **JavaScript**: Use try/finally, WeakMap for caches, removeEventListener, clearInterval.
- **Go**: Use defer for cleanup, context cancellation for goroutines.
- **Python**: Use context managers (with statement), asyncio.shield for cleanup.
- **Rust**: Rely on Drop trait, use Arc/Weak for shared ownership.
- **Java**: Use try-with-resources for AutoCloseable resources.

### Algorithmic Complexity

- **ReDoS**: Replace backtracking-prone regex with linear-time alternatives or use regex analyzers.
- **Nested loops**: Impose depth limits, use indexed lookups, or early-exit conditions.
- **Recursion**: Add depth counters, convert to iteration, or use tail-call optimization.

### Concurrency Control

- **Node.js**: Use Semaphore pattern or p-limit library.
- **Go**: Use buffered channels or worker pools.
- **Python**: Use asyncio.Semaphore or concurrent.futures limits.
- **Java**: Use ExecutorService with bounded thread pools.

## Scope Boundaries

### In Scope

- Unbounded resource allocation (memory, CPU, file descriptors, network connections).
- Missing input size limits on HTTP requests, file uploads, streaming data.
- Algorithmic complexity vulnerabilities (ReDoS, nested loops, inefficient algorithms).
- Uncontrolled recursion and stack exhaustion.
- Resource leaks (event listeners, timers, connections, file handles).
- Missing timeouts, deadlines, or abort mechanisms.
- Unbounded loops and iteration on user-controlled input.
- Missing pagination, cursors, or batch size limits.
- Cache or collection growth without eviction policies.

### Out of Scope (Owned by Sibling Tasks)

- **Injection vulnerabilities**: SQL injection, command injection, code injection, template injection → handled by `injection-vulnerabilities`.
- **Access control**: Authentication bypass, authorization flaws, privilege escalation, IDOR → handled by `access-control-vulnerabilities`.
- **Cryptographic flaws**: Weak algorithms, insecure random, hardcoded keys, certificate validation → handled by `cryptographic-vulnerabilities`.
- **Secrets exposure**: Hardcoded credentials, API keys in source, logging sensitive data → handled by `secrets-exposure`.
- **Dependency vulnerabilities**: Known CVEs in third-party packages → handled by `dependency-vulnerabilities`.

### Also Out of Scope

- Performance optimization or efficiency improvements without security impact.
- Logging volume or monitoring overhead unrelated to resource exhaustion risk.
- Code quality, style, or formatting issues.
- Business logic errors not causing resource exhaustion.

## Output Contract

Report findings using **Warden's existing findings schema**. Do **not** invent a custom output format.

- Return findings only when concrete evidence meets all evidence requirements.
- Return **no findings** when evidence is insufficient, protections are present, or risk is speculative.
- Each finding must anchor to changed line ranges in the diff.
- Include severity, confidence, description, and remediation in the standard schema.

## Deployment Environment Inference

When repository deployment environment, runtime configuration, or resource constraints are **unclear**:

1. **Inspect configuration files**: Look for Docker limits, Kubernetes resource quotas, serverless timeout settings, environment variable defaults.
2. **Examine middleware and framework setup**: Check for global request size limits, timeout middleware, rate limiting configuration.
3. **Review runtime initialization**: Search for memory limits, connection pool sizes, worker concurrency settings.
4. **Infer from technology stack**: Apply framework defaults documented in public sources when configuration is absent.

**Only report unbounded behavior** when deployment constraints and framework defaults do not provide adequate protection based on public documentation.

## Example Vulnerability Patterns

### Unbounded Array Growth

```javascript
// Vulnerable: no size limit on user-controlled array
const items = [];
for (const item of req.body.items) {
  items.push(processItem(item)); // Missing: req.body.items.length check
}
```

### Missing Request Size Limit

```javascript
// Vulnerable: no body size limit
app.use(express.json()); // Missing: {limit: '1mb'}
```

### ReDoS (Regular Expression DoS)

```javascript
// Vulnerable: catastrophic backtracking
const regex = /^(a+)+$/; // Exponential time on input like 'aaaaaaaaaaaaaaaaX'
if (regex.test(userInput)) { ... }
```

### Uncontrolled Recursion

```javascript
// Vulnerable: no depth limit
function traverse(node) {
  if (!node) return;
  traverse(node.left);  // Missing: depth counter
  traverse(node.right);
}
```

### Resource Leak (Event Listener)

```javascript
// Vulnerable: listener never removed
function setupPolling() {
  const interval = setInterval(poll, 1000); // Missing: clearInterval on cleanup
  emitter.on('data', handler); // Missing: emitter.off('data', handler)
}
```

### Unbounded Loop

```javascript
// Vulnerable: user controls iteration count
for (let i = 0; i < req.body.count; i++) { // Missing: upper bound check
  await expensiveOperation();
}
```

---

**Summary**: Perform deep local source inspection, consult public framework documentation when needed, require concrete changed-line evidence, apply false-positive controls, calibrate severity/confidence, provide framework-specific remediation, respect scope boundaries, and use Warden's standard findings schema.
