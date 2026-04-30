---
name: type-system-misuse
description: "Detects unsafe type assertions, incorrect type narrowing, and TypeScript escape hatches (any, as, non-null assertions) that hide runtime type errors. Use when analyzing TypeScript code for type system misuse that can cause runtime failures."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

# type-system-misuse

This is a Superwarden child skill for parent **find-bugs** and task **type-system-misuse**.

## Objective

Detect use of unsafe type assertions, incorrect type narrowing, type system escape hatches (`any`, `as`, non-null assertions) that hide runtime type errors in TypeScript code.

## Investigation Requirements

### Local Repository Investigation

**You MUST perform deep repo-local investigation using Read, Grep, and Glob:**

1. **Read `tsconfig.json`** to confirm strict mode configuration:
   - Check `strict: true` and related strict flags (`strictNullChecks`, `noImplicitAny`)
   - Note if strict mode is disabled—this is evidence of reduced compile-time protection
   - Check `noUncheckedIndexedAccess` and other type-safety options

2. **Read linting configuration** (eslint.config.js, .eslintrc, etc.):
   - Check for `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`, and related rules
   - Note if non-null assertions are disabled in test files (common pattern)
   - Identify any project-specific type assertion conventions

3. **Grep for existing type assertion patterns** in the repository:
   - Search for `\sas\s` to find type assertions using `as` keyword
   - Search for `!` (non-null assertion operator) usage patterns
   - Search for `: any\b` to find explicit `any` type annotations
   - Search for user-defined type guards: `function is[A-Z].*: .* is `
   - Search for `typeof`, `instanceof`, and `in` operators to understand type narrowing patterns

4. **Read changed files and surrounding context**:
   - Trace data flow from sources (function parameters, API responses, parsed JSON, configuration) to sinks (property access, method calls, operations assuming specific types)
   - Identify runtime checks (if statements, guards, validation libraries like zod)
   - Look for schema validation usage (zod, joi, ajv) and confirm it precedes unsafe operations

### External Public Sources

Use **WebSearch or WebFetch for current public documentation** when external TypeScript behavior affects findings:

- TypeScript narrowing behavior: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Common TypeScript type system pitfalls: https://github.com/microsoft/TypeScript/wiki/FAQ#common-bugs-that-arent-bugs
- Type assertion best practices and unsafe patterns (search for current 2026 guidance)
- Type guard implementation requirements and return type predicates

**CRITICAL: Do NOT send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, TypeScript language, and vulnerability class names when searching.**

## Analysis Scope

Inspect **changed hunks only** for:

1. **Unsafe type assertions (`as`, angle-bracket syntax)**:
   - Type assertions not justified by runtime evidence or control flow
   - Downcasting to more specific types without validation
   - Casting nullable types to non-nullable without guards
   - Assertions that contradict surrounding code or data flow

2. **Non-null assertions (`!` operator)**:
   - Assumptions that values are non-null without guards or checks
   - Non-null assertions on optional properties, array access, or nullable function returns
   - Missing evidence that the value is guaranteed non-null by invariants

3. **Explicit `any` usage**:
   - `any` typed values flowing into type-sensitive operations (property access, method calls, indexing)
   - `any` disabling type checking for critical data paths (user input, API responses, parsed data)
   - Missing runtime validation when `any` is used for external data

4. **Incorrect type guards**:
   - `typeof` checks that don't cover all union members
   - User-defined type guards with incorrect return types (not `x is Type`)
   - Type guards that don't actually validate required discriminator properties
   - Missing checks for required properties to distinguish union members

5. **Unsafe type casting**:
   - Widening types unsafely (casting specific error types to `unknown`, losing type information)
   - Casting to union members without checking discriminators
   - Using type assertions instead of proper type narrowing

6. **Runtime vs compile-time mismatch**:
   - Reliance on TypeScript types for runtime validation without runtime checks
   - Parsing or deserializing external data without schema validation
   - Type assertions on data from untyped sources (JSON.parse, process.env, user input)

## Evidence Requirements

**Each finding MUST include concrete evidence:**

1. **Changed line number** containing the type assertion, non-null assertion, `any` usage, or type guard
2. **Data-flow or control-flow trace** showing the asserted type does not match runtime reality:
   - Source of the value (parameter, property, return value, external data)
   - Path from source to unsafe operation
   - Evidence that runtime type can differ from asserted type
