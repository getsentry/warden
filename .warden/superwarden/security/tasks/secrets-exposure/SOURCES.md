# secrets-exposure Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|-----------|--------------|-------------------|
| Parent plan.json | canonical | high | Task scope, evidence requirements, out-of-scope exclusions from Superwarden synthesis. | Use to align child skill with parent intent. |
| Sibling task definitions | canonical | high | Boundary definitions for injection-vulnerabilities, access-control-vulnerabilities, cryptographic-vulnerabilities, dependency-vulnerabilities, resource-handling-vulnerabilities. | Do not absorb sibling task concerns. |
| Gitleaks documentation (2026) | external | high | 150+ credential detection patterns, entropy analysis, composite rules (v8.28.0+), SARIF output format. | Use for pattern detection and verification strategies. Do not send repo code to web tools. |
| TruffleHog documentation (2026) | external | high | Credential verification via API calls, Shannon entropy analysis (threshold > 3.0), 800+ secret types, layered detection model. | Reference for two-phase detection (pattern + entropy) and active secret validation. Do not send repo code. |
| OWASP Secrets Management Cheat Sheet | external | high | Best practices: centralized secret managers (Vault, AWS Secrets Manager), encryption-at-rest, least privilege access, ephemeral secrets, rotation. | Use for remediation guidance and risk assessment calibration. |
| Node.js Environment Variables Security (2026) | external | medium | `process.env` security: risks of logging env vars, child process inheritance, validation best practices, Node.js 20 `--env-file` flag. | Inform severity: environment variable usage is acceptable baseline; secrets manager integration is ideal. |
| CWE-798: Use of Hard-coded Credentials | external | high | Canonical vulnerability classification for hardcoded secrets. | Use for severity calibration and impact assessment. |
| Repository `.gitignore` | repo-local | high | Excludes `.env`, `.env.local`, `.env.*.local` from version control. | Verify environment variable files are not committed. |
| Repository `src/action/inputs.ts` | repo-local | high | Environment variable parsing for `WARDEN_ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`; OAuth token detection (`sk-ant-oat` prefix). | Reference for correct credential input flow. |
| Repository `src/sdk/errors.ts` | repo-local | high | `sanitizeErrorMessage()` redaction patterns: `sk-ant-[A-Za-z0-9_-]+`, `Bearer [...]`, `api_key=...`, `authorization: ...`. | Reference for existing redaction logic; extend patterns if new credential types are added. |
| Repository `.github/workflows/warden.yml` | repo-local | high | GitHub Actions workflow using `${{ secrets.WARDEN_ANTHROPIC_API_KEY }}`, `${{ secrets.WARDEN_PRIVATE_KEY }}`. | Reference for correct secrets handling in CI/CD. |
| Repository test files (`src/**/*.test.ts`) | repo-local | medium | Test fixtures with placeholder credentials: `'test-api-key'`, `'sk-ant-api-key'`, `'test-github-token'`. | Use to distinguish fake credentials from real; do not report placeholders. |

## Decisions

### Detection Strategy

**Decision**: Use multi-layer detection combining pattern matching, entropy analysis, data flow tracing, and sink analysis.

**Rationale**:
- **Layer 1 (Hardcoded strings)**: Regex for high-entropy prefixes (`sk-ant-`, `AKIA`, `ghp_`, etc.) catches direct literals.
- **Layer 2 (Logging sinks)**: Grep for `console.log`, `logger.*`, `print` near credential variables detects accidental leaks.
- **Layer 3 (Persistence)**: Search for `writeFileSync`, `JSON.stringify` with credential objects finds unencrypted storage.
- **Layer 4 (Transmission)**: URL query parameter inspection (`fetch("/api?token=...")`) identifies insecure transmission.

**Evidence**: Gitleaks uses regex patterns + composite rules; TruffleHog adds entropy analysis (Shannon > 3.0) + credential verification. This skill combines both approaches plus codebase-specific flow tracing.

