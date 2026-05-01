# dependency-vulnerabilities Specification

## Intent

This child skill detects changed lines in dependency manifests (`package.json`, `requirements.txt`, `Gemfile`, etc.), lock files, and dependency configuration that introduce packages with published CVEs, downgrade to vulnerable versions, or modify lock files in ways that compromise supply chain integrity. It cross-references public vulnerability databases (GitHub Advisory Database, NVD, OSV.dev, ecosystem-specific advisories) to identify concrete security risks with documented CVE identifiers, severity ratings, and patched versions.

This is a Superwarden child skill for parent **security** task **dependency-vulnerabilities**, synthesized through investigation of the repository's Node.js/pnpm ecosystem (primary), public npm vulnerability databases, and current (2026) supply chain security guidance.

## Scope

### In Scope

1. **Dependency manifest changes** across all supported ecosystems:
   - Node.js: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
   - Python: `requirements.txt`, `Pipfile`, `Pipfile.lock`, `poetry.lock`, `pyproject.toml`
   - Ruby: `Gemfile`, `Gemfile.lock`
   - Go: `go.mod`, `go.sum`
   - Rust: `Cargo.toml`, `Cargo.lock`
   - PHP: `composer.json`, `composer.lock`
   - Java: `pom.xml`, `build.gradle`, `build.gradle.kts`
   - .NET: `*.csproj`, `packages.config`, `packages.lock.json`

2. **Vulnerability detection criteria**:
   - Published CVE identifier (e.g., CVE-2026-12345, GHSA-xxxx-yyyy-zzzz, RUSTSEC-2026-0001)
   - Public security advisory from ecosystem-specific sources
   - CVSS score or severity rating (Critical, High, Medium, Low)
   - Documented vulnerable version range
   - Available patched version or documented mitigation

3. **Version change analysis**:
   - New dependency additions with existing CVEs
   - Version upgrades or downgrades moving into vulnerable ranges
   - Version constraint changes enabling vulnerable transitive dependencies
   - Transitive dependency introduction via direct dependency changes

4. **Lock file integrity**:
   - Removed or modified integrity hashes (npm `integrity`, pnpm `integrity`, Python `--hash`)
   - Changed package resolution sources (HTTP→HTTPS, registry URL changes, git→file protocol)
   - Version mismatches between manifest constraints and lock file resolved versions

5. **Insecure dependency sources**:
   - HTTP (non-HTTPS) registry URLs in `.npmrc`, `pip.conf`, Gemfile `source`, etc.
   - Unverified git: dependencies without commit hashes or signed tags
   - file: protocol dependencies without integrity verification

### Out of Scope

1. **Application-level vulnerabilities** (delegated to sibling tasks):
   - Injection vulnerabilities in application code that use dependencies → `injection-vulnerabilities`
   - Access control flaws in application authentication/authorization logic → `access-control-vulnerabilities`
   - Cryptographic implementation weaknesses in application code → `cryptographic-vulnerabilities`
   - Secrets exposure in configuration or environment variables → `secrets-exposure`
   - Resource exhaustion or DoS conditions in application logic → `resource-handling-vulnerabilities`

2. **Non-security dependency concerns**:
   - Dependency freshness or "time since last update" without published security impact
   - License compliance, SBOM generation, or supply chain provenance tracking
   - Breaking changes or API compatibility unrelated to security vulnerabilities
   - Performance degradation from dependency updates
   - Deprecated packages without known security issues

3. **Low-priority security issues** (configurable threshold):
   - CVSS <4.0 (Low severity) without active exploitation evidence
   - Disputed or rejected CVEs
   - Vulnerabilities requiring implausible attack scenarios
   - Dev-only dependencies not running in CI/CD or build pipelines

## Users And Trigger Context

**Primary users**: Security reviewers, repository maintainers, CI/CD automation, and Dependabot/Renovate automated PR validation.

**Common trigger scenarios**:
- Pull request modifies `package.json`, `requirements.txt`, or other dependency manifest
- Automated dependency update bot proposes version changes
- Lock file regenerated after manual dependency installation
- Monorepo workspace adds or removes packages
- CI/CD workflow updates runtime versions (Node.js, Python, Ruby in Docker or workflow config)

**Should not trigger for**:
- Application code changes not touching dependency manifests or lock files
- Documentation, test fixture data, or configuration unrelated to package installation
- `.gitignore` or CI config changes not affecting dependency resolution

## Runtime Contract

### Required Inputs

