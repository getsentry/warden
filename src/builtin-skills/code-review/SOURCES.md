# Code Review Skill Sources

## Source Inventory

| Source | Trust tier | Confidence | Usage constraints | Decisions |
|--------|------------|------------|-------------------|-----------|
| Existing built-in `security-review` skill | Local prior art | High | Use structure and evidence gating only; do not import security scope. | Mirror source-boundary-sink style as trigger-contract-impact for correctness bugs. |
| Local `architecture-review`, `code-simplifier`, and `find-warden-bugs` skills | Local prior art | Medium | Use boundaries to avoid overlap with style, architecture, and Warden-specific sweeps. | Make exclusions explicit so code review reports only bugs. |
| Common production correctness review failure modes | Engineering practice | Medium | Keep examples generic, transformed, and evidence-gated. | Cover logic, state, async, error handling, contracts, persistence, UI, build, and workflow bugs. |
| Warden package skill loader and packaging tests | Repository behavior | High | Use for validation scope only. | Add tests that the new built-in skill resolves and is included in the npm package. |

## Coverage Matrix

| Dimension | Coverage Status | Notes |
|-----------|-----------------|-------|
| Bug class definitions and prerequisites | Complete | `SKILL.md` defines reportable categories and requires a concrete trigger, violated contract, and impact. |
| Reachability and reproducibility evidence | Complete | Findings must prove the changed path is reachable and the failure is triggered by a specific input, state, ordering, or configuration. |
| False-positive controls | Complete | Exclusions block style, architecture, maintainability, security, performance-only, test-coverage-only, and pattern-only findings. |
| Severity and confidence calibration | Complete | Severity is tied to user-visible or operational impact, with lower severity for unproven preconditions. |
| Remediation expectations | Complete | Findings may include `suggestedFix` only when the fix is complete for the analyzed path. |
| Language and workflow caveats | Complete for initial scope | References cover JS/TS, Python, and GitHub Actions workflow correctness. Other languages use the core contract until repeated examples justify references. |

## Source-Backed Decisions

1. Security and correctness review should stay separate.
   - Reason: Warden already has a dedicated `security-review` skill with exploitability criteria.
   - Decision: `code-review` excludes auth, injection, XSS, SSRF, secrets, unsafe crypto, and workflow privilege issues.
2. Adversarial review still needs an evidence gate.
   - Reason: aggressive prompts easily produce style or speculative findings.
   - Decision: every finding must include trigger, expected behavior, actual behavior, and impact.
3. References should be conditional and language-specific.
   - Reason: the built-in security skill keeps `SKILL.md` concise by routing only relevant details.
   - Decision: create JS/TS, Python, and GitHub workflow references rather than a large catch-all reference.
4. Build and workflow breakage are correctness bugs.
   - Reason: Warden reviews code changes that can break published packages, CI, and releases.
   - Decision: include deterministic build, packaging, test, and workflow failures when the changed code proves the failure.

## Open Gaps

- Add eval fixtures after real review results identify the highest-value correctness bug classes for this skill.
- Add more language references only when repeated findings need language-specific calibration.
- Collect sanitized positive and negative review examples before creating `references/evidence/`.
