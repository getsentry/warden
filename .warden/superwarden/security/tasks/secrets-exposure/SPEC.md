# secrets-exposure Specification

## Intent

Detect secrets exposure (CWE-798) and sensitive data leakage vulnerabilities in changed code, focusing on hardcoded credentials, API key leaks, logging of secrets, and unencrypted sensitive data storage or transmission. This child skill synthesizes parent task "secrets-exposure" from Superwarden parent skill "security".

## Scope

### In Scope

1. **Hardcoded credentials** in source code, configuration files, or test fixtures:
   - API keys (AWS, Anthropic, GitHub, Stripe, Slack, Google, etc.)
   - Bearer tokens, OAuth tokens, session secrets, JWT signing keys
   - Database connection strings with embedded passwords
   - Private keys (PEM, SSH, GPG formats)
   - Webhook secrets, encryption keys, service account credentials

2. **Logging of sensitive data**:
   - API keys or tokens in `console.log`, `logger.*`, `print`, `System.out.println`
   - Secrets in error messages, stack traces, or telemetry (Sentry, OpenTelemetry, etc.)
   - Unredacted credentials in debugging output or request/response logs
   - JSON serialization of config objects containing secrets

3. **Unencrypted storage or transmission**:
   - Secrets written to files, cache, or temporary storage without encryption
   - Credentials in URL query parameters or HTTP headers without HTTPS assurance
   - Plaintext storage in databases, local storage, or cookies

4. **Missing redaction in error handling**:
   - Error messages that echo API keys or tokens
   - Stack traces with credential-containing paths
   - Diagnostic output including full request headers with auth tokens

### Out of Scope

- **Injection vulnerabilities** (owned by injection-vulnerabilities): SQL injection, command injection, code injection
- **Access control flaws** (owned by access-control-vulnerabilities): authentication mechanism design, authorization bypass
- **Cryptographic algorithm issues** (owned by cryptographic-vulnerabilities): weak hashing, insecure encryption modes
- **Dependency vulnerabilities** (owned by dependency-vulnerabilities): CVEs in third-party packages
- **Resource exhaustion** (owned by resource-handling-vulnerabilities): denial-of-service, unbounded loops
- **Non-sensitive configuration**: feature flags, public constants, non-credential environment variables

## Users And Trigger Context

- **Primary users**: Security reviewers, maintainers, automated CI/CD checks analyzing pull requests
- **Trigger context**: Changed code in pull requests, scheduled security scans, local CLI runs
- **Common scenarios**:
  - Developer accidentally commits test fixture with real API key
  - New logging statement includes error message that may contain credential echoes
  - Configuration file adds hardcoded database password instead of environment variable
  - CI/CD workflow mistakenly hardcodes a secret instead of using platform secret reference

## Runtime Contract

### Required Inputs

- **Changed files** with diff context showing added or modified lines
- **Repository root** for glob/grep access to related files (e.g., `.gitignore`, config loaders)
- **Optional**: Git history access for credential rotation validation

### Execution Steps

1. **Glob** for source files, configuration files, and workflow definitions in changed paths
2. **Grep** for credential patterns: high-entropy prefixes, generic keywords, PEM blocks, connection strings
3. **Read** matched files to inspect full context, data flow, and surrounding code
4. **Trace** secrets from source (environment variable vs. hardcoded) to sinks (logs, files, URLs)
5. **WebSearch/WebFetch** for public prior art on credential scanning patterns, secure logging, secret management (use only public names)
6. **Classify** findings by severity, confidence, and exploitability
7. **Report** using Warden's standard finding schema with changed-line anchors

### Output Contract

- **Findings array** in Warden's JSON schema, each with:
  - `title`, `severity`, `confidence`, `category`, `location`, `description`, `recommendation`, `references`
- **No findings** when evidence is insufficient (do not invent vulnerabilities)
- **No custom schemas** or non-standard output formats

### Error Handling

- **Missing context**: State explicitly in finding description what additional information is needed
- **Ambiguous patterns**: Lower confidence to "low" and request clarification
- **Web tool failures**: Proceed with repo-local evidence; do not block on external searches

## Source And Evidence Model

### Authoritative Sources (Repo-Local)

- **Source code**: Showing credential usage, logging, error handling, and data flow
- **Configuration files**: `.env`, `.gitignore`, CI/CD workflows, secret management configs
- **Test fixtures**: Distinguishing real vs. fake credentials, placeholder patterns
- **Existing security patterns**: Redaction functions, sanitization utilities, environment variable loaders

### Useful External Sources (Public Only)