- Changed files list including at least one dependency manifest, lock file, or dependency configuration file
- Access to `Read`, `Grep`, `Glob` for repository-local investigation
- Access to `WebSearch` or `WebFetch` for public vulnerability database queries
- Current date/time for CVE freshness assessment (2026 as of this synthesis)

### Execution Steps

1. **Detect ecosystem**: Identify package manager from manifest and lock file types
2. **Extract changes**: Parse changed lines in manifests and lock files to identify added/updated/removed packages
3. **Query vulnerability databases**: Search public advisories using package name + version + "CVE" + "2026"
4. **Validate version overlap**: Confirm changed version falls within documented vulnerable range
5. **Assess exploitability**: Check CVSS score, attack vector, exploitation status
6. **Verify patch availability**: Confirm patched version exists and is compatible
7. **Apply false-positive controls**: Skip reporting for patched versions, non-overlapping ranges, dev-only deps without CI/CD impact
8. **Generate findings**: Report only when all evidence requirements are met

### Output Format

Use Warden's existing `FindingSchema` (see `src/types/index.ts`):

```typescript
{
  id: string,                    // Unique finding identifier
  severity: "high" | "medium" | "low",
  confidence: "high" | "medium" | "low",
  title: string,                 // "<package> <version> vulnerable to <issue> (<CVE-ID>)"
  description: string,           // Detailed vulnerability description
  verification: string,          // CVE details, CVSS score, advisory URL
  location: {
    path: string,                // Manifest or lock file path
    startLine: number,           // Changed line number
    endLine?: number
  },
  suggestedFix?: {
    description: string,         // "Upgrade <package> to <version>"
    diff: string                 // Unified diff showing version update
  }
}
```

### Missing Context Handling

When context is insufficient:

- **Deployment scope unclear**: State whether dependency runs in production, CI/CD, build-time, or dev-time only
- **Transitive dependency ambiguity**: State that package manager resolution (`npm ls`, `pip show`) is needed
- **Version constraint overlap uncertain**: State that dependency resolution is required to determine exact installed version
- **Exploitability context missing**: State whether vulnerable API surface is imported/used in codebase

Return **no findings** rather than speculative reports when evidence does not meet all requirements.

## Source And Evidence Model

### Authoritative Repository Sources

| Source | Ecosystem | Purpose |
|--------|-----------|----------|
| `package.json` | Node.js | Dependency manifest with version constraints |
| `package-lock.json` | npm (Node.js) | Full dependency tree with exact versions and integrity hashes |
| `pnpm-lock.yaml` | pnpm (Node.js) | Full dependency tree with integrity hashes (detected in this repository) |
| `yarn.lock` | Yarn (Node.js) | Full dependency tree with checksums |
| `requirements.txt` | Python | Dependency list with version specifiers |
| `Pipfile`, `Pipfile.lock` | Pipenv (Python) | Manifest and lock file with hashes |
| `poetry.lock` | Poetry (Python) | Lock file with hashes |
| `Gemfile`, `Gemfile.lock` | Bundler (Ruby) | Manifest and lock file |
| `go.mod`, `go.sum` | Go modules | Module requirements and checksums |
| `Cargo.toml`, `Cargo.lock` | Cargo (Rust) | Manifest and lock file |
| `composer.json`, `composer.lock` | Composer (PHP) | Manifest and lock file |
| `pom.xml` | Maven (Java) | Dependency manifest |
| `build.gradle`, `build.gradle.kts` | Gradle (Java/Kotlin) | Dependency DSL |
| `*.csproj`, `packages.config` | NuGet (.NET) | Dependency manifests |

### Public Vulnerability Databases

| Database | Ecosystems | API/Search | Trust Tier |
|----------|------------|------------|------------|
| GitHub Advisory Database | All | github.com/advisories, API v4 GraphQL | Canonical |
| NIST NVD | All (via CPE) | nvd.nist.gov/vuln/search | Canonical |
| OSV.dev | All | osv.dev API, JSON exports | High |
| npm security advisories | Node.js | npmjs.com/advisories, npm audit | High |
| PyPI advisories | Python | pypi.org, OSV | High |
| RubySec | Ruby | rubysec.com | High |
| RustSec | Rust | rustsec.org | High |
| Go Vulnerability Database | Go | pkg.go.dev/vuln | High |
| Snyk Vulnerability Database | All | security.snyk.io/vuln | Medium (proprietary but public) |

### Evidence Chain

