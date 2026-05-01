# cryptographic-vulnerabilities Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|------------|------------|--------------|-------------------|
| NIST SP 800-131A Rev. 2 | authoritative | high | Algorithm transition timelines: SHA-1 retirement (2030), 3DES deprecation (2023) | Public document, cite for deprecation schedules |
| NIST Retires SHA-1 Announcement | authoritative | high | SHA-1 phaseout by Dec 31, 2030; collision vulnerability | Public announcement, cite for SHA-1 weakness |
| OWASP A04:2025 Cryptographic Failures | authoritative | high | Weak algorithms (MD5, SHA-1, RC4, DES), insecure modes (ECB, CBC), TLS deprecation | Public guidance, cite for vulnerability patterns |
| CWE-327 (Weak Algorithms) | authoritative | high | Use of broken or risky cryptographic algorithms | Public taxonomy, cite for vulnerability classification |
| CWE-326 (Inadequate Encryption) | authoritative | high | Weak encryption strength, short keys, weak ciphers | Public taxonomy, cite for encryption weaknesses |
| CWE-321 (Hardcoded Keys) | authoritative | high | Use of hard-coded cryptographic keys | Public taxonomy, cite for key management issues |
| CWE-330 (Weak PRNG) | authoritative | high | Use of insufficiently random values for security | Public taxonomy, cite for randomness issues |
| CWE-295 (Improper Certificate Validation) | authoritative | high | Disabled certificate verification, hostname bypass | Public taxonomy, cite for TLS validation issues |
| RFC 8996 (TLS 1.0/1.1 Deprecation) | authoritative | high | Deprecating TLS 1.0 and 1.1, migration to TLS 1.2+ | Public RFC, cite for protocol deprecation |
| Node.js crypto module docs | authoritative | high | Algorithm support, best practices, secure random generation | Public documentation, cite for API usage patterns |
| Repository source (`src/output/dedup.ts`) | canonical | high | SHA-256 usage for content hashing (safe pattern) | Local evidence, do not send to web tools |
| Repository source (`src/cli/commands/setup-app.ts`) | canonical | high | randomBytes usage for CSRF tokens (safe pattern) | Local evidence, do not send to web tools |
| Repository source (`src/coordinator/plan.ts`) | canonical | high | SHA-256 usage for source fingerprinting (safe pattern) | Local evidence, do not send to web tools |
| Repository source (Grep results) | canonical | medium | No encryption, TLS bypass, or weak algorithms identified | Local evidence, absence of vulnerable patterns |

## Decisions

### Algorithm Weakness Classification

**Decision**: MD5 and SHA-1 are weak for cryptographic purposes (signatures, integrity checks, password hashing) but acceptable for non-cryptographic purposes (cache keys, deduplication, content addressing).

**Evidence**:
- NIST Retires SHA-1: "SHA-1 should be phased out by Dec. 31, 2030... companies have eight years to submit updated modules that no longer use SHA-1."
- OWASP A04:2025: "MD5 should not be used, due to known collision attacks."
- Repository usage (`src/output/dedup.ts` line 77): `createHash('sha256').update(content).digest('hex').slice(0, 8)` for content hash generation (deduplication, not authentication).

**Mapping**: High-severity finding for MD5/SHA-1 in password hashing, digital signatures, integrity checks. Low-severity or no finding for cache keys, ETags, deduplication.

### Symmetric Cipher Deprecation

**Decision**: DES, 3DES/TDEA, RC4, RC2 are deprecated. AES-128-GCM, AES-256-GCM, ChaCha20-Poly1305 are recommended.

**Evidence**:
- NIST SP 800-131A: "NIST SP 800-131A set a deadline to end support for Triple DES by the end of 2023."
- OWASP A04:2025: "RC4 should not be used, due to crypto-analytical attacks. DES has a 56-bit key that can be brute-forced in hours on commodity hardware."
- CWE-326: "Weak or broken ciphers like DES can place sensitive data at risk."

**Mapping**: Critical-severity finding for DES/RC4 encrypting sensitive data. High-severity for 3DES. Recommend AES-GCM or ChaCha20-Poly1305 in remediation.

### Random Number Generation Security

