# injection-vulnerabilities Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
| --- | --- | --- | --- | --- |
| OWASP Top 10:2025 (A05 Injection) | canonical | high | Current vulnerability classification framework for injection attacks. | Public OWASP documentation only. |
| OWASP SQL Injection Prevention Cheat Sheet | canonical | high | Parameterized query patterns, prepared statements, defense-in-depth guidance. | Public OWASP documentation only. |
| OWASP Injection Prevention Cheat Sheet | canonical | high | General injection prevention patterns (SQL, command, code, template). | Public OWASP documentation only. |
| CWE-89: SQL Injection | canonical | high | SQL injection vulnerability definition, attack patterns, consequences. | Public CWE/MITRE documentation only. |
| CWE-78: OS Command Injection | canonical | high | Command injection vulnerability definition, exploitation vectors. | Public CWE/MITRE documentation only. |
| CWE-94: Code Injection | canonical | high | Code injection vulnerability definition, eval/Function risks. | Public CWE/MITRE documentation only. |
| Node.js child_process security (CVE-2024-27980, CVE-2024-36138) | canonical | high | Windows batch file injection, spawn vs exec, shell option risks. | Public Node.js security releases only. |
| Node.js SQL injection prevention guides | reference | medium | Parameterized query patterns, ORM usage, input validation for Node.js ecosystem. | Public framework/library names and patterns only. |
| Node.js command injection prevention guides | reference | medium | Argument validation, execFile vs exec, allowlist patterns. | Public framework/library names and patterns only. |
| Template engine security documentation | reference | medium | Escaping behavior (Handlebars `{{ }}` vs `{{{ }}}`, EJS `<%= %>` vs `<%- %>`, Pug auto-escaping). | Public template engine documentation only. |
| Server-Side Template Injection guides (PortSwigger, HackTricks) | reference | medium | SSTI exploitation patterns, prevention strategies. | Public SSTI techniques and payloads only. |
| `src/utils/exec.ts` | repo-local | high | Safe and unsafe subprocess invocation patterns (`execFileNonInteractive`, `execNonInteractive`, `execGitNonInteractive`). | Inspect for changed code deviating from safe patterns. |
| `src/cli/git.ts` | repo-local | high | Git command execution using argument arrays (safe pattern). | Reference for safe git invocation. |
| `evals/fixtures/sql-injection/api.ts` | repo-local | high | Example vulnerable SQL injection pattern (string interpolation `name = '${params.name}'`). | Reference for unsafe SQL construction. |
| `package.json` | repo-local | high | Dependency manifest showing absence of database ORMs (Prisma, Sequelize, Knex) and template engines (Handlebars, EJS, Pug). | Infer technology stack and injection risk surface. |
| React `dangerouslySetInnerHTML` usage | repo-local | medium | Client-side XSS risk in Ink UI rendering code. | Examine for user input rendering. |
| Parent Superwarden plan (`plan.json`) | repo-local | high | Task scope, evidence requirements, out-of-scope exclusions. | Preserve task boundaries and avoid sibling task overlap. |

## Decisions

### Decision: Cover SQL, command, code, and template injection in one child skill

**Rationale**: These injection classes share common investigation protocol (data-flow tracing from user input to unsafe sink), similar evidence requirements (changed-line anchoring, concrete exploitation examples, remediation patterns), and overlapping framework/runtime caveats (input validation, defense-in-depth). Splitting into separate child skills would duplicate investigation steps and create boundary ambiguity (e.g., SQL injection enabling command execution via stored procedures).

**Evidence**: Parent task scope explicitly lists "SQL injection, command injection, code injection, and template injection" together. OWASP Top 10:2025 groups these under A05 Injection. CWE-74 (Improper Neutralization of Special Elements in Output Used by a Downstream Component) is the parent class for CWE-89, CWE-78, CWE-94.

### Decision: Require changed-line anchoring and concrete data-flow traces

**Rationale**: Injection vulnerabilities require tracing untrusted input from entry point to execution sink. Without concrete data-flow evidence, findings are speculative and generate false positives. Warden's diff-based analysis provides changed-line context, enabling precise anchoring.

**Evidence**: Parent evidence requirements include "Changed line range showing user input entering an unsafe sink" and "Data flow path from input source to execution point". Repository analysis shows Warden operates on changed hunks with line number context.

### Decision: Exclude findings when parameterization or framework protections are correctly applied

**Rationale**: Parameterized queries (prepared statements), ORM query builders, argument arrays, auto-escaped templates, and JSON.parse are industry-standard defenses against injection. Reporting these as vulnerabilities generates false positives and reviewer fatigue.

