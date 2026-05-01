# cryptographic-vulnerabilities Specification

## Intent

This child skill detects cryptographic implementation flaws in changed code: weak algorithms (MD5, SHA-1, DES, 3DES, RC4), insecure encryption modes (ECB, unauthenticated CBC), weak random number generation (`Math.random`), hardcoded cryptographic keys, disabled certificate validation, and deprecated TLS protocols (1.0, 1.1).

It is synthesized from the parent **security** Superwarden skill and executes as a focused security review task anchored to changed lines in Node.js/TypeScript code.

## Scope

### In Scope

- Weak cryptographic hash functions: MD5, SHA-1 (NIST-deprecated, collision-vulnerable)
- Weak symmetric ciphers: DES, 3DES/TDEA, RC4, RC2
- Insecure cipher modes: ECB (pattern exposure), CBC without authentication
- Weak asymmetric algorithms: RSA < 2048 bits, DSA, weak elliptic curves
- Predictable random number generation: `Math.random()`, `Date.now()` for security purposes
- Hardcoded encryption keys, HMAC secrets, signing keys, IVs, salts
- Disabled TLS certificate validation: `rejectUnauthorized: false`, custom `checkServerIdentity` bypasses
- Deprecated TLS protocols: TLS 1.0, TLS 1.1, SSLv3
- Weak cipher suites: CBC mode, non-forward-secret, export-grade ciphers

### Out of Scope

- **Injection vulnerabilities**: SQL injection, command injection, code injection (owned by injection-vulnerabilities)
- **Authentication and authorization bypass**: Missing auth checks, weak password policies, session fixation (owned by access-control-vulnerabilities)
- **Secrets exposure**: Hardcoded API keys, tokens, credentials, logging of secrets (owned by secrets-exposure). Boundary: hardcoded encryption keys belong to this task; hardcoded API keys belong to secrets-exposure.
- **Dependency vulnerabilities**: Vulnerable crypto libraries, outdated packages (owned by dependency-vulnerabilities)
- **Resource handling**: DoS, algorithmic complexity, hash flooding (owned by resource-handling-vulnerabilities)
- **Performance optimization**: Algorithm efficiency unrelated to security

## Users And Trigger Context

- **Primary users**: Security reviewers, developers running Warden on pull requests, CI/CD pipelines enforcing cryptographic standards.
- **Trigger context**: Changed lines in TypeScript/JavaScript files introducing cryptographic operations (hashing, encryption, random generation, TLS configuration).
- **Expected input**: Git diff with added/modified lines, repository source for context tracing.
- **Expected output**: Warden findings with changed-line locations, severity/confidence ratings, exploitation scenarios, remediation patterns.

## Runtime Contract

### Execution Agent Responsibilities

1. **Deep repo-local investigation**: Use Read, Grep, Glob to inspect changed files, trace data flows, examine existing cryptographic patterns.
2. **Public prior art research**: Use WebSearch or WebFetch for current NIST/OWASP/CWE guidance when algorithm deprecation timelines or vulnerability disclosures affect findings.
3. **Changed-line anchoring**: Anchor all findings to specific changed line ranges.
4. **Concrete evidence**: Require complete data-flow traces, algorithm identification, exploitability analysis, remediation patterns.
5. **Normal Warden findings behavior**: Return only findings matching the existing schema; return empty array when evidence is insufficient.
6. **Privacy protection**: Do not send repository code, secrets, private file paths, or proprietary key values to web tools.

### Required Evidence Per Finding

- Changed line range showing weak algorithm, insecure mode, hardcoded key, or certificate bypass
- Public security guidance or standards document identifying the algorithm/practice as insecure
- Absence of modern replacement or secure configuration at the usage site
- Cryptographic operation context showing sensitive data protection or authentication reliance
- Exploitation scenario demonstrating realistic attack
- Concrete remediation pattern with code-level specificity

### False-Positive Controls