- **Credential scanning tools**: Gitleaks detection patterns (2026 composite rules), TruffleHog verification and entropy analysis, GitGuardian rulesets
- **Secure logging guides**: Pino redaction, structured logging PII handling, OWASP logging cheat sheet
- **Framework docs**: Node.js environment variable security, GitHub Actions secrets handling, AWS Secrets Manager, HashiCorp Vault
- **Standards**: OWASP Secrets Management Cheat Sheet, CWE-798, NIST guidelines
- **CVE databases**: Public disclosures of credential exposure patterns in similar tools

### Evidence Requirements

1. **Changed line number** in diff showing credential, logging, or storage
2. **Secret type identification**: API key (with provider), token type, private key format, database credential
3. **Exposure mechanism**: Hardcoded, logged, stored unencrypted, transmitted insecurely
4. **Absence of externalization**: No secret store reference, environment variable injection, or encrypted vault usage at the usage point
5. **Pattern match or entropy analysis**: High-confidence detection (not just keyword match)
6. **Impact assessment**: How an attacker could exploit the exposed secret
7. **Public reference**: Link to credential scanning tool docs, OWASP, or secure logging guidance

### Data That Must Not Be Stored

- **Repository code snippets** sent to web tools (use only public API/framework names)
- **Actual credential values** (even if fake-looking; redact in examples)
- **Private file paths** or internal implementation details in external queries

## Reference Architecture

### Detection Layers

**Layer 1: Hardcoded String Literals**
- Pattern: `const apiKey = 'sk-ant-api03-...'` (direct assignment)
- Severity: Critical if committed; High if in test fixture without clear "fake" marker

**Layer 2: Logging Sinks**
- Pattern: `console.log(apiKey)`, `logger.error(error.message)` without sanitization
- Severity: Critical if secret is logged; Medium if unclear whether value is sanitized

**Layer 3: Unencrypted Persistence**
- Pattern: `writeFileSync('config.json', JSON.stringify({ apiKey }))` without encryption
- Severity: High (accessible to local attackers or accidental commits)

**Layer 4: URL/Header Transmission**
- Pattern: `fetch("/api?token=${apiKey}")` instead of header-based auth
- Severity: High (visible in logs, proxies, browser history)

### Common Credential Patterns

| Secret Type | Pattern | Example Prefix | Entropy Threshold |
|-------------|---------|----------------|-------------------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | `AKIA` | N/A (fixed format) |
| Anthropic API Key | `sk-ant-api\d{2}-[A-Za-z0-9_-]{95}` | `sk-ant-api` | High |
| Anthropic OAuth Token | `sk-ant-oat[A-Za-z0-9_-]+` | `sk-ant-oat` | High |
| GitHub Token | `gh[ps]_[A-Za-z0-9]{36,}` | `ghp_`, `ghs_` | High |
| GitHub PAT | `github_pat_[A-Za-z0-9_]{82}` | `github_pat_` | N/A (fixed format) |
| Google API Key | `AIza[0-9A-Za-z_-]{35}` | `AIza` | N/A (fixed format) |
| Slack Token | `xox[baprs]-[0-9a-zA-Z-]{10,}` | `xox` | Medium-High |
| Stripe API Key | `[rs]k_live_[0-9a-zA-Z]{24,}` | `rk_live_`, `sk_live_` | High |
| JWT | `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | `eyJ` | High |
| Private Key (PEM) | `-----BEGIN (PRIVATE\|RSA\|EC) KEY-----` | `-----BEGIN` | N/A (structured) |
| Generic High-Entropy | `[A-Za-z0-9_-]{32,}` | N/A | Shannon > 4.5 |

### Redaction Patterns

Common redaction implementations:

```typescript
// Anthropic keys
message.replace(/\b(sk-ant-[A-Za-z0-9_-]+)/g, '[redacted]')

// Bearer tokens
message.replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1[redacted]`)

// Generic API keys
message.replace(/\b(api[_-]?key|token)(\s*[:=]\s*)(["']?)[^"',\s)]+/gi, `$1$2$3[redacted]`)
```

## Evaluation

### Validation Checklist

- [ ] **Changed-line anchoring**: Every finding references a specific line number from the diff
- [ ] **Concrete secret type**: Each finding identifies the credential format (AWS key, GitHub token, PEM key, etc.)
- [ ] **Exploitability**: Description explains how an attacker could use the exposed secret
- [ ] **Remediation**: Before/after code examples show correct environment variable usage, sanitization, or secret manager integration
- [ ] **Public references**: Links to gitleaks docs, OWASP, TruffleHog, or secure logging guides (cited in findings)
- [ ] **No false positives**: Placeholder credentials, redaction constants, environment variable declarations, and platform secret references are excluded
- [ ] **Missing context**: Ambiguous cases state what additional information is needed