**Evidence**: Parent task exclusions include "Exclude findings when sanitization, parameterization, or framework protections are correctly applied". OWASP SQL Injection Prevention Cheat Sheet primary defense is parameterized queries. Node.js command injection guides recommend execFile with argument arrays over exec with shell.

### Decision: Use public documentation only for web tool queries

**Rationale**: Repository code, file paths, and proprietary patterns must not be sent to external web services (WebSearch, WebFetch) due to confidentiality and intellectual property concerns. Public framework, library, CVE, and vulnerability class names are safe to query.

**Evidence**: Parent instructions state "Do not send repository code or file paths to web tools". Superwarden contract prohibits "sending repository code, secrets, private file paths, or proprietary details to web tools".

### Decision: State missing context explicitly instead of inventing facts

**Rationale**: When input trustworthiness, framework defenses, or deployment environment is unknown, speculative findings reduce precision and waste reviewer time. Explicitly noting missing context enables follow-up investigation or contextual adjustments to skill instructions.

**Evidence**: Parent Superwarden plan includes "missingInputs" for "Specific technology stack and runtime environment in use", "Deployment architecture and infrastructure configuration", "Data sensitivity classification and regulatory requirements". Parent instructions state "When repository technology stack is unclear, inspect import statements, dependency manifests, and runtime configuration to infer the environment before assessing defenses".

### Decision: Calibrate severity by exploitability and impact, confidence by evidence completeness

**Rationale**: Not all injection vulnerabilities have equal security impact. SQL injection enabling authentication bypass or data exfiltration is high severity. Command injection requiring admin privileges is medium severity. Theoretical injection with significant exploitation barriers is low severity. Confidence reflects evidence quality (complete data-flow trace vs partial trace vs assumptions).

**Evidence**: Industry-standard severity frameworks (CVSS, OWASP Risk Rating) consider exploitability and impact. Warden's finding schema includes separate `severity` and `confidence` fields. Security-review synthesis quality bar requires "severity/confidence calibration".

## Coverage Matrix

| Dimension | Coverage status | Evidence |
| --- | --- | --- |
| **Security-review synthesis dimensions** | | |
| Vulnerability prerequisites | complete | Exploitability prerequisites documented: attacker control over input, absence of validation, unsafe API usage, missing framework protections. |
| Exploitable dataflow examples | complete | Concrete exploitation examples provided for SQL injection, command injection, code injection, template injection (SSTI and XSS). |
| False-positive controls | complete | Safe patterns documented: parameterized queries, execFileNonInteractive, argument arrays, JSON.parse, auto-escaped templates. |
| Severity/confidence calibration | complete | High/medium/low severity by exploitability and impact; high/medium/low confidence by evidence completeness. |
| Concrete remediation patterns | complete | Smallest safe fixes: use parameterized queries, use execFileNonInteractive, use JSON.parse, use auto-escaped template syntax. |
| Framework/runtime caveats | complete | Node.js CVE-2024-27980, vm module limitations, template context sensitivity, ORM raw query methods, Windows-specific risks. |
| **SDK/API/integration dimensions** | | |
| API surface | complete | Injection sinks documented: string concatenation in SQL, exec/spawn with shell, eval/Function, unescaped template variables. |
| Config/runtime options | complete | Framework defenses: ORM parameterization, template engine auto-escaping, spawn without shell, argument validation. |
| Common use cases | complete | Database queries, subprocess invocation, code evaluation, template rendering. |
| Known issues/workarounds | complete | CVE-2024-27980 (Windows batch file injection), vm module sandbox escapes, template context-specific injection. |
| Version/migration variance | partial | Node.js CVE-2024-27980 affects 18.x, 20.x, 21.x before April 2024 patch. ORM-specific parameterization syntax not fully enumerated (PostgreSQL `$1`, MySQL `?`, named parameters). |

## Open Gaps

### Gap: ORM-specific parameterization patterns not fully enumerated

**Impact**: May generate false positives for safe parameterization patterns unique to specific ORMs (Prisma, Sequelize, Knex, TypeORM, Drizzle) not documented in public guides.

**Next steps**: If database code is detected in changed files, use WebSearch to query "[detected ORM name] parameterized queries SQL injection prevention" and retrieve current documentation. Update SKILL.md and SPEC.md with ORM-specific safe patterns.

**Current mitigation**: General parameterization patterns (prepared statements, bound parameters, query builders) cover most cases. Repository inspection found no ORM dependencies in `package.json`, reducing immediate gap impact.

### Gap: Template engine context-specific escaping not fully documented

**Impact**: May miss template injection when auto-escaping doesn't cover JavaScript context, URL context, or CSS context (HTML context only).

