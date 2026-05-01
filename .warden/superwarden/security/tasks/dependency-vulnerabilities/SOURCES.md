# dependency-vulnerabilities Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|------------|------------|--------------|-------------------|
| Repository `pnpm-lock.yaml` | canonical | high | Primary lock file format for this repository; confirms pnpm ecosystem | Inspect for changed lines, integrity hashes, and resolution sources |
| Repository `package.json` | canonical | high | Dependency manifest with version constraints | Parse for added/updated/removed dependencies |
| GitHub Advisory Database | canonical | high | CVE identifiers, GHSA IDs, CVSS scores, vulnerable ranges, patched versions | Query via WebSearch using public package names only |
| NIST NVD (nvd.nist.gov) | canonical | high | Authoritative CVE database with CVSS v3/v4 scores | Query via WebSearch using CVE identifiers |
| OSV.dev (Open Source Vulnerabilities) | canonical | high | Aggregated vulnerability database across ecosystems | Query via WebSearch or WebFetch API |
| npm security advisories | high | high | Node.js package vulnerabilities, npm audit data | Query via WebSearch for npm-specific advisories |
| Snyk Vulnerability Database | medium | medium | Proprietary but publicly accessible vulnerability data | Use as supplementary source when GitHub/NVD lack details |
| pnpm.io audit documentation | high | medium | pnpm audit behavior and lock file integrity verification | Understand integrity hash format and verification |
| OWASP Supply Chain Security guidance | high | medium | Best practices for lock file integrity, dependency verification | Inform false-positive controls and supply chain risk patterns |
| Warden `src/types/index.ts` FindingSchema | canonical | high | Required output format for findings | Ensure all findings conform to existing schema |
| Parent task prompt | canonical | high | Scope, evidence requirements, out-of-scope exclusions | Define task boundaries and evidence threshold |
| Sibling task scopes | canonical | high | injection-vulnerabilities, access-control-vulnerabilities, cryptographic-vulnerabilities, secrets-exposure, resource-handling-vulnerabilities | Define hard boundaries for what this skill must not cover |

## Decisions

### Decision: Ecosystem Detection Strategy
**Rationale**: Repository contains `pnpm-lock.yaml`, confirming pnpm as the primary package manager. Skill must support all common ecosystems (npm, pip, bundler, cargo, etc.) but prioritize Node.js/pnpm for this repository.

**Evidence**: Glob results show `pnpm-lock.yaml` in root, `package.json` in root and `packages/docs/`, no `package-lock.json` or `yarn.lock`.

**Implementation**: Detect ecosystem by manifest and lock file presence; parse pnpm-lock.yaml for integrity hashes and resolution sources.

### Decision: CVE Severity Threshold
**Rationale**: Parent task prompt does not specify CVSS threshold. OWASP and industry practice suggest reporting High (CVSS 7.0+) and Critical (CVSS 9.0+) vulnerabilities. Medium (CVSS 4.0-6.9) should be reported with context.

**Evidence**: NIST NVD CVSS v3 ranges: 9.0-10.0 (Critical), 7.0-8.9 (High), 4.0-6.9 (Medium), 0.1-3.9 (Low). OWASP Top 10 2021 focuses on high-severity vulnerabilities.

**Implementation**: Map CVSS ≥7.0 → high severity, CVSS 4.0-6.9 → medium severity. Report low severity (CVSS <4.0) only with active exploitation evidence.

### Decision: Transitive Dependency Reporting
**Rationale**: Parent task prompt states "Do not report application code vulnerabilities covered by other tasks" and "Exclude findings when dependencies are current or patches are not yet available." Transitive dependencies introduced by a changed direct dependency should be reported; exhaustive transitive audits are out of scope.

**Evidence**: Parent task evidence requirements: "Changed dependency manifest or lock file line showing package name and version." This implies the changed line must directly introduce the vulnerability.

**Implementation**: Report transitive dependencies only when a changed direct dependency introduces them. Do not exhaustively audit all transitive dependencies unless changed lines caused their addition.

### Decision: Dev Dependency Scope
**Rationale**: Dev dependencies may run in CI/CD (scripts, GitHub Actions) or affect build output (bundlers, transpilers). Vulnerabilities in dev dependencies that execute in these contexts are in scope.