**Decision**: `Math.random()` is insecure for cryptographic purposes. `crypto.randomBytes`, `crypto.randomUUID`, `crypto.getRandomValues` are cryptographically secure.

**Evidence**:
- CWE-330: "Use of a Broken or Risky Cryptographic Algorithm... involves the use of weak pseudo-random number generators."
- Node.js crypto docs: "crypto.randomBytes() is the cryptographically secure random number generator."
- Repository usage (`src/cli/commands/setup-app.ts` line 26): `randomBytes(16).toString('hex')` for CSRF token (safe pattern).

**Mapping**: Critical-severity finding for `Math.random()` generating session tokens, CSRF tokens, encryption keys. No finding for `crypto.randomBytes` or `randomUUID`.

### Hardcoded Key Detection

**Decision**: Encryption keys, HMAC secrets, signing keys, IVs, and salts must not be hardcoded as string literals.

**Evidence**:
- CWE-321: "Hardcoded keys are vulnerable to exposure... If API keys are hardcoded within code or configuration files, they may be leaked if the project is uploaded to a public source code repository."
- Repository pattern: Secrets loaded from environment variables (`process.env['ANTHROPIC_API_KEY']`, `process.env['GITHUB_TOKEN']`).

**Mapping**: Critical-severity finding for hardcoded encryption keys. Recommend environment variable loading. Boundary: hardcoded API keys belong to secrets-exposure task; hardcoded encryption keys belong to this task.

### TLS Protocol and Certificate Validation

**Decision**: TLS 1.0, TLS 1.1, SSLv3 are deprecated. TLS 1.2+ required. Certificate validation must not be disabled (`rejectUnauthorized: false`).

**Evidence**:
- RFC 8996: "Deprecating TLS 1.0 and TLS 1.1."
- OWASP A04:2025: "TLS 1.0/1.1/SSLv3 should be disabled."
- CWE-295: "Improper certificate validation... accepting self-signed certificates or disabling verification."
- Repository: No TLS bypass identified (Grep for `rejectUnauthorized|checkServerIdentity` found no matches).

**Mapping**: Critical-severity finding for `rejectUnauthorized: false` in production. High-severity for TLS 1.0/1.1 allowed. Recommend `minVersion: 'TLSv1.2'`.

### Non-Cryptographic Hash Function Usage

**Decision**: MD5/SHA-1 usage for non-cryptographic purposes (cache keys, content addressing, deduplication) is acceptable and should not trigger findings.

**Evidence**:
- Repository usage (`src/output/dedup.ts` line 75-78): `generateContentHash(title, description)` uses SHA-256 for deduplication (safe, non-cryptographic).
- Repository usage (`src/coordinator/plan.ts`): `createHash('sha256')` for source file fingerprinting (safe, non-cryptographic).

**Mapping**: Low-severity or no finding for MD5/SHA-1 in cache key generation, deduplication, content addressing. High-severity for password hashing, digital signatures, integrity checks.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|-----------------|----------|
| Weak hash functions (MD5, SHA-1) | complete | NIST SHA-1 retirement, OWASP guidance, CWE-327, repository SHA-256 usage |
| Weak symmetric ciphers (DES, 3DES, RC4) | complete | NIST 3DES deprecation, OWASP guidance, CWE-326, repository Grep (no encryption) |
| Insecure cipher modes (ECB, CBC) | complete | OWASP guidance (drop CBC), repository Grep (no cipher usage) |
| Weak asymmetric algorithms (RSA < 2048) | partial | CWE-327 mentions weak RSA, but no repository usage to validate detection |
| Weak PRNG (Math.random) | complete | CWE-330, Node.js crypto docs, repository randomBytes/randomUUID usage |
| Hardcoded keys | complete | CWE-321, repository environment variable pattern, Grep (no hardcoded keys) |
| Improper certificate validation | complete | CWE-295, repository Grep (no rejectUnauthorized bypass) |
| Deprecated TLS protocols (1.0, 1.1) | complete | RFC 8996, OWASP guidance, Node.js default TLS 1.2+ |
| Weak cipher suites | partial | OWASP guidance (disable CBC, require forward secrecy), but no repository TLS config to validate |
| Post-quantum cryptography | deferred | NIST ML-KEM/ML-DSA standardized 2024, migration deadline 2035, not urgent for current synthesis |
| Key derivation (PBKDF2, scrypt, Argon2) | deferred | No password hashing identified in repository, would expand if added |
| Certificate pinning | deferred | No certificate pinning identified in repository, would expand if added |

