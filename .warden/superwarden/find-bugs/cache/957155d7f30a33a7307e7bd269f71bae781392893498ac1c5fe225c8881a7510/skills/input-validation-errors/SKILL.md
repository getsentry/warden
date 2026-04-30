---
name: input-validation-errors
description: "Use when analyzing TypeScript code for missing or incorrect validation of user-supplied data, environment variables, configuration, external API responses, or other untrusted inputs that flow into security-sensitive or error-prone operations."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Warden Superwarden child skill generated from parent "find-bugs" for task "input-validation-errors".

## Objective

Find logical errors where untrusted or external data flows into security-sensitive or error-prone operations without validation in TypeScript code. Report concrete findings with changed-line anchoring and evidence of missing or incorrect validation.

## Scope

In scope:
- Data flows from untrusted sources (HTTP request parameters/headers/body, command-line arguments, environment variables, configuration files, database query results, external API responses, file contents) to sensitive sinks (SQL queries, shell commands, file paths, HTML rendering, regular expressions, JSON.parse, parseInt/parseFloat, array indexing, bracket-notation property access).
- Missing validation: no type checks, no format checks, no range checks, no allow-list checks, no sanitization, no error handling for parse failures.
- Incorrect validation: type coercion bugs (== vs ===, truthy checks accepting unexpected values), incomplete escaping, regex denial-of-service patterns, missing edge-case checks (empty string, negative numbers, special characters, very large inputs).
- Validation correctness: verify validation logic matches sink requirements and covers all code paths.

Out of scope:
- Style preferences for validation syntax or library choice.
- Missing validation in unchanged code unless directly relevant to understanding a changed-line bug.
- Architectural concerns about validation layer placement or centralization.
- Performance impact of validation operations.

## Investigation Requirements

You must perform deep repo-local investigation:

1. **Use Read, Grep, and Glob** to inspect changed files, trace data flows across function boundaries, identify validation helpers, check schema validation library usage (zod, joi, ajv), examine TypeScript compiler settings (strict mode affects type safety), and understand application architecture.

2. **Use WebSearch or WebFetch** for current public documentation or prior art when external behavior affects findings:
   - OWASP input validation guidance for injection-sensitive sinks (already provided in task context).
   - Schema validation library documentation when analyzing validation correctness.
   - Framework security documentation when analyzing framework-provided validation or sanitization.
   - Node.js API documentation when analyzing parsing functions or built-in validation.

3. **Never send repository code, secrets, private file paths, or proprietary details to web tools.** Use only public framework, package, API, vulnerability class, and documentation names.

## Evidence Requirements

Each finding must include:

1. **Changed line number** containing the data flow from untrusted source to sensitive sink.
2. **Untrusted source identification**: request parameter, environment variable, external API response, file contents, etc.
3. **Sensitive sink identification**: SQL query, shell command, file path, eval, HTML rendering, parse operation, array index, property access, etc.
4. **Concrete evidence of missing or incorrect validation**: no type check, no sanitization, incomplete escaping, type coercion bug, missing edge-case handling, etc.
5. **Potential impact description**: SQL injection, command injection, path traversal, XSS, crash, type coercion bug, denial of service, etc.
6. **Reference to public OWASP or framework validation guidance** when analyzing injection sinks.

## Analysis Instructions

### Data Flow Tracing

- Identify untrusted sources in changed hunks: `req.body`, `req.query`, `req.params`, `req.headers`, `process.env`, `process.argv`, file reads, external API responses, database query results, `JSON.parse` inputs.
- Trace data flow to sinks: SQL query construction, `exec`/`spawn` command arguments, file path construction, HTML template interpolation, `RegExp` constructor arguments, `parseInt`/`parseFloat` calls, array indexing, bracket-notation property access.
- Follow data flow across function boundaries: if a helper function performs validation, confirm all callers use it for inputs of that type.

### Validation Detection

- Check for type validation: `typeof` checks, `instanceof` checks, `Number.isInteger`, `Array.isArray`, schema validation library calls (`.parse()`, `.safeParse()`, `.validate()`).
- Check for format validation: regex matching with anchored patterns, schema validation, allow-list comparison.
- Check for range validation: min/max checks, length checks, numeric bounds.
- Check for sanitization: HTML escaping, SQL escaping, shell escaping, URL encoding.
- Check for error handling: try/catch around parse operations, `.safeParse()` result checking, explicit error returns.

### Validation Correctness

- **Type coercion bugs**: Use strict equality (`===`, `!==`) not loose equality (`==`, `!=`). Check for truthy checks (`if (value)`) that accept `0`, `""`, `false` when those values should be rejected.
- **Incomplete escaping**: Verify escaping function covers all dangerous characters for the context (HTML: `<`, `>`, `&`, `"`, `'`; SQL: use parameterized queries, not string escaping; shell: use array-based arguments, not string escaping).
- **Regex DoS**: Check for catastrophic backtracking patterns in user-supplied regex or patterns applied to untrusted input.
- **Edge cases**: Verify validation handles empty string, negative numbers, very large numbers, special characters, Unicode, null bytes, path traversal sequences (`../`, absolute paths).

### Injection Sink Validation

Apply OWASP input validation guidance:

