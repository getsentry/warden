# Integrity Review Skill Sources

## Source Inventory

| Source | Trust tier | Confidence | Usage constraints | Decisions |
|--------|------------|------------|-------------------|-----------|
| `insider-threat-pr-review` skill, v1.2.0 (internal, 2026-10-20) | Internal prior art | High | Written for an agent that drives the whole review (`gh`, scanner, comment, label). Use the catalog and evidence stance; drop the workflow. | Catalog adapted to `references/threat-catalog.md`; workflow, verdicts, scanner, and CI publishing removed. |
| Existing `security-review` and `code-review` built-ins | Local prior art | High | Use structure and evidence gating; do not import their scope. | Mirror the category table, severity rubric, exclusions, and finding format. Define an explicit boundary table. |
| Source skill validation: 4 synthetic fixtures, 600 `getsentry/sentry` PRs | Internal measurement | Medium | Measured against a bare model, not against Warden's built-ins. | Treat the 99% clean rate on merged PRs as the noise budget. Treat detection gains as unproven until Warden evals show a delta. |

## Adaptation Decisions

1. **Separate built-in, not a `security-review` extension.**
   - Reason: `security-review` requires attacker-controlled input reaching a sink across a boundary. Most integrity findings (time bombs, mass deletion, lockfile drift, install hooks) have no attacker input and would be suppressed by that rule, or would require loosening it.
   - Decision: own evidence model of mechanism, trigger, scope, impact, declaration.
2. **Boundary by who causes the harm.**
   - Reason: both skills touch auth, CI, secrets, and exfiltration surfaces. Without a rule, both report the same hunk.
   - Decision: `security-review` owns what an outside party exploits; `integrity-review` owns what the change does by itself and what it hides. Shared cases report concealment here and the weakness there.
3. **Workflow steps removed.**
   - Reason: Warden owns diff collection, hunk splitting, JSON finding extraction, verification, comment rendering, labels, and gating (`failOn`, `requestChanges`, `failCheck`).
   - Decision: no `gh` steps, no report template, no verdict line, no publishing section.
4. **Verdicts collapsed into severity.**
   - Reason: `BLOCK`, `NEEDS_PEER_REVIEW`, `PASS_WITH_NOTES`, `PASS` have no Warden equivalent; `failOn` thresholds take that role.
   - Decision: `critical` folds into `high`; `high`, `medium`, `low` map directly. Intent indicators become a severity modifier and a `verification` bullet.
5. **Regex pre-scanner dropped.**
   - Reason: the source spec reports 9 confirmed findings from 86 medium/high leads on 600 PRs, with 17 of 26 non-clean verdicts coming from PRs with no leads. The model carries detection. The script also needs Bash and Python on the runner, which the built-ins avoid.
   - Decision: `allowed-tools: Read Grep Glob`. A deterministic PR-level pre-pass, if wanted, is a Warden pipeline feature.
6. **Name changed from `insider-threat-pr-review` to `integrity-review`.**
   - Reason: the name appears in check names and PR comments; the source skill itself forbids accusatory language toward the author.
7. **Author metadata not used.**
   - Reason: Warden does not pass it, and the source skill already forbade it as a basis for findings.
8. **No `paths` filter recommended.**
   - Reason: the categories target files reviewers skip. Narrowing paths creates the blind spots the skill exists to cover.

## Coverage Matrix

| Dimension | Coverage Status | Notes |
|-----------|-----------------|-------|
| Category definitions | Complete | Ten categories with report conditions in `SKILL.md`; detail in the catalog. |
| Evidence requirements | Complete | Mechanism, trigger, scope, impact, declaration. |
| False-positive controls | Complete | Exclusions cover declared deprecations, reversible migrations, test-only bypasses, placeholders, matching lockfile updates, and the other built-ins' scopes. |
| Severity calibration | Complete | Tied to blast radius; raised for concealment, lowered for unconfirmed preconditions. |
| PR-wide signals under per-hunk analysis | Partial | File-list guidance in the catalog. Deterministic PR-level leads would need a harness feature. |
| Declaration-based findings in evals | Gap | Harness supplies no PR title or body. |
| Real-world true positives | Gap | Source validation found no malicious PRs in 600 samples; only synthetic fixtures are true positives. |
