# access-control-vulnerabilities Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|------------|--------------|-------------------|
| Parent task prompt (plan.json) | Canonical | High | Task scope, evidence requirements, out-of-scope items, sibling boundaries | Must preserve parent intent and boundary decisions |
| OWASP Top 10 2021 | Authoritative | High | Broken Access Control (A01) classification, prevalence data, attack vectors | Public security guidance; cite URL in findings |
| OWASP Broken Access Control page | Authoritative | High | Vulnerability patterns, common weaknesses, prevention guidance | Public documentation; cite URL |
| OWASP Authorization Cheat Sheet | Authoritative | High | Authorization patterns, best practices, framework-agnostic guidance | Public cheat sheet; cite URL |
| CWE-639 (IDOR) | Authoritative | High | Insecure Direct Object Reference definition, examples, mitigations | Public CWE taxonomy; cite CWE ID |
| CWE-862 (Missing Authorization) | Authoritative | High | Missing authorization definition, weakness detection patterns | Public CWE taxonomy; cite CWE ID |
| CWE-284 (Improper Access Control) | Authoritative | High | Access control taxonomy root, related weaknesses | Public CWE taxonomy; cite CWE ID |
| CWE-269 (Improper Privilege Management) | Authoritative | High | Privilege escalation patterns, weakness detection | Public CWE taxonomy; cite CWE ID |
| Next.js Authentication Guide (official docs) | Authoritative | High | Next.js App Router auth best practices, Data Access Layer pattern, middleware limitations | Public framework documentation; framework-specific |
| Express.js authentication patterns | Authoritative | Medium | Middleware-based auth, route protection patterns | Inferred from common community patterns and library docs |
| FastAPI Security documentation | Authoritative | High | Dependency injection auth, OAuth2 patterns, security dependencies | Public framework documentation; framework-specific |
| Django REST Framework Authentication docs | Authoritative | High | Permission classes, authentication classes, object-level permissions | Public framework documentation; framework-specific |
| route-detect tool documentation | Reference | Medium | Static analysis patterns for missing auth/authz detection, anomaly detection approaches | Open-source tool; novel detection patterns |
| CVE-2026 access control examples | Reference | Medium | Real-world vulnerability patterns (CVE-2026-5652, CVE-2026-33030, CVE-2026-3999) | Public CVE disclosures; demonstrates current threats |
| Warden codebase (src/sdk/auth.ts) | Local context | High | Warden's own authentication verification patterns, error handling | Repository source; do not send to web tools |
| Warden codebase (src/types/index.ts) | Local context | High | Finding schema structure, severity/confidence types, output contract | Repository source; do not send to web tools |
| Warden example skill (find-warden-bugs) | Local context | Medium | Skill structure, confidence calibration patterns, output format | Repository source; template for skill structure |

## Decisions

### Decision: Scope Boundary with Sibling Tasks

**Question:** Where does access-control-vulnerabilities end and injection-vulnerabilities begin when SQL injection bypasses authorization?

**Decision:** Report as authorization bypass if the SQL injection allows bypassing access checks. Do not duplicate detailed injection analysis (owned by injection-vulnerabilities). Focus on the access control consequence, reference the injection as the bypass mechanism.

**Evidence:**
- Parent task outOfScope explicitly excludes "Injection vulnerabilities in input handling (owned by injection-vulnerabilities)"
- OWASP Broken Access Control includes "Bypassing access control checks" as in-scope, regardless of bypass technique

**Rationale:** Avoid duplicate findings between sibling tasks. Report the security impact (authorization bypass) rather than the root cause (injection) when the root cause is owned by another task.

### Decision: Cryptographic Session Token Issues

**Question:** Should weak session token generation be reported?

**Decision:** Out of scope. Report session fixation or session hijacking that bypasses authentication. Do not report cryptographic weaknesses in token generation (owned by cryptographic-vulnerabilities).

**Evidence:**
- Parent outOfScope: "Cryptographic implementation flaws (owned by cryptographic-vulnerabilities)"
- Session token generation uses cryptographic randomness → cryptographic concern