**Next steps**: If template engine usage is detected in changed files, use WebSearch to query "[detected template engine name] context-sensitive escaping JavaScript URL CSS" and retrieve current security documentation. Update SKILL.md with context-specific escaping guidance.

**Current mitigation**: No template engine dependencies detected in `package.json`. React `dangerouslySetInnerHTML` usage is HTML context only (XSS risk, not SSTI).

### Gap: Windows-specific command injection detection

**Impact**: CVE-2024-27980 (batch file injection) may not be detected without Windows deployment context or `.bat`/`.cmd` file extension detection.

**Next steps**: If Windows deployment is confirmed or batch file execution is detected, add Windows-specific argument validation guidance and CVE-2024-27980 exploitation patterns to SKILL.md.

**Current mitigation**: Repository inspection found Linux/macOS-focused tooling (shell scripts, Unix paths). Windows deployment context unknown but likely low priority.

### Gap: Indirect data-flow analysis depth

**Impact**: May miss injection when untrusted input flows through multiple intermediate functions, object properties, or closure variables.

**Next steps**: If false negatives are reported for indirect data flows, enhance investigation protocol to trace function calls, object property assignments, and closure captures. Consider adding data-flow analysis tooling or inter-procedural analysis techniques.

**Current mitigation**: Explicitly documented as known limitation. Investigation protocol focuses on direct data flows visible in changed hunks. Missing context handling requires stating when data-flow boundaries are unclear.

## Changelog

### 2026-04-30: Initial Superwarden child skill synthesis

- Synthesized injection-vulnerabilities child skill from security parent skill and injection-vulnerabilities task.
- Inspected repository source:
  - `src/utils/exec.ts`: Safe (`execFileNonInteractive`, `execGitNonInteractive`) and unsafe (`execNonInteractive`) subprocess patterns.
  - `src/cli/git.ts`: Safe git command execution using argument arrays.
  - `evals/fixtures/sql-injection/api.ts`: Example vulnerable SQL injection pattern (string interpolation).
  - `package.json`: No database ORM dependencies (Prisma, Sequelize, Knex, TypeORM, Drizzle, Mongoose), no template engines (Handlebars, EJS, Pug, Mustache, Nunjucks).
  - React `dangerouslySetInnerHTML` usage in Ink UI rendering code (XSS risk).
- Consulted public external sources:
  - OWASP Top 10:2025 (A05 Injection), SQL Injection Prevention Cheat Sheet, Injection Prevention Cheat Sheet, SSTI Testing Guide.
  - CWE-89 (SQL Injection), CWE-78 (OS Command Injection), CWE-94 (Code Injection).
  - Node.js child_process security (CVE-2024-27980, CVE-2024-36138).
  - Node.js SQL injection prevention guides (StackHawk, PlanetScale, Medium).
  - Node.js command injection prevention guides (nodejs-security.com).
  - Template engine security (PortSwigger SSTI, Veracode Node.js template engines, HackTricks SSTI).
  - Code evaluation risks (nodejs-security.com eval risks, Snyk vm module limitations).
- Applied security-review synthesis quality bar:
  - Vulnerability prerequisites: Attacker control, absence of validation, unsafe API usage, missing framework protections.
  - Exploitable dataflow examples: SQL injection, command injection, code injection, template injection (SSTI and XSS).
  - False-positive controls: Parameterized queries, execFileNonInteractive, argument arrays, JSON.parse, auto-escaped templates.
  - Severity/confidence calibration: High/medium/low by exploitability/impact and evidence completeness.
  - Concrete remediation patterns: Use parameterized queries, use execFileNonInteractive, use JSON.parse, use auto-escaped template syntax.
  - Framework/runtime caveats: Node.js CVEs, vm module limitations, template context sensitivity, ORM raw query methods.
- Documented missing context:
  - Technology stack (database libraries, template engines).
  - Input trustworthiness model (CLI args, env vars, HTTP requests, webhooks, LLM outputs).
  - Framework defenses (ORM parameterization, template auto-escaping).
  - Deployment environment (database access, shell execution permissions).
  - Privilege model (unauthenticated, authenticated, admin-only access).
- Set hard boundaries with sibling tasks:
  - Do not cover authentication/authorization bypass (access-control-vulnerabilities owns this).
  - Do not cover cryptographic flaws (cryptographic-vulnerabilities owns this).
  - Do not cover dependency CVEs (dependency-vulnerabilities owns this).
  - Do not cover secrets exposure (secrets-exposure owns this).
  - Do not cover resource exhaustion (resource-handling-vulnerabilities owns this).
  - Only report injection, not other vulnerability classes, unless injection enables them (e.g., SQL injection `' OR '1'='1` for auth bypass).
