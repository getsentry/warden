# type-system-misuse Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|-----------|--------------|-------------------|
| Task prompt (Superwarden plan) | canonical | high | Scope, evidence requirements, out-of-scope exclusions | Must preserve exact task scope and evidence requirements |
| TypeScript Handbook (Narrowing) | authoritative | high | Type narrowing behavior, control-flow analysis, type guard semantics | Public documentation only; cite URLs when referencing behavior |
| TypeScript FAQ (Common Bugs) | authoritative | high | Known unsound patterns, common type system pitfalls | Public documentation only; cite specific FAQ sections |
| Web search: "TypeScript type assertion unsafe patterns 2026" | reference | medium | Current best practices, anti-patterns, real-world examples | Synthesized from multiple sources; avoid outdated guidance |
| Web search: "TypeScript non-null assertion operator runtime safety 2026" | reference | medium | Non-null assertion risks, modern guidance discouraging overuse | Synthesized from multiple sources; prioritize 2026 practices |
| Repository `tsconfig.json` | repository-local | high | Strict mode configuration, type-safety compiler options | Read from actual repository during execution |
| Repository linting config | repository-local | high | Type assertion rules, repository conventions | Read from actual repository during execution |
| Repository source code patterns | repository-local | medium | Existing type assertion, non-null assertion, type guard usage | Grep patterns during execution; informs false-positive calibration |

## Decisions

### Scope: Changed code only

**Decision**: Report findings only for type assertions, non-null assertions, `any` usage, and type guards in changed hunks.

**Evidence**: Parent task `outOfScope` explicitly excludes "Use of any or type assertions in unchanged code unless directly relevant to understanding a changed-line bug"

**Rationale**: Superwarden child skills anchor findings to changed lines; broad codebase audits are out of scope.

### Evidence: Data-flow trace required

**Decision**: Each finding must include concrete data-flow evidence showing asserted type does not match runtime reality.

**Evidence**: Parent task `evidenceRequirements` lists "Data-flow or control-flow trace showing the asserted type does not match runtime reality" and "Concrete evidence that no runtime check validates the type assumption"

**Rationale**: Prevents false positives on correct assertions; requires investigation beyond surface syntax.

### TypeScript documentation as reference

**Decision**: Consult public TypeScript Handbook and FAQ when analyzing type narrowing correctness.

**Evidence**: Parent task `evidenceRequirements` includes "Reference to public TypeScript FAQ or handbook when analyzing type narrowing correctness"

**Rationale**: Type narrowing behavior is complex and version-dependent; authoritative docs prevent misinterpretation.

### Severity calibration: External data = higher severity

**Decision**: Type assertions on external/untrusted data (API responses, user input, parsed JSON) warrant higher severity than internal data flows.

**Evidence**: Common security and reliability practice; parent plan's input validation task prioritizes external data

**Rationale**: Runtime type mismatches on external data can cause injection, crashes, or security bypasses; internal data has more predictable types.

### False positive control: Respect linting config

**Decision**: Do not report non-null assertions in test files if repository linting config explicitly allows them.

**Evidence**: Observed in repository `eslint.config.js`: `files: ["**/*.test.ts"], rules: { "@typescript-eslint/no-non-null-assertion": "off" }`

**Rationale**: Test files often use non-null assertions for convenience on known-good test data; repository maintainers have explicitly chosen this trade-off.

### Remediation: Concrete, actionable fixes

**Decision**: Each finding must include specific remediation guidance (e.g., "Replace `as Type` with `typeof x === 'object' && x !== null` check").

**Evidence**: Parent skill SPEC.md emphasizes "concrete remediation patterns" in skill-writer quality bar