### Security-Review Synthesis Dimensions

| Dimension | Coverage status | Evidence |
|-----------|-----------------|----------|
| Vulnerability prerequisites | complete | Algorithm weakness, data sensitivity, attacker access to encrypted data/protocol handshakes |
| Exploitable dataflow examples | complete | Data-flow traces from hash/cipher API to sensitive data (passwords, encryption, signatures) |
| False-positive controls | complete | SHA-256/AES-GCM safe, non-cryptographic hashing acceptable, test fixtures excluded |
| Severity/confidence calibration | complete | Critical (hardcoded keys, disabled cert validation), High (weak ciphers, SHA-1 signatures), Medium (weak modes), Low (non-crypto MD5) |
| Remediation patterns | complete | Replace MD5→SHA-256, DES→AES-GCM, Math.random→randomBytes, load keys from env vars, enable cert validation, TLS 1.2+ |
| Framework/runtime caveats | complete | Node.js crypto backward compat, TLS defaults, OpenSSL version variance, post-quantum migration timeline |

### API Surface Coverage

| API | Coverage status | Evidence |
|-----|-----------------|----------|
| crypto.createHash | complete | Repository usage (SHA-256 safe), detection of MD5/SHA-1 in skill |
| crypto.createCipheriv / createDecipheriv | complete | No repository usage, but detection rules specified (DES, 3DES, RC4, ECB mode) |
| crypto.randomBytes / randomUUID | complete | Repository usage (safe pattern), detection of Math.random as unsafe |
| crypto.createHmac | partial | No repository usage, detection rules specified but not validated |
| https.request / fetch TLS options | complete | No repository bypass, detection rules specified (rejectUnauthorized, minVersion) |
| vm module (sandbox escapes) | out-of-scope | Deferred to injection-vulnerabilities (code evaluation) |

### Common Use Cases

| Use case | Detection approach | False-positive control |
|----------|-------------------|------------------------|
| Password hashing | Flag MD5/SHA-1, recommend bcrypt/scrypt/Argon2 | Exclude non-cryptographic hashing |
| Data encryption | Flag DES/3DES/RC4/ECB, recommend AES-GCM/ChaCha20-Poly1305 | Exclude test fixtures |
| Session token generation | Flag Math.random, recommend crypto.randomBytes | Exclude randomUUID (safe) |
| CSRF token generation | Flag Math.random, recommend crypto.randomBytes | Repository uses randomBytes (safe) |
| Content hashing (deduplication) | Allow MD5/SHA-1, low-severity warning, or no finding | Repository uses SHA-256 (safe) |
| TLS client configuration | Flag rejectUnauthorized: false, TLS 1.0/1.1 | Exclude dev/test guards |
| Digital signatures | Flag MD5/SHA-1, recommend SHA-256+ | Exclude non-signature hashing |

### Known Issues/Workarounds

| Issue | Workaround | Status |
|-------|------------|--------|
| Algorithm purpose inference | Trace data flow to determine if hash is for password/signature (crypto) vs. cache key (non-crypto) | Implemented in skill |
| Test fixture false positives | Exclude hardcoded keys in test files, check for placeholder syntax | Specified in false-positive controls |
| Post-quantum migration timeline | Do not flag RSA-2048+ or ECDSA P-256+ until closer to 2035 deadline | Specified in framework caveats |
| OpenSSL version variance | Note that some weak algorithms may be unavailable in FIPS builds | Specified in framework caveats |
| Framework crypto abstractions | Trace through high-level wrappers (Passport.js, bcrypt) to underlying algorithm | Requires deep context tracing |

### Version/Migration Variance

- **Node.js 18+**: Default TLS 1.2+, stronger crypto defaults, no action required
- **Node.js < 18**: May allow TLS 1.0/1.1, flag explicitly if detected
- **NIST SP 800-131A Rev. 2 (2024)**: 3DES deprecated 2023, SHA-1 phaseout 2030, RSA/ECDSA migration 2035
- **Post-quantum migration**: NIST ML-KEM, ML-DSA, SLH-DSA standardized 2024, not urgent for current findings

