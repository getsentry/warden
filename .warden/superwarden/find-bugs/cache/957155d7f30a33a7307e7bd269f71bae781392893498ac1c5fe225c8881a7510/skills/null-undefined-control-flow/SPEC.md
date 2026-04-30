# null-undefined-control-flow Specification

## Intent

This is a Superwarden child skill synthesized from the parent skill `find-bugs` and task `null-undefined-control-flow`.

The task intent is to detect missing null/undefined guards before property access, method calls, or array indexing that can cause runtime TypeErrors in TypeScript code. This skill focuses on logical control-flow errors where potentially nullable values reach unsafe operations without proper guards, leading to runtime crashes or incorrect behavior.

## Scope

**In scope:**

- Missing null/undefined checks before property access (dot notation, bracket notation)
- Missing guards before method calls on potentially nullable objects
- Missing guards before array indexing when `noUncheckedIndexedAccess` is enabled
- Unsafe destructuring of potentially null/undefined objects
- Incorrect type narrowing (e.g., truthiness checks that exclude `0` or `''`)
- Optional chaining or nullish coalescing with incorrect fallback behavior
- Non-null assertions (`!`) that contradict surrounding code evidence
- Type assertions that bypass null checks without runtime validation
- Array method results (`.find()`, `.shift()`, `.pop()`) used without guards
- Data flow from nullable sources (parameters, properties, API responses, config) to unsafe sinks

**Out of scope:**

- Style preferences for guard syntax (if vs optional chaining vs early return)
- Nullable values intentionally propagated with correct optional chaining
- Non-null assertions that are correct based on surrounding invariants
- Missing null checks in unchanged code unless directly relevant to understanding a changed-line bug
- Recommendations to enable strict null checks in tsconfig.json (report actual bugs instead)
- Missing comments or documentation about null handling
- Broader architectural concerns about error handling or API design

## Users And Trigger Context

**Primary users:**

- Warden maintainers and contributors reviewing TypeScript code changes
- Automated PR review workflows analyzing null-safety of changed code
- Developers investigating runtime TypeErrors in production

**Common trigger scenarios:**

- User runs `warden <files> --skill find-bugs` and Superwarden expands to this child skill
- Automated PR check detects changed TypeScript files and runs null/undefined analysis
- Developer asks "find bugs" or "check for null errors" in Warden interface
- Incident investigation after production TypeError related to null/undefined

**Should not trigger for:**

- Style-only changes (formatting, renaming)
- Non-TypeScript files
- Test files that intentionally trigger null errors to verify error handling
- Changes that only add null checks without introducing new unsafe operations

## Runtime Contract

**Execution flow:**

1. Warden loads this child skill from Superwarden cache
2. Skill receives changed file hunks and repository context
3. Skill uses Read, Grep, Glob to inspect changed lines and surrounding code
4. Skill traces data flow from nullable sources to unsafe operations
5. Skill checks tsconfig.json for strict null check settings
6. Skill uses WebFetch to retrieve TypeScript narrowing documentation when analyzing guard correctness
7. Skill reports findings using Warden's standard schema
8. Skill returns empty findings array if no concrete evidence exists

**Required inputs:**

- Changed file hunks (provided by Warden harness)
- Repository root path (for reading tsconfig.json and tracing imports)
- File context (surrounding unchanged lines for data-flow analysis)

**Optional inputs:**

- TypeScript version (affects narrowing behavior, especially for template literals and const assertions)
- Framework context (e.g., React, Node.js) for framework-specific null handling patterns
- Deployment environment (affects impact severity: serverless timeout vs long-running server crash)

**Output contract:**

- Use Warden's standard `Finding` schema with required fields: `title`, `description`, `severity`, `confidence`, `location`
- Include `suggestedFix` when remediation is straightforward
- Use `additionalLocations` to reference nullable sources, incorrect guards, or related code
- Return empty array when evidence is insufficient
- Do not return findings for unchanged code unless directly relevant to changed-line analysis

**Privacy and security constraints:**

- Never send repository code, secrets, or private file paths to WebSearch or WebFetch
- Use only public TypeScript, framework, and library names in web queries
- Read local files freely using Read, Grep, Glob
- Reference public documentation URLs in findings for user verification

## Source And Evidence Model

**Authoritative sources:**