```
Changed line in dependency manifest/lock file
  ↓
Package name + version constraint/exact version extracted
  ↓
WebSearch: "<package-name>" CVE 2026 vulnerability
  ↓
CVE-ID or advisory URL + CVSS score + vulnerable range retrieved
  ↓
Version overlap confirmed: changed version ∈ vulnerable range
  ↓
Patched version identified from advisory
  ↓
Finding generated with concrete CVE reference
```

### Prohibited External Data Transmission

**Do NOT send to web tools**:
- Repository source code snippets
- Private or internal package names (e.g., `@company-internal/auth-lib`)
- Proprietary dependency configuration or custom registry URLs
- Secrets, API keys, or credentials in dependency config
- File paths revealing internal project structure
- Lock file content with private package references

**Allowed external queries**:
- Public package names (e.g., `axios`, `requests`, `rails`, `tokio`)
- CVE identifiers (e.g., `CVE-2026-12345`, `GHSA-xxxx-yyyy-zzzz`)
- Framework/runtime names (e.g., `Node.js`, `npm`, `pnpm`, `Python`, `pip`)
- Vulnerability class names (e.g., `SSRF`, `prototype pollution`, `RCE`)
- Public advisory URLs (e.g., `github.com/advisories/GHSA-...`)

## Reference Architecture

### Dependency Ecosystem Detection

This repository uses **pnpm** (detected via `pnpm-lock.yaml` in root). The skill must support all common ecosystems:

```
package.json + pnpm-lock.yaml → pnpm (Node.js)
package.json + package-lock.json → npm (Node.js)
package.json + yarn.lock → Yarn (Node.js)
requirements.txt → pip (Python)
Pipfile + Pipfile.lock → Pipenv (Python)
pyproject.toml + poetry.lock → Poetry (Python)
Gemfile + Gemfile.lock → Bundler (Ruby)
go.mod + go.sum → Go modules
Cargo.toml + Cargo.lock → Cargo (Rust)
composer.json + composer.lock → Composer (PHP)
pom.xml → Maven (Java)
build.gradle → Gradle (Java/Kotlin)
*.csproj → NuGet (.NET)
```

### Vulnerability Introduction Vectors

1. **Direct dependency addition**: New package with existing CVE
2. **Version upgrade into vulnerable range**: `axios@1.5.0` → `axios@1.6.0` (vulnerable)
3. **Version downgrade into vulnerable range**: `axios@1.7.0` → `axios@1.6.0` (vulnerable)
4. **Version constraint loosening**: `axios@1.7.0` → `axios@^1.6.0` (allows vulnerable 1.6.x)
5. **Transitive dependency introduction**: Direct dependency pulls in vulnerable transitive dep
6. **Lock file tampering**: Integrity hash removal, resolution source change

### Severity Mapping (CVSS to Warden Severity)

| CVSS v3 Base Score | Warden Severity |
|--------------------|------------------|
| 9.0 - 10.0 (Critical) | high |
| 7.0 - 8.9 (High) | high |
| 4.0 - 6.9 (Medium) | medium |
| 0.1 - 3.9 (Low) | low (report only if active exploitation) |

### Confidence Calibration Matrix

| Evidence Strength | Confidence |
|-------------------|------------|
| CVE + CVSS + version overlap + patch available + vulnerable API imported | high |
| CVE + CVSS + version overlap + patch available | high |
| Advisory (no CVE) + version overlap + patch available | medium |
| Advisory + version range ambiguity | medium |
| No CVE/advisory, only package age or maintenance status | low (do not report) |

## Evaluation

### Lightweight Validation

1. Create test `package.json` with known vulnerable package (e.g., `axios@1.6.0` with GHSA-wf5p-g6vw-rhxx)
2. Run skill against the test file
3. Verify finding includes:
   - CVE or GHSA identifier
   - CVSS score or severity rating
   - Vulnerable version range
   - Patched version
   - Advisory URL
4. Confirm no findings for:
   - Patched versions (e.g., `axios@1.6.8`)
   - Non-overlapping version ranges
   - Upgrades from vulnerable to patched versions

### Structural Validation

1. Run skill-writer structural validator against this child skill directory
2. Verify `SKILL.md`, `SPEC.md`, `SOURCES.md` presence and structure
3. Check finding schema matches Warden's `FindingSchema` (zod validation)
4. Confirm no custom output format invented

### Behavioral Validation

1. Test against Dependabot/Renovate PRs with security advisory references
2. Verify WebSearch queries use only public package names (audit logs)
3. Confirm no repository code or private paths sent to web tools (audit tool invocations)
4. Test false-positive suppression:
   - Patched version upgrades
   - Dev dependencies not running in CI/CD
   - Disputed/rejected CVEs