- SHA-256, SHA-384, SHA-512, SHA-3: Always safe (NIST-approved)
- AES-128-GCM, AES-256-GCM, ChaCha20-Poly1305: Safe with proper key/IV management
- `crypto.randomBytes`, `crypto.randomUUID`, `crypto.getRandomValues`: Cryptographically secure
- Non-cryptographic hashing: MD5/SHA-1 for content addressing, checksums, deduplication (not security-sensitive)
- Test fixtures: Hardcoded keys/IVs in test code clearly marked as test data
- Properly configured TLS: `minVersion: 'TLSv1.2'`, strong cipher suites, certificate validation enabled

### Severity and Confidence Calibration

**Severity**:
- **Critical**: Hardcoded encryption keys protecting sensitive data, disabled certificate validation for external services, broken algorithms for authentication/signatures
- **High**: Weak ciphers (DES, 3DES, RC4) for data encryption, SHA-1 for digital signatures, predictable PRNG for session tokens
- **Medium**: Weak algorithms for non-critical purposes, weak cipher modes (ECB, unauthenticated CBC), TLS 1.0/1.1 for internal services
- **Low**: MD5/SHA-1 for non-cryptographic purposes (cache keys, checksums), weak randomness for non-security features

**Confidence**:
- **High**: Concrete data-flow trace, public vulnerability disclosure, exploitation example, remediation pattern
- **Medium**: Algorithm usage identified, security context plausible, public guidance supports finding
- **Low**: Potential vulnerability, missing context about security sensitivity, requires assumptions

## Source And Evidence Model

### Authoritative Sources

- **NIST Cryptographic Standards**: SP 800-131A algorithm transitions, SHA-1 retirement (2030), 3DES deprecation (2023)
- **OWASP Cryptographic Failures**: A02:2021/A04:2025 guidance, weak algorithms, insecure modes
- **CWE Cryptographic Issues**: CWE-327 (weak algorithms), CWE-326 (weak encryption), CWE-321 (hardcoded keys), CWE-330 (weak PRNG), CWE-295 (improper certificate validation)
- **Node.js Crypto Module Documentation**: Algorithm support, best practices, secure random generation
- **TLS Protocol Guidance**: RFC 8996 (deprecating TLS 1.0/1.1), cipher suite recommendations

### Repository Source Evidence

- `src/output/dedup.ts` line 77: `createHash('sha256')` for content hashing (safe, non-cryptographic use)
- `src/coordinator/plan.ts` line 1: `createHash('sha256')` for source fingerprinting (safe)
- `src/cli/commands/setup-app.ts` line 26: `randomBytes(16).toString('hex')` for CSRF token (safe)
- `src/cli/output/jsonl.ts`, `src/action/workflow/base.ts`: `randomUUID()` for ID generation (safe)
- No encryption usage identified (Grep for `createCipheriv|createDecipheriv` found no matches)
- No TLS configuration bypass identified (Grep for `rejectUnauthorized|checkServerIdentity` found no matches)
- Secrets loaded from environment variables (`process.env['ANTHROPIC_API_KEY']`, `process.env['GITHUB_TOKEN']`)

### Data That Must Not Be Stored

- Repository code excerpts (use only file paths, line numbers, algorithm names)
- Secrets, credentials, private keys (even if hardcoded in source)
- Proprietary implementation details (use only public API/framework names)

## Reference Architecture

### Cryptographic Operation Surface

Node.js/TypeScript codebase using:

- **Hash functions**: `crypto.createHash` (SHA-256 for content hashing, source fingerprinting)
- **Random generation**: `crypto.randomBytes`, `crypto.randomUUID` (CSRF tokens, IDs)
- **Encryption**: None identified (no `createCipheriv`/`createDecipheriv` usage)
- **TLS**: Default Node.js HTTPS client behavior (minimum TLS 1.2 in recent versions)
- **Certificate validation**: Default behavior (no `rejectUnauthorized: false` identified)

### Safe Patterns (Existing Codebase)

- `createHash('sha256')` for non-cryptographic hashing (content addressing, fingerprinting)
- `randomBytes(16).toString('hex')` for CSRF tokens (cryptographically secure)
- `randomUUID()` for unique ID generation (cryptographically secure)
- Environment variable secret loading (not hardcoded)