| Source | Trust tier | Usage |
|--------|-----------|-------|
| Changed file hunks | canonical | Primary evidence for bugs; only report findings in changed lines |
| tsconfig.json | canonical | Determines compile-time null check configuration |
| TypeScript type annotations in source | canonical | Shows declared nullable types (parameter types, return types, property types) |
| Repository code context (imports, function definitions) | canonical | Traces data flow from sources to sinks |
| TypeScript narrowing documentation | authoritative public | Validates guard correctness and narrowing behavior |

**Supporting sources:**

| Source | Trust tier | Usage |
|--------|-----------|-------|
| Framework documentation (React, Node.js) | authoritative public | Framework-specific null handling patterns |
| Library type definitions (@types packages) | high | Third-party API null/undefined contracts |
| TypeScript FAQ on common bugs | authoritative public | Known type system pitfalls and unsound patterns |

**Evidence requirements for findings:**

1. **Changed line number**: Must cite exact line in changed hunk
2. **Nullable source**: Must trace backward to function parameter, property, return value, or expression with nullable type
3. **Missing guard**: Must confirm no null/undefined check exists on all code paths
4. **Configuration status**: Must check tsconfig.json for strict null check settings
5. **Public documentation reference**: Must cite TypeScript narrowing docs when analyzing guard correctness

**Data flow analysis requirements:**

- Trace from source to sink within function scope (cross-function analysis is opportunistic)
- Handle control flow: if/else branches, early returns, switch statements, try/catch
- Recognize TypeScript narrowing: typeof, instanceof, in, equality checks, type predicates
- Identify incorrect narrowing: truthiness checks on numbers/strings, extracted boolean variables
- Track optional chaining propagation: `obj?.prop?.method()` can return undefined at any step

## Reference Architecture

**TypeScript null/undefined model:**

- `null` and `undefined` are distinct types in strict mode
- `strictNullChecks: true` (or `strict: true`) makes `null` and `undefined` not assignable to other types
- Optional properties (`prop?: T`) are typed as `T | undefined`
- Optional parameters (`param?: T`) are typed as `T | undefined`
- Array element access with `noUncheckedIndexedAccess: true` returns `T | undefined`
- Array methods `.find()`, `.shift()`, `.pop()` return `T | undefined`

**Narrowing mechanisms:**

- **Explicit null/undefined checks**: `if (value !== null)`, `if (value !== undefined)`, `if (value != null)`
- **Typeof guards**: `if (typeof value === 'object' && value !== null)` (typeof null is 'object')
- **Truthiness narrowing**: `if (value)` excludes `null`, `undefined`, `false`, `0`, `''`, `NaN`, `0n`
- **Optional chaining**: `obj?.prop` returns `undefined` if `obj` is null/undefined
- **Nullish coalescing**: `value ?? default` coalesces only `null` and `undefined`, not `0` or `''`
- **Type predicates**: `function isNonNull<T>(value: T | null): value is T { return value !== null; }`
- **Discriminated unions**: Literal property checks like `if (obj.kind === 'specific')`

**Common bug patterns:**

1. **Truthiness check on numbers/strings**: `if (value)` when value is `string | null` incorrectly excludes empty string
2. **Extracted boolean narrowing**: `const isString = typeof x === 'string'; if (isString)` does NOT narrow `x`
3. **Missing null check in typeof guard**: `if (typeof obj === 'object')` is true for `null`
4. **Unsafe array access**: `arr[0].property` without checking `arr[0]` is defined (when noUncheckedIndexedAccess is enabled)
5. **Non-null assertion without evidence**: `value!.property` when value may be null
6. **Optional chaining without undefined handling**: `const result = obj?.method(); result.property` assumes result is defined
7. **Incorrect guard scope**: Guard in one branch but not all branches reaching the unsafe access

**Warden TypeScript configuration (from tsconfig.json inspection):**

- `strict: true` (enables all strict checks including strictNullChecks)
- `noUncheckedIndexedAccess: true` (array/index access returns `T | undefined`)
- `noPropertyAccessFromIndexSignature: true` (requires bracket notation for index signatures)

These settings provide strong compile-time null safety, but runtime bugs are still possible through:

- Type assertions (`as`, `!`)
- External data not validated at runtime (JSON parsing, API responses)
- Gradual migration from non-strict code
- Bugs in this analysis: incorrect type annotations that don't match runtime reality

## Evaluation

**Lightweight validation:**

