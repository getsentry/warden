# input-validation-errors Specification

## Intent

Detect missing or incorrect validation of untrusted data flowing into security-sensitive or error-prone operations in TypeScript code. This child skill targets logical errors where user-supplied data, environment variables, configuration, or external API responses reach injection sinks, parse operations, or type-sensitive operations without validation.

## Scope

In scope:
- Data flows from untrusted sources (HTTP request parameters, headers, body; command-line arguments; environment variables; configuration files; database query results; external API responses; file contents) to sensitive sinks (SQL queries, shell commands, file paths, eval, HTML rendering, regular expressions, JSON.parse, parseInt/parseFloat, array indexing, bracket-notation property access).
- Missing validation: no type checks, no format checks, no range checks, no allow-list checks, no sanitization, no error handling for parse failures.
- Incorrect validation: type coercion bugs (== vs ===, truthy checks), incomplete escaping, regex DoS patterns, missing edge-case checks (empty string, negative numbers, special characters, very large inputs).
- Validation correctness: schema matches sink requirements, validation errors are handled, validation covers all code paths.
- Cross-function data flow: tracing validation across helper functions.

Out of scope:
- Style preferences for validation syntax or library choice.
- Missing validation in unchanged code unless directly relevant to understanding a changed-line bug.
- Architectural concerns about validation layer placement or centralization.
- Performance impact of validation operations.

## Users And Trigger Context

- **Primary users**: Developers reviewing pull requests, security engineers performing code audits, maintainers running scheduled scans.
- **Trigger context**: This child skill is invoked by the Superwarden parent "find-bugs" when analyzing changed TypeScript files.
- **Common user expectations**: Find injection vulnerabilities, type coercion bugs, and parse errors introduced in changed code. Provide concrete remediation guidance.

## Runtime Contract

- **Input**: Changed file hunks with TypeScript code containing data flows from untrusted sources to sensitive sinks.
- **Investigation tools**: Read, Grep, Glob for repo-local inspection; WebSearch, WebFetch for public documentation (OWASP, framework docs, library docs).
- **Output**: Warden findings with changed-line anchoring, untrusted source identification, sensitive sink identification, missing/incorrect validation evidence, potential impact, and remediation guidance.
- **No findings when**: Evidence is insufficient, validation exists and is correct, input is hardcoded or from a trusted source.

## Source And Evidence Model

### Authoritative Sources

- **Parent Superwarden task definition**: Scope, evidence requirements, out-of-scope exclusions.
- **OWASP Input Validation Cheat Sheet**: Core validation principles, injection-sensitive sink validation patterns, common pitfalls.
- **TypeScript handbook (narrowing, strict mode)**: Type system behavior, compile-time vs runtime validation.
- **Repository source code**: Validation patterns (zod schemas, safeParse usage), exec patterns (array arguments), TypeScript compiler settings (strict mode).

### Useful Improvement Sources

- Schema validation library documentation (zod, joi, ajv) for validation correctness analysis.
- Framework security documentation for framework-provided validation or sanitization.
- Node.js API documentation for parsing function behavior.
- CVE databases and security advisories for known validation bypass techniques.

### Data That Must Not Be Stored

- Repository code excerpts sent to web tools.
- Secrets, credentials, or sensitive configuration values.
- Private file paths or proprietary architecture details.

## Reference Architecture

### Data Flow Analysis Model

1. **Source identification**: Locate untrusted inputs in changed hunks (req.body, process.env, JSON.parse, file reads, external APIs).
2. **Sink identification**: Locate sensitive operations (SQL query construction, exec/spawn, file path construction, HTML interpolation, regex, parse operations, array indexing).
3. **Validation detection**: Check for type validation, format validation, range validation, sanitization, error handling between source and sink.
4. **Validation correctness**: Verify validation logic matches sink requirements (e.g., parameterized SQL queries, array-based shell arguments, HTML entity encoding).
5. **Cross-function tracing**: Follow data flow across function boundaries; confirm validation helpers are called by all callers.

### Validation Pattern Recognition