5. Test confidence/severity calibration:
   - CVSS 9.0+ → high severity, high confidence
   - Advisory without CVE → medium confidence
   - No active exploitation → consider context

### Acceptance Gates

- Finding reported only when CVE/advisory + version overlap + patch availability confirmed
- CVE identifier or advisory URL present in `verification` field
- Version overlap demonstrated in `description` or `verification`
- Patched version included in `suggestedFix.description`
- No findings when version update moves to patched range (security improvement)
- Severity matches CVSS mapping (9.0+ → high, 7.0-8.9 → high, 4.0-6.9 → medium)
- Confidence reflects evidence strength (CVE + overlap + patch → high)

## Known Limitations

1. **Transitive dependency depth**: Skill prioritizes direct dependencies introduced by changed lines. Deep transitive dependency trees (3+ levels) are not exhaustively audited unless the direct dependency change pulls in a critically vulnerable transitive dependency.

2. **CVE database lag**: Public vulnerability databases may have 0-7 day lag between private disclosure and public CVE assignment. Skill relies on publicly available data at execution time.

3. **Version resolution complexity**: Skill parses version constraints but cannot perform full package manager resolution without executing `npm install`, `pip install`, etc. Ambiguous ranges (e.g., `^1.0.0`) are assessed against the vulnerable range, but actual installed version may differ if lock file is stale.

4. **Exploitability confirmation**: Skill cannot perform dynamic analysis to confirm vulnerable API surface is reachable at runtime. Static `Grep` checks for imports provide partial coverage but may miss dynamic imports or runtime reflection.

5. **Supply chain incident correlation**: Cross-referencing against recent supply chain attacks (e.g., "axios compromise March 2026") depends on public incident reporting. Private compromises or zero-day exploitation may not be detected.

6. **Monorepo workspace complexity**: Repositories with multiple `package.json` files (pnpm workspaces, Lerna, Nx) require tracing changed lines to the correct workspace context. Peer dependencies and workspace: protocol dependencies add resolution ambiguity.

7. **Lock file format evolution**: npm (v5, v6, v7, v8+ formats), pnpm (v6, v9+ formats), and Yarn (v1, v2 Berry) have different lock file structures. Skill must handle legacy formats encountered in older repositories.

8. **Dev dependency scope**: Skill includes dev dependencies if they run in CI/CD (scripts, GitHub Actions) or affect build output (webpack, vite, etc.). Determining execution context may require reading workflow files or build configurations.

9. **Platform-specific vulnerabilities**: Some CVEs apply only to specific OS platforms (Windows, Linux, macOS) or architectures (x86, ARM). Skill reports all CVEs matching version ranges unless advisory explicitly excludes platforms.

10. **Ecosystem-specific advisory formats**: PyPI, RubyGems, RustSec, and Go Vulnerability Database use different advisory schemas. Skill must normalize CVSS scores, severity ratings, and version ranges across ecosystems.

## Maintenance Notes

### When to Update This Skill

1. **New vulnerability database sources**: When ecosystems add official advisory databases (e.g., new language-specific security advisories), add to search strategy.

2. **CVSS scoring updates**: When CVSS v4 becomes standard or severity thresholds change, update severity mapping.

3. **Package manager evolution**: When npm, pnpm, pip, etc. release new lock file formats, update parsing logic.

4. **Supply chain incident patterns**: After major incidents (e.g., event-stream, ua-parser-js precedents), add specific detection patterns for similar attacks.

5. **Ecosystem expansion**: When repository adopts new languages/package managers, add ecosystem detection and advisory source support.

6. **False positive trends**: If users report consistent false positives (e.g., dev dependencies, platform-specific CVEs), refine false-positive controls.

### Source Refresh Triggers

- **Quarterly review**: OWASP Top 10, package manager security blogs, NIST NVD updates
- **Post-incident**: After major supply chain attacks or CVE disclosure waves
- **User feedback**: When maintainers report missed vulnerabilities or noisy findings
- **Ecosystem changes**: When package managers change integrity verification or resolution algorithms

### Backward Compatibility

- Skill uses Warden's existing `FindingSchema` from `src/types/index.ts`
- No custom output format; findings integrate with existing JSONL logs and GitHub comment formatting
- Evidence requirements and severity calibration may evolve, but finding structure remains compatible
- Cached child skill remains valid while task hash, source hash, and coordinator version match parent plan record