### Unsafe Patterns (Not Found, But Would Trigger Findings)

- `createHash('md5')` or `createHash('sha1')` for password hashing, signatures, integrity checks
- `createCipheriv('des-ecb', ...)` or other weak ciphers/modes
- `Math.random()` for session tokens, CSRF tokens, encryption keys
- Hardcoded strings as encryption keys, HMAC secrets, IVs
- `rejectUnauthorized: false` in production HTTPS requests
- `minVersion: 'TLSv1'` or allowing TLS 1.0/1.1

## Evaluation

### Lightweight Validation

Run Warden with this child skill on a test repository containing:

- MD5/SHA-1 for password hashing (should report high-severity finding)
- DES/3DES/RC4 encryption (should report critical/high-severity finding)
- `Math.random()` for session token generation (should report critical-severity finding)
- Hardcoded encryption key as string literal (should report critical-severity finding)
- `rejectUnauthorized: false` for external HTTPS request (should report critical-severity finding)
- MD5 for cache key (should not report, or low-severity with clear non-cryptographic context)
- SHA-256 for content hashing (should not report)
- `crypto.randomBytes` for token generation (should not report)

### Acceptance Gates

- All findings include changed-line anchors (location.startLine, location.path)
- All findings cite public security guidance (NIST, OWASP, CWE)
- All findings include exploitation scenario and remediation pattern
- Severity/confidence calibrated per specification (no critical findings for non-cryptographic MD5)
- False positives controlled (SHA-256, AES-GCM, randomBytes not flagged)
- Missing context stated explicitly when evidence is insufficient (empty findings array returned)

## Known Limitations

- **Algorithm purpose inference**: Skill cannot always determine whether MD5/SHA-1 is used for cryptographic (vulnerable) vs. non-cryptographic (acceptable) purposes without deep context tracing.
- **Data sensitivity classification**: Repository does not declare which data requires encryption vs. checksums. Skill must infer from variable names, comments, and usage patterns.
- **Post-quantum migration timeline**: NIST mandates RSA/ECDSA deprecation by 2035, but current findings should not flag RSA-2048+ or ECDSA with P-256+ as weak until closer to migration deadline.
- **OpenSSL version variance**: Node.js crypto behavior depends on linked OpenSSL version. Some weak algorithms may be unavailable in FIPS-compliant builds.
- **Framework abstractions**: High-level frameworks (e.g., Passport.js, bcrypt wrappers) may hide underlying algorithm choices. Skill must trace through abstraction layers.

## Maintenance Notes

### When to Update This Child Skill

- **NIST algorithm transitions**: Update deprecation timelines when NIST publishes new SP 800-131A revisions (SHA-1 2030, post-quantum 2035).
- **CWE taxonomy changes**: Update CWE references when new cryptographic weakness categories are published.
- **Node.js crypto API changes**: Update safe/unsafe pattern lists when Node.js deprecates algorithms or changes TLS defaults.
- **OWASP Top 10 updates**: Update severity calibration when OWASP publishes new cryptographic failure guidance.
- **Repository cryptographic patterns**: Update reference architecture when codebase introduces new cryptographic operations (encryption, key derivation, certificate pinning).

### Regeneration Triggers

- Parent security Superwarden skill regenerated
- Task evidence requirements changed
- Sibling task out-of-scope boundaries changed
- Repository technology stack changed (e.g., moved from Node.js to Go)
- Major cryptographic standard updates (e.g., NIST post-quantum migration)

### Coverage Expansion

If future synthesis reveals missing coverage, expand:

- **Key derivation**: PBKDF2, scrypt, Argon2 parameter validation (iteration count, salt length, memory cost)
- **Certificate pinning**: Public key pinning, certificate transparency, HPKP
- **Quantum-resistant algorithms**: NIST ML-KEM, ML-DSA, SLH-DSA adoption and migration
- **Hardware security modules**: HSM integration, secure enclave usage, key escrow
- **Cryptographic agility**: Algorithm negotiation, versioning, graceful degradation