3. **Concrete evidence that no runtime check validates the type assumption**:
   - No `typeof`, `instanceof`, or `in` checks on relevant paths
   - No schema validation (zod, joi, ajv) before the assertion
   - No defensive programming patterns (early returns, guards)
4. **Description of potential runtime impact**:
   - TypeError ("Cannot read property X of null/undefined")
   - Incorrect behavior (wrong types causing logic errors)
   - Crash or unhandled exception
5. **Reference to public TypeScript documentation** when analyzing type narrowing correctness (TypeScript Handbook, FAQ)

## False Positive Controls

**DO NOT report:**

1. **Style preferences**:
   - Choice of `interface` vs `type` alias
   - Preference for one type syntax over another
   - Code formatting or naming conventions

2. **Correct type assertions**:
   - `as` syntax where surrounding code or invariants justify the assertion
   - Type assertions in test files where non-null assertions are explicitly allowed by linting config
   - Assertions backed by runtime checks on all paths

3. **Architectural concerns**:
   - Type hierarchy design decisions
   - Placement of type boundaries
   - Choice of type modeling approach

4. **Issues in unchanged code** unless directly relevant to understanding a changed-line bug

5. **Missing strict compiler options** unless they directly cause a bug in changed code (note configuration as context, don't report it as a finding)

## Severity and Confidence Calibration

**Severity:**

- **High**: Type assertion or `any` usage on external/untrusted data (API responses, user input, parsed JSON) flowing into critical operations without validation; non-null assertions on nullable external data
- **Medium**: Type assertions or escape hatches in internal data flows where runtime type mismatch is likely (incorrect union member assumptions, missing discriminator checks)
- **Low**: Type assertions with partial evidence of safety (some guards exist but not on all paths, or context suggests low probability of mismatch)

**Confidence:**

- **High**: Clear data-flow evidence shows runtime type differs from assertion; no runtime checks exist; public TypeScript documentation confirms the pattern is unsound
- **Medium**: Data-flow suggests type mismatch is likely; runtime checks may be missing on some paths; assertion pattern is generally discouraged
- **Low**: Assertion appears suspicious but surrounding context is incomplete; potential type mismatch without definitive evidence

## Remediation Guidance

For each finding, suggest **concrete, actionable fixes**:

1. **Replace type assertions with type guards**: Use `typeof`, `instanceof`, or `in` checks to narrow types safely
2. **Add runtime validation**: Use schema validation libraries (zod, joi, ajv) for external data
3. **Use optional chaining and nullish coalescing**: Replace non-null assertions with `?.` and `??` operators
4. **Fix type guard implementations**: Ensure return type is `x is Type` and all discriminator properties are checked
5. **Add defensive checks**: Use early returns or conditional blocks to validate assumptions before unsafe operations
6. **Enable strict TypeScript options**: If strict mode is disabled, recommend enabling it (note as context, not primary fix)

## Framework and Runtime Caveats

- **Zod usage**: If repository uses zod for schema validation, confirm schemas are actually used to validate data before assertions
- **Test files**: Repository may disable `@typescript-eslint/no-non-null-assertion` in test files—note this as context, not a bug
- **TypeScript version**: Type narrowing behavior may vary across TypeScript versions; use public documentation for current behavior
- **Compiler options**: `strict: true` enables multiple strict flags; check individual flags if `strict` is not set

## Output Contract

**Report findings using Warden's standard finding schema. Do NOT invent a custom output format.**

Return `{"findings": [...]}` with Finding objects containing:

- `id`, `severity`, `confidence`, `title`, `description`
- `location` with `path`, `startLine`, `endLine` (changed line number)
- `verification` field with data-flow trace and missing runtime check evidence
- Optional `suggestedFix` with concrete remediation

**If evidence is insufficient for a concrete finding, return `{"findings": []}` with no findings. Do not report speculative issues or style preferences.**

---

## Execution Checklist

Before reporting findings:

1. ✓ Read tsconfig.json and linting configuration
2. ✓ Grep for existing type assertion and type guard patterns
3. ✓ Trace data flow from changed lines to confirm type mismatch
4. ✓ Verify no runtime checks exist on all paths
5. ✓ Consult public TypeScript documentation for narrowing behavior
6. ✓ Calibrate severity based on data source (external vs internal)
7. ✓ Provide concrete remediation in each finding
8. ✓ Return standard Warden findings schema, not custom output
