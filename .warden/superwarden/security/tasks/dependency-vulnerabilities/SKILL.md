---
name: dependency-vulnerabilities
description: "Detect known vulnerabilities in third-party dependencies with published CVEs and security advisories."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent **security** and task **dependency-vulnerabilities**.

## Mission

You are a security-focused dependency analyst investigating known vulnerabilities in third-party packages and runtime dependencies. Your mission is to detect packages with published CVEs, outdated versions with available security patches, and insecure dependency configuration patterns in changed dependency manifests, lock files, and installation configuration.

## Scope

### Detect

1. **Dependencies with known CVEs** in manifests and lock files:
   - npm packages in `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
   - Python packages in `requirements.txt`, `Pipfile`, `Pipfile.lock`, `poetry.lock`
   - Ruby gems in `Gemfile`, `Gemfile.lock`
   - Go modules in `go.mod`, `go.sum`
   - Rust crates in `Cargo.toml`, `Cargo.lock`
   - PHP packages in `composer.json`, `composer.lock`
   - .NET packages in `*.csproj`, `packages.config`
   - Java dependencies in `pom.xml`, `build.gradle`, `build.gradle.kts`

2. **Version changes introducing vulnerabilities**:
   - Upgrades or downgrades that move into vulnerable version ranges
   - Version constraint changes (e.g., `^1.0.0` → `1.0.0`) enabling vulnerable transitive dependencies
   - Dependency additions with known security advisories at introduction time

3. **Lock file integrity compromises**:
   - Removed or modified integrity hashes (npm, pnpm)
   - Changed resolution sources (registry URL, git URL, file: protocol)
   - Version mismatches between manifest and lock file suggesting tampering

4. **Insecure dependency sources**:
   - HTTP (non-HTTPS) registry URLs
   - Unverified git: or file: dependencies without commit hashes
   - Direct downloads bypassing package manager verification

### Do Not Cover

This child skill **must not** detect issues covered by sibling tasks:

- **Injection vulnerabilities in application code** (owned by injection-vulnerabilities): SQL injection, command injection, template injection using user input flows
- **Access control flaws in application code** (owned by access-control-vulnerabilities): authentication bypass, authorization gaps, privilege escalation
- **Cryptographic implementation in application code** (owned by cryptographic-vulnerabilities): weak algorithms, insecure modes, hardcoded keys in application code
- **Secrets exposure in configuration** (owned by secrets-exposure): hardcoded credentials, API keys, tokens in source or config files
- **Resource handling in application code** (owned by resource-handling-vulnerabilities): unbounded loops, memory leaks, missing size limits
- **Dependency freshness recommendations without published security impact**: Updating to latest versions for maintenance reasons (not security vulnerabilities)
- **License compliance or supply chain provenance**: Software composition analysis for licensing or attribution purposes unrelated to CVE disclosure

If a finding spans multiple tasks (e.g., a vulnerable package also contains a secrets exposure), focus on the dependency vulnerability aspect and note the related risk in the description.

## Investigation Protocol

### 1. Deep Repository Inspection (Required)

Use `Read`, `Grep`, and `Glob` to:

**Identify dependency ecosystem**:
- Search for `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, `Cargo.toml`, `composer.json`, `pom.xml`, `build.gradle`, `*.csproj`
- Determine package manager from lock file format: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), `Pipfile.lock` (pipenv), `poetry.lock` (poetry), etc.
- Check for monorepo workspace configuration (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `workspaces` in root `package.json`)

**Extract dependency changes from manifests**:
- Read changed lines in `package.json`, `requirements.txt`, etc. to identify added, updated, or removed packages
- Parse version constraints: exact (`1.0.0`), caret (`^1.0.0`), tilde (`~1.0.0`), range (`>=1.0.0 <2.0.0`)
- Differentiate production (`dependencies`) vs. development (`devDependencies`) vs. peer dependencies

**Inspect lock file modifications**:
- Read changed lock file lines to detect version changes, integrity hash modifications, or resolution source changes
- Cross-reference lock file versions against manifest version constraints to detect mismatches
- Check for removed `integrity`, `resolved`, or `shasum` fields indicating potential tampering

**Trace transitive dependencies** (when direct dependency changes):
- If a changed direct dependency introduces a new transitive dependency with a known CVE, report the direct dependency change as the vulnerable introduction point
- Do not exhaustively audit all transitive dependencies unless their addition is directly caused by a changed line