- **SQL injection**: Parameterized queries or ORM methods are primary defense. If dynamic SQL construction is unavoidable, use strict allow-list validation for identifiers (table/column names) and parameterized values for data.
- **Command injection**: Use array-based arguments (`spawn(['cmd', arg1, arg2])`) not shell string construction. If shell is required, validate arguments against strict allow-list or reject special characters.
- **Path traversal**: Reject `../`, absolute paths, null bytes. Validate against allow-list of permitted directories. Normalize paths and verify result is within expected directory.
- **XSS/HTML injection**: Context-aware output encoding (HTML entities, JavaScript escaping, URL encoding). Input validation is defense-in-depth, not primary control.
- **Regex DoS**: Validate regex complexity or use safe regex libraries. Limit input length before applying complex patterns.

### TypeScript Type System Caveats

- **TypeScript types are compile-time only.** Type annotations do not provide runtime validation. A parameter typed as `number` can receive `"string"` at runtime if the caller is untyped JavaScript or uses type assertions.
- **Check for strict mode**: Inspect `tsconfig.json` for `"strict": true`. If disabled, type checking is weaker and more validation bugs can slip through.
- **Schema validation libraries** (zod, joi, ajv) provide runtime validation. Verify schema matches sink requirements and that validation errors are handled (check `.safeParse()` result or wrap `.parse()` in try/catch).

### Threat Model Considerations

If threat model or authentication boundaries are unknown:

- Note in the finding rationale which inputs might be trusted in some deployments (e.g., internal admin API vs public API).
- Still report missing validation unless the code contains evidence that the input source is always trusted (hardcoded values, results from a trusted internal API with documented contracts, values already validated by framework middleware).

### Repository Context

This Warden TypeScript repository uses:

- **TypeScript strict mode enabled** (`tsconfig.json`: `"strict": true`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`).
- **Zod for schema validation** (`package.json`: `"zod": "^4.3.6"`).
- **Common validation patterns**: `WardenConfigSchema.safeParse()`, `SeverityThresholdSchema.safeParse()`, `.parse()` with error handling.
- **Safe exec patterns**: `execFileNonInteractive(file, args)` uses array arguments, not shell string construction.
- **parseInt usage**: Check for radix parameter and NaN handling (e.g., `Number.isNaN(parsed) ? defaultValue : parsed`).

When analyzing changed hunks, confirm new code follows these patterns.

## False Positive Controls

- Do not report validation as missing when a validation helper is called before the sink.
- Do not report when input is hardcoded or comes from a trusted compile-time constant.
- Do not report when framework middleware performs validation (e.g., Express body parser with schema validation) and the code checks validation results.
- Do not report style issues (e.g., preferring zod over joi) unless the validation is actually incorrect.
- Do not report when TypeScript strict null checks prevent the issue at compile time (but note that runtime validation is still recommended for external inputs).

## Confidence and Severity Calibration

**High confidence** when:
- Changed line contains direct data flow from untrusted source to injection-sensitive sink (SQL, shell, HTML) with no validation.
- Validation is present but demonstrably incorrect (e.g., uses loose equality, incomplete escaping for the context).

**Medium confidence** when:
- Data flow crosses multiple function boundaries and validation might exist in a caller not visible in the diff context.
- Input source might be trusted in some deployments but untrusted in others.

**Low confidence** when:
- The sink is error-prone but not security-sensitive (e.g., parseInt without radix, array indexing without bounds check) and the impact is a crash or incorrect behavior, not injection.

**Severity**:
- **High**: SQL injection, command injection, path traversal, XSS, other injection vulnerabilities that allow arbitrary code execution or data access.
- **Medium**: Type coercion bugs, missing bounds checks, regex DoS, parse errors that cause crashes or incorrect behavior.
- **Low**: Missing validation for non-security-sensitive sinks where the impact is limited to user experience (e.g., missing validation on a display field).

## Remediation Expectations

Provide concrete remediation guidance:

- **SQL injection**: Use parameterized queries or ORM methods. Example: `db.query('SELECT * FROM users WHERE id = ?', [userId])`.
- **Command injection**: Use array-based arguments. Example: `spawn('git', ['log', userInput])` not `exec(`git log ${userInput}`)`.
- **Path traversal**: Normalize and validate paths. Example: `const safe = path.normalize(userPath); if (!safe.startsWith(allowedDir)) throw new Error('Invalid path');`.
- **XSS**: Use context-aware encoding. Example: HTML entities for HTML context, JavaScript escaping for `<script>` context.
- **Type validation**: Use TypeScript strict mode + runtime validation. Example: `const parsed = IntSchema.safeParse(input); if (!parsed.success) return error;`.
- **Parse errors**: Use `.safeParse()` or try/catch and handle errors explicitly. Example: `const num = parseInt(input, 10); if (Number.isNaN(num)) return defaultValue;`.

## Output Contract

Return findings in normal Warden finding schema. Each finding must have:

- `filePath`: The file containing the vulnerability.
- `line`: The changed line number where the data flow occurs.
- `severity`: high, medium, or low.
- `confidence`: high, medium, or low.
- `category`: "security" for injection vulnerabilities, "correctness" for type coercion or parse errors.
- `title`: Concise description (e.g., "SQL injection via unsanitized user input").
- `description`: Detailed explanation with untrusted source, sensitive sink, missing/incorrect validation, and potential impact.
- `suggestedFix`: Optional code suggestion with remediation.

Return no findings when evidence is insufficient. Do not invent a custom output schema.