- **TypeScript strict mode**: `tsconfig.json` with `"strict": true` enables compile-time null checks, noImplicitAny, strictNullChecks.
- **Zod schema validation**: `.safeParse(input)` returns `{ success: boolean, data?: T, error?: ZodError }`. Check for result inspection.
- **parseInt/parseFloat**: Requires radix parameter and NaN handling. Example: `const n = parseInt(input, 10); if (Number.isNaN(n)) return defaultValue;`.
- **exec safety**: Use `execFileNonInteractive(file, args)` with array arguments, not `exec(\`cmd ${arg}\`)`.

### Injection Sink Validation Patterns (OWASP)

- **SQL injection**: Parameterized queries (primary defense), allow-list for identifiers.
- **Command injection**: Array-based arguments (primary defense), avoid shell.
- **Path traversal**: Reject `../`, normalize and validate against allowed directory.
- **XSS**: Context-aware output encoding (defense-in-depth; input validation is supplementary).
- **Regex DoS**: Validate regex complexity or limit input length.

## Evaluation

### Lightweight Validation

- Run this child skill on evaluation fixtures (evals/fixtures/sql-injection, evals/fixtures/xss-reflected) and confirm it detects the intentional vulnerabilities.
- Run on a sample PR with validation bugs (missing type check, incomplete escaping) and confirm findings cite changed lines, untrusted sources, sensitive sinks, and remediation.

### Structural Validation

- Verify findings conform to Warden finding schema (filePath, line, severity, confidence, category, title, description).
- Verify each finding cites a changed line number, not an unchanged line.
- Verify each finding includes untrusted source, sensitive sink, missing/incorrect validation evidence, and potential impact.

### Behavioral Validation

- **True positive rate**: Detects SQL injection via string interpolation (evals/fixtures/sql-injection/api.ts:33).
- **True positive rate**: Detects XSS via unescaped HTML interpolation (evals/fixtures/xss-reflected/server.ts:23).
- **False positive control**: Does not report when parameterized queries are used.
- **False positive control**: Does not report when zod `.safeParse()` result is checked and errors are handled.
- **False positive control**: Does not report when input is hardcoded or from a trusted source.

### Acceptance Gates

- Detects injection vulnerabilities in evaluation fixtures.
- Provides concrete remediation guidance (parameterized queries, array-based arguments, output encoding).
- Does not report style issues, architectural concerns, or missing validation in unchanged code.
- Calibrates severity/confidence correctly (high severity for injection, medium for type coercion, low for non-security parse errors).

## Known Limitations

- **Inter-procedural analysis depth**: Data flow tracing across function boundaries is limited to functions visible in changed hunks or repo-local inspection. Complex data flow through closures, async callbacks, or framework internals may be missed.
- **Framework-provided validation**: Detection of framework middleware validation (e.g., Express body parser with schema) requires inspecting framework configuration, which may not be visible in changed hunks.
- **Threat model assumptions**: Without deployment context, the skill assumes all external inputs are untrusted. In some deployments, certain inputs (e.g., internal admin API parameters) may be trusted, leading to false positives.
- **TypeScript type narrowing**: The skill does not execute static analysis to verify TypeScript type narrowing correctness. It relies on pattern matching and manual inspection.
- **Schema validation library support**: The skill recognizes common libraries (zod, joi, ajv) but may miss validation performed by less common libraries or custom validation functions.

## Maintenance Notes

- **Update OWASP guidance reference** when the OWASP Input Validation Cheat Sheet is updated with new injection patterns or validation techniques.
- **Add new schema validation libraries** when the repository adopts new libraries or when common libraries change their API surface.
- **Refine regex DoS detection** when new catastrophic backtracking patterns are discovered or when safe regex libraries are adopted.
- **Expand injection sink coverage** when new injection vector classes are discovered (e.g., template injection, LDAP injection, XML injection).
- **Update repository validation patterns** when the repository changes its validation conventions (e.g., switches from zod to another library, adopts new TypeScript compiler options).
- **Calibrate severity/confidence** based on user feedback and false positive/negative rates in production usage.