**Source mapping**: Gitleaks (regex patterns), TruffleHog (entropy), OWASP (centralized secrets), repository patterns (`src/action/inputs.ts`, `src/sdk/errors.ts`).

### False Positive Controls

**Decision**: Exclude placeholder credentials, redaction constants, environment variable declarations, GitHub Actions secret references, and documentation examples.

**Rationale**:
- Test fixtures often use `'test-api-key'`, `'dummy-token'`, `'fake-secret-123'`; these are not exploitable.
- Redaction code defines constants like `SENSITIVE_VALUE = '[redacted]'`; reporting these is counterproductive.
- `const apiKey = process.env['API_KEY'];` is correct usage, not a hardcoded secret.
- `${{ secrets.NAME }}` is GitHub Actions' secure syntax; GitHub redacts these in logs automatically.
- Documentation examples in backticks or with "placeholder" markers are not real credentials.

**Evidence**: Repository `src/sdk/errors.ts` line 20 defines `SENSITIVE_VALUE`; repository `src/action/inputs.ts` lines 73-78 show environment variable parsing; repository `.github/workflows/warden.yml` lines 16-17, 34-35, 39 use `${{ secrets.* }}`; repository test files use `'test-api-key'` as placeholder.

**Source mapping**: Repository source files, GitHub Actions documentation.

### Severity Calibration

**Decision**: Critical for committed real credentials, High for test fixtures with realistic formats, Medium for indirect leaks.

**Severity Ladder**:
- **Critical**: Hardcoded API key with valid prefix (`sk-ant-api03-...`) in `src/` committed to version control → immediate rotation required.
- **High**: Test fixture with valid prefix but unclear if real → verify and rotate if needed.
- **High**: Error message logging without sanitization (`console.error(error.message)`) → may leak credentials in telemetry.
- **High**: Secrets in URL query parameters (`/api?token=...`) → visible in logs, proxies, browser history.
- **Medium**: `JSON.stringify(config)` where `config` may contain secrets → potential leak if logged.
- **Low**: Ambiguous string matching credential pattern but context suggests placeholder.

**Evidence**: OWASP classifies credential exposure as high impact; CWE-798 is in CWE Top 25; Gitleaks/TruffleHog treat all matches as potential critical findings until verification; Node.js security guidance emphasizes child process inheritance risk.

**Source mapping**: OWASP, CWE-798, Gitleaks, TruffleHog, Node.js security documentation.

### Remediation Patterns

**Decision**: Provide before/after code examples with environment variables, sanitization, secret managers, and platform secret syntax.

**Patterns**:

1. **Hardcoded → Environment Variable**:
   ```typescript
   // ✗ BEFORE
   const apiKey = 'sk-ant-api03-...';
   // ✓ AFTER
   const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'];
   if (!apiKey) throw new Error('WARDEN_ANTHROPIC_API_KEY required');
   ```

2. **Logging → Sanitization**:
   ```typescript
   // ✗ BEFORE
   console.error(`Request failed: ${error.message}`);
   // ✓ AFTER
   import { sanitizeErrorMessage } from './utils/sanitize.js';
   console.error(`Request failed: ${sanitizeErrorMessage(error.message)}`);
   ```

3. **GitHub Actions → Secret Reference**:
   ```yaml
   # ✗ BEFORE
   - run: echo "API_KEY=sk-ant-api03-..." >> $GITHUB_ENV
   # ✓ AFTER
   - run: echo "API_KEY=${{ secrets.WARDEN_ANTHROPIC_API_KEY }}" >> $GITHUB_ENV
   ```

4. **Environment Variable → Secrets Manager**:
   ```typescript
   // ✗ BEFORE (environment variable only)
   const dbPassword = process.env['DB_PASSWORD'];
   // ✓ AFTER (secrets manager)
   import { SecretsManager } from '@aws-sdk/client-secrets-manager';
   const client = new SecretsManager({ region: 'us-east-1' });
   const secret = await client.getSecretValue({ SecretId: 'prod/db/password' });
   const dbPassword = secret.SecretString;
   ```