## Open Gaps

### Missing Repository Context

- **Data sensitivity classification**: Which data requires encryption (PII, credentials) vs. checksums (metadata, cache keys). Skill must infer from variable names and usage patterns.
- **Deployment environment**: Cloud KMS usage (AWS KMS, GCP KMS), hardware security modules, secure enclaves. Would affect key management remediation recommendations.
- **Regulatory requirements**: FIPS 140-2/3, PCI DSS, HIPAA, GDPR mandates. Would affect severity calibration (critical for regulated data).
- **Threat model**: Whether attackers can intercept network traffic (affects TLS severity), extract keys from source code (affects hardcoded key severity), or access encrypted data at rest.

### Missing External Documentation

- **Key derivation function parameters**: PBKDF2 iteration count, scrypt memory cost, Argon2 parameters. Not currently covered, would expand if password hashing is added.
- **Certificate pinning best practices**: Public key pinning, certificate transparency, HPKP deprecation. Not currently covered, would expand if cert pinning is added.
- **Post-quantum algorithm adoption timeline**: Hybrid crypto (PQ/T), ML-KEM/ML-DSA parameter selection, migration strategies. Deferred until closer to 2035 deadline.

### Next Retrieval Steps

1. **Validate detection accuracy**: Run skill on test repository with known vulnerable patterns (MD5 password hash, DES encryption, Math.random session tokens) to confirm findings match expectations.
2. **Benchmark false-positive rate**: Run on large codebase with legitimate MD5/SHA-1 usage for cache keys to confirm false-positive controls work.
3. **Expand key derivation coverage**: If password hashing is added to repository, research PBKDF2/scrypt/Argon2 parameter guidance (2026 OWASP, NIST recommendations).
4. **Expand certificate pinning coverage**: If cert pinning is added to repository, research public key pinning, CT log verification, pinning failure handling.
5. **Monitor NIST post-quantum updates**: Track ML-KEM/ML-DSA adoption guidance, hybrid crypto recommendations, RSA/ECDSA sunset timeline (2035).

### Why Additional Retrieval Is Currently Low-Yield

- **No encryption usage identified**: Repository Grep found no `createCipheriv` or `createDecipheriv` usage. Expanding cipher mode guidance (GCM, CTR, SIV) would not improve current findings.
- **No TLS configuration identified**: Repository Grep found no `rejectUnauthorized` or `minVersion` usage. Expanding cipher suite guidance would not improve current findings.
- **No password hashing identified**: Repository has no user authentication or password storage. Expanding key derivation guidance (PBKDF2, scrypt, Argon2) would not improve current findings.
- **Post-quantum migration timeline**: NIST deadline is 2035. Flagging RSA-2048+ or ECDSA P-256+ as weak would be premature and generate false positives.

## Changelog

### 2026-04-30: Initial Superwarden Synthesis Pass

- Synthesized cryptographic-vulnerabilities child skill from parent security Superwarden skill
- Performed deep repository inspection: identified SHA-256 for content hashing, randomBytes for CSRF tokens, randomUUID for IDs (all safe patterns)
- Confirmed no encryption, TLS bypass, or weak algorithm usage in current codebase
- Retrieved current NIST, OWASP, CWE cryptographic guidance (SHA-1 2030 sunset, 3DES 2023 deprecation, TLS 1.0/1.1 deprecation)
- Established severity/confidence calibration: critical (hardcoded keys, disabled cert validation), high (weak ciphers, SHA-1 signatures), medium (weak modes), low (non-crypto MD5)
- Specified false-positive controls: SHA-256/AES-GCM safe, non-cryptographic hashing acceptable, test fixtures excluded
- Documented out-of-scope boundaries: injection (code/command), access control (auth bypass), secrets exposure (API keys), dependencies (vulnerable libraries), resource handling (DoS)
- Recorded missing context: data sensitivity classification, deployment environment (KMS, HSM), regulatory requirements (FIPS, PCI DSS), threat model
- Identified open gaps: key derivation (no password hashing), certificate pinning (no pinning usage), post-quantum migration (deferred to 2035)
- Deferred low-yield retrieval: cipher mode details (no encryption usage), cipher suites (no TLS config), key derivation parameters (no password hashing)