- Run `warden --skill find-bugs <test-file.ts>` with known null/undefined bugs
- Verify findings cite changed line numbers, nullable sources, and missing guards
- Verify no findings for correct optional chaining or explicit guards
- Verify severity/confidence calibration matches bug exploitability

**Structural validation:**

- Check SKILL.md contains task-id, parent reference, investigation requirements, evidence requirements, out-of-scope exclusions
- Check SPEC.md contains all required sections (Intent, Scope, Users And Trigger Context, Runtime Contract, Source And Evidence Model, Reference Architecture, Evaluation, Known Limitations, Maintenance Notes)
- Check SOURCES.md contains source inventory table, decisions, coverage matrix, open gaps, changelog

**Behavioral validation:**

- Create test TypeScript files with known null/undefined bugs (missing guards, incorrect truthiness checks, unsafe non-null assertions)
- Run Warden with this skill and verify findings match expected bugs
- Verify findings include correct line numbers, data-flow traces, and suggested fixes
- Verify no false positives on correct optional chaining or explicit guards
- Verify no findings on unchanged code

**Acceptance gates:**

- Findings must cite changed line numbers from hunks
- Findings must include data-flow trace from nullable source to unsafe operation
- Findings must include TypeScript narrowing documentation reference
- Findings must calibrate severity (high for likely null, medium for possible null, low for rare edge case)
- Findings must calibrate confidence (high for clear data flow, medium for uncertain guard, low for unclear type contracts)
- No findings when evidence is insufficient (uncertain nullable sources, unclear control flow)

## Known Limitations

**Cross-function data flow:**

- This skill performs intra-function data-flow analysis but limited cross-function tracing
- If a function returns a nullable value and the caller doesn't check, the skill may not detect this unless the unsafe access is in a changed line
- Workaround: Prioritize changed lines; flag nullable return values in changed functions and verify callers (opportunistic)

**External data validation:**

- TypeScript types for external data (JSON.parse, API responses) are unchecked at runtime
- This skill assumes type annotations match runtime reality unless contradictory evidence exists
- Workaround: Flag unsafe type assertions and recommend runtime validation (covered by parent task `input-validation-errors`)

**Framework-specific null handling:**

- Some frameworks provide null-safety guarantees (e.g., React hooks with default values)
- This skill uses public framework documentation but may not know all framework patterns
- Workaround: Use WebFetch to retrieve framework documentation when analyzing framework APIs; defer to user judgment for complex framework patterns

**Gradual strictness migration:**

- Repositories migrating to strict null checks may have many existing bugs in unchanged code
- This skill only reports changed-line bugs to avoid overwhelming users
- Workaround: Users can run Warden on entire files to find all null/undefined bugs, not just changed lines

**Type annotation accuracy:**

- This skill trusts type annotations unless contradictory evidence exists (defensive null checks, comments, conditional logic)
- If type annotations are incorrect (parameter documented as non-null but actually nullable), the skill may miss bugs
- Workaround: Look for contradictory evidence in surrounding code; flag inconsistent patterns

**Performance on large files:**

- Data-flow analysis across many branches and paths can be expensive
- This skill uses heuristic tracing (follow direct assignments and returns) rather than exhaustive path exploration
- Workaround: Focus on changed hunks; limit cross-function tracing depth

## Maintenance Notes

**Update triggers:**

- Update SKILL.md when TypeScript narrowing behavior changes (new TypeScript versions, new narrowing mechanisms)
- Update SPEC.md when Warden schema or runtime contract changes
- Update SOURCES.md when new public sources are consulted or coverage gaps are identified
- Regenerate child skill when parent task scope changes

**Source dependencies:**

- TypeScript narrowing documentation: https://www.typescriptlang.org/docs/handbook/2/narrowing.html (primary reference)
- TypeScript FAQ on common bugs: https://github.com/microsoft/TypeScript/wiki/FAQ#common-bugs-that-arent-bugs (secondary reference)
- Framework-specific docs: retrieved dynamically via WebFetch when analyzing framework APIs

**Coverage tracking:**

- Track false positive rate: findings that users mark as incorrect
- Track false negative rate: known null/undefined bugs missed by this skill
- Track severity/confidence calibration accuracy: do high-severity findings actually cause runtime crashes?
- Track suggested fix acceptance rate: do users apply the suggested fixes or modify them?

**Changelog:**

- Record parent task updates, source changes, coverage expansions, and validation results in SOURCES.md
- Tag each entry with date and validator identity