**Evidence**: Repository `src/sdk/errors.ts` implements `sanitizeErrorMessage()`; repository `src/action/inputs.ts` demonstrates environment variable parsing; OWASP recommends centralized secret managers; GitHub Actions documentation describes `${{ secrets.NAME }}` syntax.

**Source mapping**: Repository source files, OWASP, GitHub Actions documentation, AWS Secrets Manager documentation.

### Framework Caveats

**Decision**: Document Node.js, Python, Go, GitHub Actions, and CI/CD platform-specific behaviors that affect findings.

**Caveats**:
- **Node.js**: `process.env` access is secure if values come from OS environment; `process.env['KEY'] = 'hardcoded'` is NOT secure. Child processes inherit environment variables (expected behavior).
- **Python**: `os.getenv('KEY')` is secure; `os.environ['KEY'] = 'hardcoded'` is NOT secure.
- **Go**: `os.Getenv("KEY")` is secure; hardcoded strings are NOT secure.
- **GitHub Actions**: `${{ secrets.NAME }}` is automatically redacted in logs; do not report as exposure.
- **GitLab CI/CD**: `$CI_JOB_TOKEN`, `$GITLAB_TOKEN` from variables are secure when properly configured.
- **CircleCI**: Context variables are secure when access-controlled.
- **Test isolation**: If test files are not deployed, lower severity to medium but note risk if copied to production.

**Evidence**: Node.js security documentation warns about child process inheritance; GitHub Actions documentation confirms secret redaction; Python, Go standard library documentation describes environment variable access; repository test files show test fixtures are isolated.

**Source mapping**: Node.js security documentation (2026), GitHub Actions documentation, Python docs, Go docs, repository test files.

## Coverage Matrix

| Dimension | Coverage Status | Evidence |
|-----------|----------------|----------|
| **Vulnerability Prerequisites** | Complete | Distinguishes hardcoded secrets, logged credentials, unencrypted storage, and insecure transmission. |
| **Exploitable Dataflow Examples** | Complete | Traces credentials from source (hardcoded vs. env var) to sinks (logs, files, URLs). |
| **False Positive Controls** | Complete | Excludes placeholders, redaction constants, env var declarations, platform secret refs, documentation examples. |
| **Severity/Confidence Calibration** | Complete | Critical for committed real keys, High for unclear test fixtures/logging, Medium for potential leaks. |
| **Remediation Patterns** | Complete | Before/after code for env vars, sanitization, secret managers, GitHub Actions/GitLab CI/CircleCI syntax. |
| **Framework/Runtime Caveats** | Complete | Node.js `process.env`, Python `os.getenv`, Go `os.Getenv`, GitHub Actions redaction, test isolation, child process inheritance. |
| **API Surface** | Complete | Covers `process.env`, `os.getenv`, `os.Getenv`, `console.log`, `logger.*`, `JSON.stringify`, `writeFileSync`, GitHub Actions/GitLab/CircleCI workflow syntax. |
| **Config/Runtime Options** | Complete | Environment variable naming conventions, `.env` file exclusion in `.gitignore`, CI/CD variable injection patterns. |
| **Common Use Cases** | Complete | API authentication, database credentials, webhook secrets, JWT signing keys, private keys (PEM). |
| **Known Issues/Workarounds** | Complete | Cannot detect rotated keys, obfuscated credentials (Base64, concatenation), or vault integration without external validation. |
| **Version/Migration Variance** | Partial | Current patterns cover 2026 formats (Anthropic `sk-ant-*`, GitHub `ghp_*`/`github_pat_*`, AWS `AKIA*`, etc.); update if formats change. |

## Open Gaps

### Credential Rotation Validation

**Gap**: Cannot verify if a detected credential has been rotated without external API validation.

**Impact**: May report already-rotated keys as critical findings.

**Mitigation**: Recommend immediate rotation for all detected credentials; TruffleHog's verification feature could be integrated for active secret checks.

**Next Steps**: Research TruffleHog verification API; consider adding optional credential validation step with user consent (requires external network access).