**Evidence**: Repository has devDependencies including `vitest`, `tsx`, `typescript`, `oxlint`. These run in CI/CD (`npm test`, `npm run typecheck`) and affect build artifacts.

**Implementation**: Include dev dependencies in scope. Check `package.json` scripts, `.github/workflows`, and build configurations to determine if dev dependencies execute in security-relevant contexts.

### Decision: Lock File Integrity Validation
**Rationale**: pnpm-lock.yaml uses `integrity: sha512-...` fields for package verification. Removal or modification of integrity hashes is a supply chain attack vector.

**Evidence**: pnpm audit documentation (2026) confirms integrity hashes prevent package substitution. Recent supply chain incidents (axios compromise, Shai-Hulud worm) exploited integrity hash weaknesses.

**Implementation**: Detect removed or modified `integrity` fields in lock file changes. Report as medium severity supply chain risk even without specific CVE.

### Decision: WebSearch Usage for CVE Lookup
**Rationale**: Warden SKILL.md prohibits sending repository code or private paths to web tools. CVE lookups must use only public package names and CVE identifiers.

**Evidence**: Parent Superwarden SPEC.md: "Do not send repository code, secrets, private file paths, or proprietary details to web tools." OSV.dev, GitHub Advisory Database, and NVD all accept public package name queries.

**Implementation**: WebSearch queries use format: `"<public-package-name>" CVE 2026 vulnerability` (e.g., `"axios" CVE 2026 vulnerability`). Never send lock file content, private package names, or repository paths.

### Decision: False Positive Suppression for Patched Versions
**Rationale**: Parent task prompt: "Exclude findings when dependencies are current or patches are not yet available." Upgrading from vulnerable to patched version is a security improvement, not a vulnerability.

**Evidence**: Evidence requirement: "Availability of patched version or documented mitigation." If the changed version is outside the vulnerable range, no finding should be reported.

