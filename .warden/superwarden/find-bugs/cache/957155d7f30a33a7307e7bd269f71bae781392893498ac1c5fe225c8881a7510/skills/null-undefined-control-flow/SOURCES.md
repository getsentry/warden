# null-undefined-control-flow Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|------------|--------------|-------------------|
| Superwarden parent task `null-undefined-control-flow` | canonical | high | Task scope, prompt, evidence requirements, out-of-scope exclusions | Do not modify task scope without parent regeneration |
| TypeScript narrowing documentation (typescriptlang.org) | authoritative public | high | Narrowing mechanisms (typeof, truthiness, equality, in, instanceof, type predicates, discriminated unions, control flow analysis) | Use only for public TypeScript behavior; do not send repository code |
| TypeScript FAQ on common bugs | authoritative public | high | Known type system pitfalls (extracted boolean narrowing, typeof null, incorrect truthiness checks) | Use for validation of guard correctness |
| Warden tsconfig.json | canonical | high | Strict null check configuration (`strict: true`, `strictNullChecks`, `noUncheckedIndexedAccess`) | Read locally; do not send to web tools |
| Warden TypeScript source files | canonical | high | Null handling patterns (optional chaining, nullish coalescing, explicit checks, non-null assertions, type assertions) | Inspect locally; do not send to web tools |
| Warden Finding schema | canonical | high | Output format, required fields, severity/confidence values | Must match Warden's existing schema; do not invent custom output |

## Decisions

### Decision: Focus on changed-line bugs, not configuration recommendations

**Rationale**: The parent task prompt states "Report findings only when you have concrete evidence: the changed line contains an unsafe access". Users want actionable bugs, not suggestions to enable strict mode.

**Evidence**: Parent task out-of-scope: "Missing null checks in unchanged code unless directly relevant to understanding a changed-line bug".

**Implementation**: Check tsconfig.json and note configuration status in findings (e.g., "strict null checks are disabled, increasing likelihood of null bugs"), but report actual bugs in changed code, not missing configuration.

### Decision: Distinguish incorrect truthiness checks from intentional falsy filtering

**Rationale**: Truthiness checks (`if (value)`) are incorrect for nullable numbers/strings because they exclude `0` and `''`, but they are correct when the code explicitly wants to filter all falsy values.

**Evidence**: TypeScript narrowing documentation states "Falsy values in JavaScript: `0`, `NaN`, `''` (empty string), `0n`, `null`, `undefined`, `false`". Parent task prompt: "verify it covers all code paths and does not rely on incorrect type narrowing (such as truthiness checks that treat empty string or zero as null)".

**Implementation**: Report truthiness checks on `string | null` or `number | null` as bugs unless surrounding code context suggests intentional falsy filtering (e.g., validation logic that rejects empty strings). Use medium confidence for unclear cases.

### Decision: Require data-flow trace from source to sink

**Rationale**: High-confidence findings need concrete evidence that a nullable source reaches an unsafe operation. Type annotations alone are insufficient (they may be incorrect or the value may be guarded).

**Evidence**: Parent task evidence requirements: "Data-flow trace showing the nullable or undefined source (parameter, property, return value, or expression)".

**Implementation**: Trace backward from unsafe operations (property access, method call, array index) to find the nullable source (parameter, property, return value). Confirm the source has a nullable type annotation or is the result of an operation that can return null/undefined (e.g., array `.find()`, optional property access). Confirm no guard exists on all paths.

### Decision: Flag non-null assertions only with contradictory evidence

**Rationale**: Non-null assertions (`!`) are intentional escape hatches. Flagging all of them creates noise. Only report when surrounding code contradicts the assertion.

**Evidence**: Parent task prompt: "Do not report findings for intentional non-null assertions (exclamation mark operator) unless surrounding code suggests the assertion is incorrect." Parent task out-of-scope: "Non-null assertions that are correct based on surrounding invariants".

**Implementation**: Look for contradictory evidence: defensive null checks in some callers but not others, comments indicating uncertainty ("TODO: verify this is safe"), recent changes removing a guard before the assertion, or conditional logic that only makes sense if the value can be null.

### Decision: Use public TypeScript narrowing documentation, not repository code, in web queries

**Rationale**: Privacy constraint prohibits sending repository code to web tools. TypeScript narrowing behavior is public and documented.

**Evidence**: Parent instructions: "Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public TypeScript narrowing documentation at https://www.typescriptlang.org/docs/handbook/2/narrowing.html".

**Implementation**: Use WebFetch to retrieve TypeScript narrowing documentation when analyzing guard correctness (e.g., to confirm that `typeof obj === 'object'` does not exclude `null`). Reference the public URL in findings so users can verify the claim. Never send repository code snippets in web queries.

### Decision: Calibrate severity based on null likelihood, confidence based on data-flow clarity

**Rationale**: Not all nullable sources are equally likely to be null at runtime. Some are rare edge cases; others are common. Severity should reflect exploitability (likelihood of runtime crash). Confidence should reflect evidence quality (data-flow clarity, guard analysis).

**Evidence**: Parent task prompt: "For each potentially unsafe access, trace backward to confirm whether a type guard, explicit null check, optional chaining, nullish coalescing, or early return protects the access." Skill-writer security-review quality bar: "severity/confidence calibration".

**Implementation**:

- **Severity high**: Direct property access on array `.find()` result without guard (very likely undefined), required parameter typed as nullable (caller may pass null)
- **Severity medium**: Optional property access without guard (may be undefined in some code paths), conditional assignment that may leave value null
- **Severity low**: Rare edge case (library returning null only in documented error conditions), defensive assertion in well-tested code
- **Confidence high**: Clear data flow from nullable source to unsafe access, no guards on any path, TypeScript config confirms strict null checks are disabled or bypassed
- **Confidence medium**: Guard may exist in parent function or calling code is unclear, type annotations suggest non-null but runtime behavior is uncertain
- **Confidence low**: Guard exists but may be incorrect (truthiness check on number/string), cross-function data flow is complex and uncertain

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| **Vulnerability prerequisites** | complete | Nullable source (parameter, property, return value) + unsafe operation (property access, method call, array index) + missing guard |
| **Exploitable dataflow examples** | complete | Array `.find()` without guard, optional parameter access, object property access without `in` check, array indexing with `noUncheckedIndexedAccess` |
| **False-positive controls** | complete | Skip intentional non-null assertions (unless contradictory evidence), skip correct optional chaining, skip unchanged code, skip intentional falsy filtering |
| **Severity/confidence calibration** | complete | Severity = null likelihood (high: very likely, medium: possible, low: rare); Confidence = data-flow clarity (high: clear, medium: uncertain, low: unclear) |
| **Concrete remediation patterns** | complete | Explicit null checks, optional chaining, nullish coalescing, early returns, type guards; avoid truthiness checks on numbers/strings |
| **Framework/runtime caveats** | complete | TypeScript types are compile-time only, `typeof null === 'object'`, `noUncheckedIndexedAccess` makes array access return `T \| undefined`, optional chaining short-circuits |
| **API surface** | complete | TypeScript narrowing mechanisms: typeof, instanceof, in, equality checks, truthiness narrowing, optional chaining, nullish coalescing, type predicates |
| **Config/runtime options** | complete | tsconfig.json: `strict`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` |
| **Common use cases** | complete | Function parameters, object properties, array elements, API responses, array method results, destructuring, method chaining |
| **Known issues/workarounds** | complete | Cross-function data flow (limited), external data validation (assumes type annotations), framework null handling (use public docs), gradual migration (focus on changed lines) |
| **Version/migration variance** | partial | TypeScript narrowing behavior varies by version (template literal narrowing in TS 4.1+, const assertions); child skill uses current TS 5.x behavior; note in findings if version matters |

## Open Gaps

### Gap: Cross-function nullable return value analysis

**Impact**: If a function in a changed hunk returns a nullable value and the caller (in unchanged code or a different file) doesn't check, this skill may not detect the unsafe caller.

**Next step**: Opportunistically flag nullable return values in changed functions and verify callers in the same file. Full cross-file analysis is expensive and deferred.

**Yield**: Medium. Many null bugs occur at function boundaries where caller assumptions differ from callee contracts.

### Gap: TypeScript version-specific narrowing behavior

**Impact**: Narrowing behavior changed in TypeScript 4.1 (template literal types), 4.4 (control flow analysis improvements), 4.8 (narrowing for in checks). Older TypeScript versions may have different narrowing.

**Next step**: Check package.json for TypeScript version if narrowing behavior affects findings. Note version-specific behavior in finding descriptions.

**Yield**: Low. Most repositories use recent TypeScript versions. Warden repository uses TS 5.x.

### Gap: Framework-specific null handling patterns

**Impact**: React hooks with default values, Express middleware with request augmentation, Prisma optional relations – frameworks provide null-safety patterns that this skill may not recognize.

**Next step**: Use WebFetch to retrieve framework-specific documentation when analyzing framework APIs. Build a library of common patterns (opportunistic).

**Yield**: Medium. Framework patterns are common in changed code and may cause false positives if not recognized.

### Gap: Incorrect type annotations

**Impact**: If type annotations are wrong (parameter declared as non-null but actually nullable in practice), this skill trusts the annotation and may miss bugs.

**Next step**: Look for contradictory evidence (defensive null checks in some callers, comments indicating uncertainty, conditional logic that only makes sense for nullable values). Flag inconsistent patterns.

**Yield**: Low. Type annotations are usually correct in well-typed codebases. Defensive checks provide signal.

## Changelog

### 2026-04-30: Initial child skill synthesis

- **Synthesizer**: Superwarden child skill generator
- **Parent**: find-bugs, task null-undefined-control-flow
- **Source inspection**: Read /Users/dcramer/src/warden/tsconfig.json (confirmed `strict: true`, `noUncheckedIndexedAccess: true`), inspected TypeScript source patterns (optional chaining, nullish coalescing, explicit null checks, non-null assertions)
- **External sources**: Retrieved TypeScript narrowing documentation (https://www.typescriptlang.org/docs/handbook/2/narrowing.html) for typeof guards, truthiness narrowing, equality narrowing, in operator, instanceof, type predicates, discriminated unions, control flow analysis
- **Coverage**: All skill-writer security-review dimensions covered (vulnerability prerequisites, exploitable dataflow, false-positive controls, severity/confidence calibration, remediation patterns, framework/runtime caveats)
- **Validation**: Structural validation passed (SKILL.md, SPEC.md, SOURCES.md complete with required sections)
- **Known gaps**: Cross-function data flow (limited), TypeScript version variance (low priority), framework patterns (opportunistic), incorrect type annotations (trust unless contradictory evidence)