**Rationale**: Actionable fixes increase finding value and reduce developer friction.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| **Vulnerability prerequisites** | complete | Type assertions without runtime checks; data from external sources; operations assuming specific types |
| **Exploitable dataflow examples** | complete | API response → type assertion → property access (TypeError); JSON.parse → `as Type` → method call (crash) |
| **False-positive controls** | complete | Exclude correct assertions with runtime checks; respect linting config for test files; ignore style preferences |
| **Severity/confidence calibration** | complete | High severity for external data; high confidence with clear data-flow evidence and no runtime checks |
| **Remediation patterns** | complete | Replace assertions with type guards; add schema validation; use optional chaining; enable strict mode |
| **Framework/runtime caveats** | complete | Zod validation usage; test file linting rules; TypeScript version narrowing differences; strict compiler options |
| **API surface** | complete | TypeScript type assertion syntax (`as`, `!`), type guards (`typeof`, `instanceof`, `is`), `any` type |
| **Config/runtime options** | complete | `tsconfig.json` strict flags, linting rules, schema validation libraries (zod, joi, ajv) |
| **Common use cases** | complete | Parsing external data, working with union types, legacy code migration, test fixture setup |
| **Known issues/workarounds** | complete | Library type definition gaps requiring assertions; test file conventions; gradual typing migration |
| **Version/migration variance** | complete | TypeScript narrowing behavior across versions; strict mode adoption during migration |

## Open Gaps

**No critical gaps identified.** The child skill has sufficient local repository inspection (tsconfig.json, linting config, source patterns) and external documentation (TypeScript Handbook, FAQ, 2026 best practices) to perform high-quality analysis.

**Potential future enhancements (low priority):**

1. **Schema validation library inventory**: Automatically detect which validation libraries (zod, joi, ajv, yup, etc.) are in use by reading `package.json` and tailor remediation suggestions accordingly.
2. **TypeScript version detection**: Read `package.json` or `tsconfig.json` to identify exact TypeScript version and adjust narrowing behavior analysis for version-specific semantics.
3. **Integration with repository type coverage metrics**: If repository tracks type coverage (percentage of `any` usage, strictness adoption), use metrics to calibrate false-positive thresholds.

**Why these are low-yield now:**

- Current approach (read config, grep patterns, consult docs) provides sufficient context for accurate findings
- Additional automation would add complexity without materially improving finding quality
- Can be added later if false-positive rate or user feedback indicates need

## Changelog

### 2026-04-30: Initial Superwarden child skill synthesis

**Synthesized from:**

- Parent Superwarden plan (find-bugs, task: type-system-misuse)
- Repository inspection: `tsconfig.json` (strict mode enabled), `eslint.config.js` (typescript-eslint strict rules, test file non-null assertion exception)
- Repository pattern analysis: Type assertions (`as`), non-null assertions (`!`), type guards (`is`), `unknown` usage in extract.ts and analyze.ts
- Public TypeScript documentation: Handbook (Narrowing), FAQ (Common Bugs)
- Web search: 2026 guidance on type assertion anti-patterns and non-null assertion runtime safety

**Key observations:**

- Repository uses `strict: true` in tsconfig.json (good baseline type safety)
- Repository uses typescript-eslint strict and stylistic configs (enforces best practices)
- Test files explicitly disable `@typescript-eslint/no-non-null-assertion` (intentional convention)
- Repository has `noUncheckedIndexedAccess: true` (prevents unsafe array/object indexing)
- Common patterns: `as` for type narrowing in SDK code, `unknown` for parsed data, user-defined type guards with `is` predicates

**Coverage achieved:**

- All parent task evidence requirements preserved
- All out-of-scope exclusions respected
- Security-review quality bar met: vulnerability prerequisites, exploitable dataflows, false-positive controls, severity/confidence calibration, remediation patterns, framework caveats
- Repository-local inspection required before reporting findings
- Public documentation consultation for type narrowing behavior
- Web tool usage restricted to public TypeScript concepts only

**Validation:**

- Skill body is concise and runtime-focused (investigation checklist, evidence requirements, output contract)
- SPEC.md contains full intent, scope, runtime contract, evaluation criteria, and maintenance notes
- SOURCES.md documents all source provenance, decisions, coverage matrix, and synthesis changelog
- No custom output schema invented; uses standard Warden findings schema
- Missing context noted in rationale fields rather than inventing facts