### Test Cases

**True Positive (Critical)**:
```typescript
// Line 42: Hardcoded Anthropic API key
const ANTHROPIC_API_KEY = 'sk-ant-api03-realKeyHere123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
```
→ Report: "Hardcoded Anthropic API key on line 42. Rotate key immediately and use process.env['WARDEN_ANTHROPIC_API_KEY']."

**True Positive (High)**:
```typescript
// Line 108: Logging error message that may contain API key
console.error(`Auth failed: ${error.message}`);
```
→ Report: "Error message logged without sanitization on line 108. Use sanitizeErrorMessage(error.message) before logging."

**True Positive (High)**:
```yaml
# Line 23: Hardcoded secret in GitHub Actions workflow
- run: echo "API_KEY=sk-ant-api03-abc123" >> $GITHUB_ENV
```
→ Report: "Hardcoded secret in workflow on line 23. Use: echo \"API_KEY=${{ secrets.WARDEN_ANTHROPIC_API_KEY }}\" >> $GITHUB_ENV"

**False Positive (Exclude)**:
```typescript
// Line 67: Test fixture with clearly fake credential
const mockApiKey = 'test-fake-api-key-placeholder';
```
→ No report: Placeholder value, not a real credential.

**False Positive (Exclude)**:
```typescript
// Line 15: Environment variable declaration (correct usage)
const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'];
```
→ No report: Environment variable usage is the correct pattern.

**False Positive (Exclude)**:
```yaml
# Line 39: GitHub Actions secret reference (correct usage)
anthropicApiKey: ${{ secrets.WARDEN_ANTHROPIC_API_KEY }}
```
→ No report: GitHub Actions automatically redacts these in logs.

### Acceptance Gates

1. **Precision**: No reports for placeholder credentials, redaction constants, environment variable declarations, or platform secret references
2. **Recall**: Detects all hardcoded high-entropy API keys, tokens, PEM private keys, and database credentials in changed lines
3. **Actionability**: Every finding includes concrete remediation with code example
4. **Sourcing**: References to gitleaks patterns, OWASP guidance, TruffleHog verification, or secure logging docs are included

## Known Limitations

1. **Credential rotation**: Cannot determine if a detected key has already been rotated without external validation (TruffleHog verification API)
2. **Obfuscation**: Base64-encoded secrets, environment variable concatenation, or encryption may evade pattern matching
3. **Test vs. production**: Cannot definitively distinguish test fixtures from production code without deployment context
4. **Historical commits**: Focuses on changed lines; does not scan entire git history (use gitleaks full-repo scan for that)
5. **Secret manager integration**: Cannot verify if environment variables are sourced from HashiCorp Vault, AWS Secrets Manager, or similar without inspecting initialization code
6. **Child process inheritance**: Environment variable inheritance is expected behavior in Node.js, Python, Go; not a vulnerability unless parent process is compromised

## Maintenance Notes

### Update Triggers

- **New credential formats**: If cloud providers introduce new API key prefixes or token formats, update regex patterns
- **Additional logging libraries**: If codebase adopts new logging frameworks, extend sink detection patterns
- **Secrets management changes**: If project moves to Doppler, Vault, or another secrets manager, adjust recommendations and detection logic
- **Framework upgrades**: Node.js, Python, Go, or GitHub Actions security changes may affect environment variable handling

### Pattern Maintenance

Current credential patterns (from Reference Architecture section):
- AWS: `AKIA[0-9A-Z]{16}`
- Anthropic API keys: `sk-ant-api\d{2}-[A-Za-z0-9_-]{95}`
- Anthropic OAuth tokens: `sk-ant-oat[A-Za-z0-9_-]+`
- GitHub tokens: `gh[ps]_[A-Za-z0-9]{36,}`, `github_pat_[A-Za-z0-9_]{82}`
- Google: `AIza[0-9A-Za-z_-]{35}`
- Slack: `xox[baprs]-[0-9a-zA-Z-]{10,}`
- Stripe: `[rs]k_live_[0-9a-zA-Z]{24,}`
- JWT: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`
- PEM: `-----BEGIN (PRIVATE|RSA|EC) KEY-----`

If patterns evolve, update both detection regex and remediation examples.

### External Source Refresh

Every 6 months, verify:
- Gitleaks ruleset updates (new credential patterns, composite rules)
- TruffleHog verification capabilities (new secret types, entropy thresholds)
- OWASP Top 10 / CWE Top 25 changes affecting secrets management
- Node.js / Python / Go LTS security advisories related to environment variables
- GitHub Actions / GitLab CI / CircleCI security hardening guidance updates
- AWS / GCP / Azure secrets manager best practices
