# input-validation-errors Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|------------|--------------|-------------------|
| Parent Superwarden task definition | canonical | high | Scope, evidence requirements, out-of-scope exclusions, prompt text | Do not contradict parent task scope |
| OWASP Input Validation Cheat Sheet (2026-04-30) | authoritative | high | Core validation principles, injection sink patterns, common pitfalls | Use public URL only; do not send repo code to web tools |
| TypeScript handbook (narrowing) | authoritative | high | Type system behavior, compile-time vs runtime validation | Use public URL only |
| Repository tsconfig.json | canonical | high | Strict mode enabled, noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature | Direct evidence of TypeScript compiler settings |
| Repository package.json | canonical | high | Zod version 4.3.6, Node.js >= 20.0.0 | Direct evidence of validation library usage |
| Repository source patterns (config/schema.ts, action/inputs.ts, utils/exec.ts) | canonical | high | Zod safeParse patterns, parseInt with radix and NaN handling, array-based exec arguments | Representative validation patterns in existing code |
| Evaluation fixtures (sql-injection, xss-reflected) | canonical | high | Intentional vulnerabilities for true positive validation | Known vulnerable code for testing detection |
| Node.js documentation (child_process, fs, parsing) | authoritative | medium | API behavior for exec, spawn, parseInt, JSON.parse | Use public documentation only |
| Zod documentation | authoritative | medium | Schema validation API, safeParse vs parse, error handling | Use public documentation only |

## Decisions

### Validation Strategy Prioritization

**Decision**: Prioritize allow-list validation over deny-list validation in remediation guidance.

**Evidence**: OWASP Input Validation Cheat Sheet: "Allowlisting remains the more robust and secure approach for preventing potentially harmful input."

**Rationale**: Deny-list approaches (blocking known bad patterns like apostrophes, `<script>` tags, `1=1`) are trivially bypassed. Allow-list validation defines exactly what is authorized and rejects everything else.

### TypeScript Compile-Time vs Runtime Validation

**Decision**: Do not rely on TypeScript type annotations for runtime validation. Report missing runtime validation even when TypeScript types are present.

**Evidence**: TypeScript types are erased at compile time. A parameter typed as `number` can receive `"string"` at runtime if the caller is untyped JavaScript or uses type assertions.

**Rationale**: TypeScript strict mode provides compile-time safety but does not prevent runtime type errors when untrusted external inputs are involved. Runtime validation (zod, joi, typeof checks) is required.

### Injection Sink Primary Defenses

**Decision**: Parameterized queries for SQL injection, array-based arguments for command injection, context-aware output encoding for XSS.

**Evidence**:
- OWASP: "Input validation **must** be implemented on the server-side before any data is processed."
- OWASP: "Parameterized queries or ORM methods are primary defense" for SQL injection.
- Repository pattern (utils/exec.ts): `execFileNonInteractive(file, args)` uses array arguments, not shell string construction.

**Rationale**: Input validation is defense-in-depth, not primary defense for injection. Use framework-provided safe APIs (parameterized queries, array arguments) and supplement with validation.

### Threat Model Assumptions

**Decision**: Assume all external inputs are untrusted unless code contains evidence of trust boundaries.

**Evidence**: Parent task: "If threat model or authentication boundaries are unknown, note in the finding rationale which inputs might be trusted in some deployments; still report missing validation unless the code contains evidence that the input source is always trusted."

**Rationale**: Without deployment context, conservative assumptions prevent missing real vulnerabilities. Note potential trust boundaries in finding rationale to inform user triage.

### Severity Calibration

**Decision**: High severity for injection vulnerabilities (SQL, command, path traversal, XSS), medium for type coercion or parse errors causing crashes, low for non-security validation gaps.

**Evidence**:
- OWASP injection classes allow arbitrary code execution or data access.
- Repository eval fixtures demonstrate SQL injection and XSS with high exploitability.