**Implementation**: Before reporting, confirm changed version falls within vulnerable range. If version update moves to patched range, suppress finding (or report as "security improvement" if that's a desired feature).

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| **Vulnerability prerequisites** | complete | CVE identifier, CVSS score, vulnerable version range, patched version required before reporting |
| **Exploitable dataflow examples** | complete | Direct dependency addition, version upgrade into vulnerable range, lock file integrity removal |
| **False-positive controls** | complete | Patched version upgrades, non-overlapping version ranges, dev dependencies not in CI/CD, disputed CVEs |
| **Severity/confidence calibration** | complete | CVSS ≥7.0 → high severity, CVE + overlap + patch → high confidence, advisory without CVE → medium confidence |
| **Remediation patterns** | complete | Patched version upgrade, lock file regeneration, version constraint updates, migration guides |
| **Framework/runtime caveats** | complete | npm/pnpm/yarn lock file formats, workspace dependencies, peer dependencies, transitive dependency scope |
| **API surface** | complete | Public vulnerability databases: GitHub Advisory Database, NVD, OSV.dev, npm advisories, ecosystem-specific sources |
| **Config/runtime options** | complete | `.npmrc`, `.yarnrc.yml`, `pip.conf`, registry sources, integrity verification settings |
| **Common use cases** | complete | Dependabot PRs, manual dependency updates, monorepo workspace changes, runtime version updates |
| **Known issues/workarounds** | complete | Transitive dependency depth limits, CVE database lag, version resolution ambiguity, exploitability confirmation limits |
| **Version/migration variance** | complete | npm v5-v8 lock file formats, pnpm v6-v9 formats, Yarn v1-v2 Berry, Python pip/pipenv/poetry, Ruby bundler, Go modules, Rust cargo |

## Open Gaps

### Gap: Platform-Specific Vulnerability Detection
**Description**: Some CVEs apply only to specific OS platforms (Windows, Linux, macOS) or CPU architectures (x86, ARM). Skill currently reports all CVEs matching version ranges without platform filtering.

**Mitigation**: Advisory descriptions often mention platform applicability (e.g., "Windows only"). Include platform context in finding description but report all CVEs unless advisory explicitly excludes the platform.

**Next steps**: Low priority. Platform-specific filtering would require deployment environment detection (Docker base image, CI/CD runner OS), which is out of scope for changed-line analysis.

### Gap: Active Exploitation Confirmation
**Description**: Skill searches for "active exploitation" in WebSearch queries but relies on public reporting. Zero-day or private exploitation may not be detected.

**Mitigation**: Use CVSS "Exploit Code Maturity" metric when available. Report all CVSS ≥7.0 vulnerabilities regardless of exploitation status, but note exploitation evidence in verification field.

**Next steps**: Monitor CISA KEV (Known Exploited Vulnerabilities) catalog for actively exploited CVEs. Consider adding CISA KEV as a supplementary source in future updates.

### Gap: Monorepo Workspace Dependency Resolution
**Description**: pnpm workspaces, Lerna, and Nx monorepos have complex dependency graphs with workspace: protocol dependencies and shared peer dependencies. Tracing changed lines to the correct workspace context is challenging.

**Mitigation**: Read `pnpm-workspace.yaml` or root `package.json` workspaces field to identify workspace structure. Trace changed file path to workspace subdirectory.

**Next steps**: Test against monorepo examples with workspace dependencies. Add workspace context to finding location if needed.

### Gap: CVE Database API Rate Limits
**Description**: GitHub Advisory Database, NVD, and OSV.dev have API rate limits. WebSearch may be throttled or blocked for high-volume queries.

**Mitigation**: Warden's WebSearch tool has built-in 15-minute cache. Limit queries to changed packages only (not entire dependency tree).

**Next steps**: Monitor WebSearch failure rates. If rate limits are hit, batch queries or use OSV.dev JSON exports (gs://osv-vulnerabilities/<ECOSYSTEM>/all.zip).

## Changelog

### 2026-04-30: Initial Superwarden Child Skill Synthesis

**Synthesis approach**:
- Inspected repository `pnpm-lock.yaml` and `package.json` to confirm Node.js/pnpm ecosystem
- Searched public npm vulnerability databases (GitHub Advisory Database, npm audit, Snyk, OSV.dev) for current 2026 advisory formats and API availability
- Cross-referenced NIST NVD and pnpm audit documentation for CVSS scoring and integrity verification
- Reviewed OWASP Supply Chain Security guidance and 2026 npm security incidents (axios compromise, Shai-Hulud worm)
- Analyzed Warden `src/types/index.ts` FindingSchema to ensure output compatibility
- Studied existing `notmythos/dependency-vulnerabilities` child skill for structure and evidence patterns
- Applied security-review synthesis quality bar: vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, remediation patterns, framework/runtime caveats

**Evidence sources**:
- Repository files: `pnpm-lock.yaml`, `package.json`, `src/types/index.ts`
- Public vulnerability databases: GitHub Advisory Database, NIST NVD, OSV.dev, npm advisories, Snyk
- Package manager documentation: pnpm audit, npm audit, pip vulnerability scanning
- Security guidance: OWASP Top 10 2021, OWASP Supply Chain Security, CWE Top 25
- 2026 npm security incidents: axios compromise, Shai-Hulud worm (via WebSearch)

**Scope decisions**:
- Focus on Node.js/pnpm as primary ecosystem (detected in repository) but support all common package managers
- Report CVSS ≥7.0 (High/Critical) by default; Medium (4.0-6.9) with context; Low (<4.0) only with active exploitation
- Include dev dependencies running in CI/CD or affecting build output
- Report transitive dependencies only when introduced by changed direct dependency
- Require CVE identifier or public advisory + version overlap + patched version before reporting
- Exclude application-level vulnerabilities delegated to sibling tasks (injection, access-control, cryptographic, secrets, resource-handling)

**Out-of-scope boundaries**:
- Injection vulnerabilities in application code → `injection-vulnerabilities` task
- Access control flaws → `access-control-vulnerabilities` task
- Cryptographic weaknesses → `cryptographic-vulnerabilities` task
- Secrets exposure → `secrets-exposure` task
- Resource exhaustion → `resource-handling-vulnerabilities` task
- Non-security dependency updates (freshness, license, SBOM)

**Known limitations documented**:
- Transitive dependency depth (prioritize direct dependencies)
- CVE database lag (0-7 day delay)
- Version resolution ambiguity (requires package manager execution)
- Exploitability confirmation (static analysis only)
- Monorepo workspace complexity
- Platform-specific CVE filtering

**Next maintenance triggers**:
- Quarterly OWASP/NVD/npm security blog review
- Post-incident updates after major supply chain attacks
- User feedback on false positives or missed vulnerabilities
- Package manager lock file format changes