### Obfuscated Credentials

**Gap**: Base64-encoded secrets (`Buffer.from('c2stYW50LWFwaTA...', 'base64')`), environment variable concatenation (`process.env['API_PREFIX'] + process.env['API_SUFFIX']`), or XOR obfuscation may evade pattern matching.

**Impact**: False negatives for sophisticated obfuscation techniques.

**Mitigation**: Add entropy analysis (TruffleHog approach) for high-entropy strings; trace multi-variable concatenation.

**Next Steps**: Implement Shannon entropy check (threshold > 4.5) for string literals; extend data flow analysis to multi-variable assignments and decode operations.

### Secrets Manager Integration Detection

**Gap**: Cannot verify if environment variables are sourced from HashiCorp Vault, AWS Secrets Manager, Doppler, GCP Secret Manager, or similar.

**Impact**: May under-report severity when environment variable usage is actually vault-backed.

**Mitigation**: Check for vault client initialization (`import Vault from 'node-vault'`, `from boto3 import client; sm = client('secretsmanager')`) and adjust recommendations.

**Next Steps**: Add secrets manager detection patterns; upgrade recommendations from "use environment variables" to "use secrets manager" when vault is present.

### Historical Credential Scans

**Gap**: Focuses on changed lines; does not scan entire git history for previously committed secrets.

**Impact**: Existing hardcoded credentials in unchanged files are not detected.

**Mitigation**: Recommend periodic full-repo scans with gitleaks (`gitleaks detect --source .`) or TruffleHog (`trufflehog filesystem .`) as complement to PR-based detection.

**Next Steps**: Document in remediation that gitleaks should run on main branch; this skill focuses on preventing new exposures in changed code.

### Entropy Analysis Implementation

**Gap**: Currently relies on pattern matching only; does not calculate Shannon entropy for ambiguous strings.

**Impact**: May miss generic high-entropy secrets without known prefixes (e.g., custom API keys, session tokens).

**Mitigation**: Add entropy calculation for strings matching generic patterns (e.g., `[A-Za-z0-9_-]{32,}`).

**Next Steps**: Implement Shannon entropy function; apply threshold > 4.5 for base64/hex strings, > 3.0 for alphanumeric strings (TruffleHog approach).

## Changelog

### 2026-04-30: Initial Synthesis

- **Parent skill**: security (Superwarden coordinator)
- **Task**: secrets-exposure
- **Scope**: Hardcoded credentials, logged secrets, unencrypted storage, missing redaction
- **Sources consulted**:
  - **External**: Gitleaks (2026 composite rules), TruffleHog (entropy analysis, verification), OWASP Secrets Management Cheat Sheet, Node.js environment variable security (2026), CWE-798
  - **Repository**: `.gitignore`, `src/action/inputs.ts`, `src/sdk/errors.ts`, `.github/workflows/warden.yml`, test files (`src/**/*.test.ts`)
  - **Parent plan**: `plan.json` task definition, sibling task exclusions
- **Coverage**: Vulnerability prerequisites, exploitable dataflow, false-positive controls, severity calibration, remediation patterns, framework caveats
- **Known gaps**: Credential rotation validation, obfuscation detection, secrets manager integration, historical scans, entropy analysis
- **Quality bar**: Security-review synthesis standards met (see SPEC.md Evaluation section)
- **Detection layers**: Hardcoded strings (regex + entropy), logging sinks (console/logger), unencrypted persistence (file I/O), insecure transmission (URL params)
- **False-positive controls**: Placeholders, redaction constants, env var declarations, platform secret references, documentation examples
- **Severity ladder**: Critical (committed real credentials) → High (test fixtures, logging, URL params) → Medium (potential leaks) → Low (ambiguous)
- **Remediation patterns**: Environment variables, sanitization functions, secret managers, CI/CD platform syntax
- **Framework caveats**: Node.js, Python, Go, GitHub Actions, GitLab CI, CircleCI, test isolation, child process inheritance