**Rationale**: Injection vulnerabilities have immediate security impact (data breach, RCE). Type coercion bugs have correctness impact (crashes, incorrect behavior). Severity aligns with exploitability and impact.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| Vulnerability prerequisites | complete | OWASP guidance covers injection-sensitive sinks (SQL, shell, HTML, path, regex). Task prompt defines untrusted sources (HTTP params, env vars, external APIs, file contents). |
| Exploitable dataflow examples | complete | Evaluation fixtures (sql-injection/api.ts, xss-reflected/server.ts) provide concrete vulnerable code. Repository source shows safe patterns (parameterized queries, array-based exec). |
| False-positive controls | complete | Task prompt excludes style issues, unchanged code, architectural concerns. Skill body defines false positive controls (validation helpers, hardcoded inputs, framework middleware). |
| Severity/confidence calibration | complete | Skill body defines high/medium/low severity and confidence based on injection type, exploitability, and evidence quality. |
| Remediation patterns | complete | Skill body provides concrete remediation guidance (parameterized queries, array arguments, output encoding, safeParse, parseInt with radix). |
| Framework/runtime caveats | complete | Skill body documents TypeScript strict mode, zod safeParse patterns, Node.js exec semantics, and repository validation conventions. |
| API surface | complete | Covers zod safeParse/parse, TypeScript typeof/instanceof, parseInt/parseFloat, exec/spawn, JSON.parse, HTTP request objects, process.env, fs module. |
| Config/runtime options | complete | Documents TypeScript strict mode (tsconfig.json), zod schema validation, Node.js >= 20.0.0 runtime. |
| Common use cases | complete | HTTP request parameter validation, environment variable parsing, external API response validation, SQL query construction, shell command execution, file path handling, HTML rendering. |
| Known issues/workarounds | complete | Regex DoS detection limitations, inter-procedural analysis depth, framework middleware validation detection. |
| Version/migration variance | partial | Covers zod 4.3.6, TypeScript 5.9.3, Node.js >= 20.0.0. Does not cover migration from other validation libraries. |

## Open Gaps

### Inter-Procedural Analysis Depth

**Gap**: Data flow tracing across function boundaries is limited to functions visible in changed hunks or repo-local inspection. Complex data flow through closures, async callbacks, or framework internals may be missed.

**Impact**: May miss validation bugs where untrusted input flows through multiple layers before reaching a sink.

**Next steps**: Evaluate false negative rate on real-world PRs. If high, consider adding dedicated data flow analysis tooling or expanding repo-local inspection heuristics.

### Framework Middleware Validation

**Gap**: Detection of framework-provided validation (e.g., Express body parser with schema middleware) requires inspecting framework configuration, which may not be visible in changed hunks.

**Impact**: May report false positives when framework middleware performs validation but the skill cannot detect it.

**Next steps**: Add heuristics to recognize common middleware patterns (e.g., Express validator, Fastify schema, NestJS pipes). Request user feedback on false positive rate.

### Schema Validation Library Coverage

**Gap**: Recognizes common libraries (zod, joi, ajv) but may miss validation performed by less common libraries or custom validation functions.

**Impact**: May report false positives when custom validation exists but the skill does not recognize the pattern.

**Next steps**: Monitor repository adoption of new validation libraries. Add pattern recognition for common custom validation helpers (e.g., `isValidEmail`, `sanitizeInput`).

### Regex DoS Detection

**Gap**: Skill prompts checking for catastrophic backtracking patterns but does not include a comprehensive regex complexity analyzer.

**Impact**: May miss subtle regex DoS vulnerabilities or report false positives on safe patterns.

**Next steps**: Integrate public regex complexity analysis tools or heuristics. Reference OWASP regex DoS guidance when it becomes available.

## Changelog

### 2026-04-30: Initial Superwarden Synthesis

- Generated child skill from parent "find-bugs" task "input-validation-errors".
- Inspected repository source (tsconfig.json, package.json, config/schema.ts, action/inputs.ts, utils/exec.ts, eval fixtures).
- Consulted OWASP Input Validation Cheat Sheet for injection sink validation patterns.
- Defined scope, evidence requirements, false positive controls, severity/confidence calibration, and remediation patterns.
- Documented known limitations (inter-procedural analysis, framework middleware detection, schema library coverage, regex DoS detection).
- Validated coverage matrix against security-review synthesis dimensions and API surface dimensions.