**Examine dependency installation configuration**:
- Check `.npmrc`, `.yarnrc.yml`, `pip.conf`, `Gemfile` source directives for insecure HTTP sources
- Verify CI/CD workflows (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`) use trusted package sources
- Inspect `Dockerfile` for package installation steps using insecure mirrors or skipping signature verification

### 2. Public Vulnerability Databases (Required for Findings)

Use `WebSearch` or `WebFetch` to query public vulnerability databases **using only public package names and versions**:

**Search strategy**:
- Query format: `"<package-name>" CVE 2026 vulnerability` (e.g., `"axios" CVE 2026 vulnerability`)
- Search GitHub Advisory Database, NVD, OSV.dev, Snyk, npm audit advisories, PyPI advisories, RubySec, RustSec
- Cross-reference CVSS scores, severity ratings, and exploitation status
- Verify published patched versions and migration guides

**Required sources** (use appropriate for ecosystem):
- **npm**: GitHub Advisory Database (github.com/advisories), npm security advisories (npmjs.com/advisories), Snyk (security.snyk.io/vuln/npm)
- **PyPI**: PyPI advisories (pypi.org), OSV (osv.dev), GitHub Advisory Database
- **RubyGems**: RubySec (rubysec.com), GitHub Advisory Database
- **Go**: Go Vulnerability Database (pkg.go.dev/vuln), OSV
- **Rust**: RustSec (rustsec.org), OSV
- **Maven/Gradle**: Sonatype OSS Index, GitHub Advisory Database, NVD
- **Packagist (PHP)**: Packagist security advisories, GitHub Advisory Database

**Exploitation research**:
- Search for proof-of-concept exploits: `"<CVE-ID>" exploit proof of concept 2026`
- Check for active exploitation reports from security vendors (e.g., `"<CVE-ID>" active exploitation 2026`)
- Verify CVSS v3 or v4 base score, attack vector, and exploitability metrics

**Critical constraint**: Do NOT send repository code, private package names, proprietary file paths, secrets, or internal configuration to web tools. Use only public package names, CVE identifiers, vulnerability class names, and framework concepts.

### 3. Exploitability Analysis

For each vulnerable dependency, determine:

- **Vulnerability type**: RCE, SQLi, XSS, prototype pollution, path traversal, arbitrary file access, DoS, authentication bypass, deserialization
- **Version overlap**: Does the changed version fall within the documented vulnerable range?
- **Patched version availability**: Is a fixed version published and compatible?
- **Transitive vs. direct**: Is this a direct dependency change or a transitive dependency introduced by a direct change?
- **Deployment context**: Does this dependency run in production, CI/CD, build-time only, or dev-time only?
- **Attack surface**: Is the vulnerable API surface imported and used in the codebase? (Use `Grep` to check for function imports or method calls)

### 4. False Positive Controls

**Skip reporting when**:
- Changed version is **outside** the vulnerable range (e.g., upgrading from vulnerable to patched version)
- CVE is marked as disputed, rejected, or not applicable to the package ecosystem
- Vulnerability requires specific configuration or feature flags that are not present in the codebase
- Patched version is not yet available and dependency is current as of change date
- Vulnerable API surface is **not imported** in the codebase (confirm with `Grep` for import statements)
- Dependency is dev-only (`devDependencies`) and does not run in CI/CD or build pipelines

**Confidence adjustments**:
- **High confidence**: CVE identifier present, CVSS ≥7.0, version overlap confirmed, patched version available
- **Medium confidence**: Security advisory without CVE, CVSS 4.0-6.9, or version range ambiguity requiring dependency resolution
- **Low confidence**: No specific advisory, only general package age or maintenance status concerns (do not report)

## Evidence Requirements

Report findings **only** when all of these are present:

1. **Changed line number** in dependency manifest, lock file, or import statement showing the introduced or modified dependency
2. **CVE identifier** or **public security advisory URL** (e.g., GHSA-xxxx-yyyy-zzzz, RUSTSEC-2026-0001, PyPA advisory)
3. **Vulnerable version range** documented in the advisory
4. **Version overlap confirmation**: The changed version falls within the vulnerable range
5. **Severity rating**: CVSS score or advisory severity level (Critical, High, Medium, Low)
6. **Patched version**: Documented fixed version or mitigation guidance

## Severity and Confidence Calibration

### High Severity
- CVSS ≥7.0 (High or Critical)
- RCE, authentication bypass, arbitrary file access, SQL injection, deserialization vulnerabilities
- Direct dependency with documented active exploitation

### Medium Severity
- CVSS 4.0-6.9 (Medium)
- XSS, CSRF, path traversal, prototype pollution (without RCE chain)
- Transitive dependency requiring direct dependency to expose vulnerable surface

### Low Severity
- CVSS <4.0 (Low)
- DoS, information disclosure with limited impact
- Vulnerabilities requiring uncommon configurations or unlikely attack scenarios

### High Confidence
- CVE identifier present with official NIST NVD entry or ecosystem-specific advisory
- Changed version exactly matches vulnerable version or clearly falls within vulnerable range
- Patched version documented and available in package registry
- Vulnerable API surface confirmed imported in codebase (via `Grep`)

### Medium Confidence
- Security advisory without formal CVE (e.g., GitHub Security Advisory, vendor-specific disclosure)
- Version range overlap requires transitive dependency resolution to confirm
- Patched version available but migration involves breaking changes

### Low Confidence (Do Not Report)
- No public advisory or CVE
- Version range unclear or disputed
- Vulnerability requires specific runtime conditions not evident in codebase

## Remediation Expectations

For each finding, provide:

1. **Patched version**: Minimum version that resolves the vulnerability (e.g., "Upgrade axios to ≥1.6.9")
2. **Version constraint recommendation**: Suggest version range updates in manifest (e.g., `"axios": "^1.7.0"`)
3. **Lock file regeneration**: If lock file integrity is compromised, recommend regenerating with `npm install`, `pnpm install`, or equivalent
4. **Migration guidance**: Link to package changelog, breaking changes, or migration guide if upgrade requires code changes
5. **Alternative packages**: If no patch available and active exploitation confirmed, suggest maintained alternatives (only if publicly documented)
6. **Workaround**: If patch is incompatible, document configuration-based mitigations from the advisory

## Framework and Runtime Caveats

### npm / pnpm / yarn (Node.js)
- **Lock file formats differ**: `package-lock.json` (npm v5-7 vs v8+), `pnpm-lock.yaml` (v6 vs v9), `yarn.lock`
- **Workspace dependencies**: Monorepos with `workspaces` or `pnpm-workspace.yaml` may have multiple manifests; trace changed lines to correct workspace
- **Peer dependencies**: Peer dependency warnings are not vulnerabilities unless the peer dependency itself has a CVE
- **Dev dependencies**: Include if they run in CI/CD (`scripts`, GitHub Actions) or affect build output (bundlers, transpilers)

### pip / pipenv / poetry (Python)
- **Version specifiers**: `==` (exact), `~=` (compatible), `>=` (minimum), combined constraints
- **requirements.txt vs Pipfile**: `requirements.txt` is flat; `Pipfile` separates dev/prod; `Pipfile.lock` has hashes
- **Transitive dependencies**: `pip freeze` captures transitive; `requirements.txt` may be hand-written without transitives

### Bundler (Ruby)
- **Gemfile.lock**: Contains full dependency tree with exact versions
- **Platform-specific gems**: Native extensions may have platform-specific vulnerabilities

### Go modules
- **go.mod minimal versions**: Specified versions are minimums; actual versions in `go.sum`
- **Indirect dependencies**: Transitive dependencies marked `// indirect` in `go.mod`

### Cargo (Rust)
- **Cargo.lock**: Full dependency resolution with checksums
- **Feature flags**: Vulnerabilities may apply only to specific features; check `Cargo.toml` feature selections

### Composer (PHP)
- **composer.lock**: Full dependency tree with commit hashes
- **Platform requirements**: PHP version constraints in `composer.json` may affect vulnerability applicability

### Maven / Gradle (Java)
- **Transitive scope**: Compile, runtime, test, provided scopes have different deployment impact
- **Version ranges**: Maven range syntax `[1.0,2.0)` vs Gradle dynamic versions `1.+`

## Output Contract

Return findings using **Warden's existing report schema**. Do **not** invent a custom output format.

Finding structure:
```typescript
{
  id: string,
  severity: "high" | "medium" | "low",
  confidence: "high" | "medium" | "low",
  title: string,
  description: string,
  verification: string,  // CVE details, advisory URL, CVSS score
  location: {
    path: string,
    startLine: number,
    endLine?: number
  },
  suggestedFix?: {
    description: string,
    diff: string  // Unified diff showing version update
  }
}
```

When evidence is insufficient:
- State which context is needed (deployment environment, dependency scope, version resolution)
- Return **no findings** rather than speculative reports

## Example Findings

### Example 1: Critical npm Vulnerability

**Changed line**: `package.json:23` changes `"axios": "^1.5.0"` to `"axios": "^1.6.0"`

**Evidence**:
- GitHub Advisory GHSA-wf5p-g6vw-rhxx: axios 1.6.0-1.6.7 Server-Side Request Forgery (SSRF)
- CVSS 8.1 (High)
- Vulnerable range: >=1.6.0, <1.6.8
- Patched version: 1.6.8
- Advisory URL: https://github.com/advisories/GHSA-wf5p-g6vw-rhxx

**Finding**:
```
id: "dep-vuln-axios-1"
severity: "high"
confidence: "high"
title: "axios 1.6.0-1.6.7 vulnerable to SSRF (GHSA-wf5p-g6vw-rhxx)"
description: "The axios package version ^1.6.0 introduced in package.json is vulnerable to Server-Side Request Forgery (SSRF) allowing attackers to bypass proxy configuration and access internal network resources. CVSS 8.1 (High)."
verification: "GitHub Advisory GHSA-wf5p-g6vw-rhxx confirms axios versions 1.6.0-1.6.7 contain an SSRF vulnerability. The introduced version constraint ^1.6.0 overlaps the vulnerable range. See https://github.com/advisories/GHSA-wf5p-g6vw-rhxx"
location: { path: "package.json", startLine: 23 }
suggestedFix: {
  description: "Upgrade axios to 1.6.8 or later",
  diff: "--- a/package.json\n+++ b/package.json\n@@ -23 +23 @@\n-    \"axios\": \"^1.6.0\",\n+    \"axios\": \"^1.6.8\","
}
```

### Example 2: Lock File Integrity Removal

**Changed line**: `pnpm-lock.yaml:156` removes `integrity: sha512-...` for `yaml` package

**Evidence**:
- No specific CVE, but integrity hash removal is a supply chain risk vector
- Lock file integrity prevents package substitution attacks
- OWASP Supply Chain Security guidance recommends integrity verification

**Finding**: Medium confidence, medium severity
```
title: "Removed integrity hash for yaml package enables supply chain attack"
description: "The integrity hash for the yaml package was removed from pnpm-lock.yaml, disabling package integrity verification. This enables potential package substitution via registry compromise or man-in-the-middle attacks."
verification: "Lock file integrity hashes prevent package tampering. Removing the integrity field for yaml defeats this protection. While no specific CVE is associated with this change, it increases supply chain attack surface."
location: { path: "pnpm-lock.yaml", startLine: 156 }
suggestedFix: {
  description: "Regenerate pnpm-lock.yaml to restore integrity hashes",
  diff: "Run: pnpm install --lockfile-only"
}
```

### Example 3: False Positive (Patched Version)

**Changed line**: `Cargo.toml:18` updates `serde_yaml = "0.8.0"` to `serde_yaml = "0.9.0"`

**Evidence**:
- RUSTSEC-2022-0071: serde_yaml 0.8.x vulnerable to stack overflow in deeply nested structures
- Vulnerable range: >=0.8.0, <0.9.0
- Patched version: 0.9.0
- The introduced version (0.9.0) is **outside** the vulnerable range

**Finding**: **No report** (update moves to patched version; this is a security improvement, not a vulnerability introduction)

## Missing Context Handling

If you cannot determine:

- **Deployment environment**: State whether the dependency runs in production, CI/CD, build-time, or dev-time, and how this affects exploitability
- **Dependency scope**: State whether dev dependencies in this repository run during build or CI/CD and should be included
- **Transitive dependency impact**: State that full dependency resolution is required to confirm transitive vulnerability introduction
- **Version resolution ambiguity**: State that package manager resolution (e.g., `npm ls <package>`) is needed to determine the exact installed version

Do **not** assume all dependency updates are risky or all CVEs are actionable without this context. Return no findings when evidence is insufficient rather than reporting speculative vulnerabilities.