**Rationale:** Focus on access control logic, not cryptographic primitives.

### Decision: Hardcoded Admin Credentials

**Question:** Should hardcoded admin passwords be reported?

**Decision:** Out of scope (owned by secrets-exposure). Focus on missing authentication checks, not credential storage.

**Evidence:**
- Parent outOfScope: "Secrets and credentials exposure (owned by secrets-exposure)"
- Hardcoded credentials are secrets, not access control logic flaws

**Rationale:** Sibling task specialization. Let secrets-exposure handle credential storage; this task handles authentication/authorization logic.

### Decision: Client-Side Only Enforcement

**Question:** Is hiding admin buttons in the UI without server-side checks an access control vulnerability?

**Decision:** Yes, in scope. This is authorization bypass through client-side only enforcement.

**Evidence:**
- Next.js documentation: "Client-side UI restrictions alone are not sufficient for security"
- OWASP: "Never rely on client-side checks (e.g., hiding a button in UI). Always verify permissions on the backend."

**Rationale:** Client-side enforcement is a common access control anti-pattern. Server-side validation is required.

### Decision: Framework-Specific Patterns

**Question:** Should the skill learn framework-specific auth patterns or expect them as input?

**Decision:** The skill MUST research public framework documentation when framework usage is detected in the repository.

**Evidence:**
- Parent task prompt: "Research current framework authentication and authorization patterns using public documentation when framework usage is detected"
- Parent instructions: "use public prior art when external behavior affects correctness"

**Rationale:** Framework patterns affect what constitutes a vulnerability. Next.js middleware is insufficient; Express middleware is correct. Cannot detect this without framework knowledge.

### Decision: Confidence Calibration

**Question:** When should findings be reported at medium vs. high confidence?

**Decision:**
- High confidence: Clear control flow shows missing check, framework pattern violated, exploitable path traced
- Medium confidence: Missing check evident, but surrounding context may provide protection
- Low confidence: Do NOT report

**Evidence:**
- Warden find-warden-bugs skill confidence calibration table
- Security-review quality bar from parent instructions

**Rationale:** Minimize false positives while maintaining recall on clear vulnerabilities.

### Decision: Severity Calibration

**Question:** How to assign severity levels?

**Decision:**
- High: Unauthorized access to sensitive data/operations affecting other users, privilege escalation, authentication bypass
- Medium: Access to less-sensitive data, limited scope, horizontal escalation within same resource type
- Low: Informational, partial bypasses with mitigating controls

**Evidence:**
- OWASP Top 10: Broken Access Control is #1 risk with high prevalence and impact
- CWE severity guidance for access control weaknesses
- Real-world CVE severity classifications (IDOR typically medium-high, privilege escalation typically high-critical)

**Rationale:** Align with industry-standard severity classification. Account for impact scope and data sensitivity.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| **Vulnerability prerequisites** | Complete | Explicit prerequisites for missing authentication, authorization bypass, privilege escalation, and IDOR in SKILL.md |
| **Exploitable dataflow examples** | Complete | TypeScript/Express, Next.js, Python/FastAPI examples with vulnerable and secure patterns in SKILL.md |
| **False-positive controls** | Complete | Five categories of exclusions: intentionally public, framework protection, internal/admin, read-only public, upstream validation in SKILL.md |
| **Severity/confidence calibration** | Complete | Calibration tables with criteria and thresholds aligned with OWASP/CWE guidance in SKILL.md and SPEC.md |
| **Remediation patterns** | Complete | Framework-specific fix patterns for Express, Next.js, FastAPI, Django, Rails in SKILL.md |
| **Framework/runtime caveats** | Complete | Next.js App Router, Express, FastAPI, Django/DRF, Rails caveats in SKILL.md |
| **API surface** | Complete | WebSearch, WebFetch for public docs; Read, Grep, Glob for local investigation |
| **Config/runtime options** | Complete | Changed-line anchoring, finding schema requirements, privacy constraints |
| **Common use cases** | Complete | IDOR detection, missing auth, privilege escalation, authorization bypass |
| **Known issues/workarounds** | Complete | Known limitations section in SPEC.md: dynamic logic, implicit protections, interprocedural analysis, framework version variance |
| **Version/migration variance** | Partial | Framework caveats note pattern differences but do not enumerate all versions |

## Open Gaps

### Gap: Framework Version-Specific Patterns

**Description:** Framework authentication patterns evolve across major versions (e.g., Next.js Pages Router vs. App Router, Express 4 vs. 5).

**Impact:** May report false positives or miss vulnerabilities when framework version differs from documented patterns.

**Next steps:**
- Low yield for current synthesis: Most breaking changes are documented, and the skill already references current (2026) best practices
- Future enhancement: Inspect package.json or framework version declarations to tailor detection patterns

### Gap: Business Logic Authorization Rules

**Description:** Domain-specific rules like "users can only edit posts they created within 24 hours" or "managers can approve requests from their department" require business context.

**Impact:** Cannot detect missing enforcement of complex business rules without semantic understanding of the domain.

**Next steps:**
- Out of scope for static analysis: Requires runtime testing or manual security review
- Document as known limitation in SPEC.md (already included)

### Gap: Authorization Service Integration Patterns

**Description:** Modern applications often delegate authorization to external services (OPA, Ory, Auth0 RBAC). Detection requires recognizing integration patterns.

**Impact:** May not recognize that authorization is performed by external service, leading to false positives.

**Next steps:**
- Medium yield: Research public documentation for major authorization services (OPA, Casbin, Ory Keto)
- Add to framework/runtime caveats if integration patterns are detected in repository

### Gap: GraphQL-Specific Authorization Patterns

**Description:** GraphQL resolvers have different authorization patterns than REST endpoints (field-level authorization, resolver-level checks).

**Impact:** May not recognize GraphQL authorization middleware or field resolvers as protection mechanisms.

**Next steps:**
- Medium yield: Add GraphQL resolver patterns to reference architecture if GraphQL usage is detected
- Research public GraphQL security best practices and Apollo/GraphQL Yoga documentation

## Changelog

### 2026-04-30: Initial Synthesis

**Superwarden Pass:** Complete child skill synthesis for access-control-vulnerabilities task.

**Changes:**
- Synthesized SKILL.md with vulnerability prerequisites, exploitable dataflow examples, false-positive controls, confidence/severity calibration, remediation patterns, and framework caveats
- Synthesized SPEC.md with intent, scope, runtime contract, source/evidence model, reference architecture, evaluation, known limitations, and maintenance notes
- Synthesized SOURCES.md with source inventory, decisions, coverage matrix, open gaps, and changelog

**Sources consulted:**
- Parent plan.json task definition and sibling boundaries
- OWASP Top 10 2021 (A01: Broken Access Control)
- OWASP Authorization Cheat Sheet
- CWE-639, CWE-862, CWE-284, CWE-269
- Next.js official authentication guide (2026)
- Express.js, FastAPI, Django REST Framework public documentation
- Real-world 2026 CVE examples (CVE-2026-5652, CVE-2026-33030, CVE-2026-3999)
- route-detect static analysis tool patterns
- Warden repository source (src/sdk/auth.ts, src/types/index.ts, .agents/skills/find-warden-bugs/SKILL.md)

**Coverage achieved:**
- All security-review synthesis dimensions covered: vulnerability prerequisites, exploitable dataflow, false-positive controls, severity/confidence calibration, remediation patterns, framework caveats
- All SDK/API synthesis dimensions covered: API surface, config/runtime options, common use cases, known issues/workarounds
- Version/migration variance partially covered (documented as open gap)

**Quality gates:**
- Skill-writer structural validation: task-id naming, focused description, complete SPEC.md sections
- Privacy constraint enforcement: prohibits sending repository code to web tools
- Evidence requirements: changed-line anchoring, concrete evidence, framework documentation
- Sibling boundary enforcement: explicit outOfScope section naming sibling tasks
- Parent intent preservation: task scope, evidence requirements, outOfScope items maintained
