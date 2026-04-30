# type-system-misuse Specification

## Intent

Detect logical errors in TypeScript type system usage that hide runtime type errors. This child skill focuses on unsafe type assertions, incorrect type narrowing, and escape hatches (`any`, `as`, non-null assertions) that bypass TypeScript's compile-time type checking and can cause runtime failures.

The skill is scoped to **changed code only** and requires **concrete data-flow evidence** for each finding.

## Scope

**In scope:**

- Type assertions (`as`, angle-bracket syntax) not justified by runtime evidence
- Non-null assertions (`!` operator) without guards or invariants
- Explicit `any` usage disabling type checking for type-sensitive operations
- Incorrect type guards (missing checks, wrong return types, incomplete narrowing)
- Unsafe type casting (widening types, losing type information)
- Reliance on TypeScript types for runtime validation without runtime checks
- Changed lines in `.ts` and `.tsx` files

**Out of scope:**

- Style preferences for type syntax (interface vs type, etc.)
- Type assertions or `any` in unchanged code unless directly relevant
- Architectural concerns about type design or hierarchy
- Missing strict compiler options unless causing a bug in changed code
- Type errors already caught by TypeScript compiler
- Library type definition issues (report usage bugs, not upstream type bugs)

## Users And Trigger Context

**Primary users:**

- Warden maintainers running Superwarden skills on TypeScript codebases
- Automated review workflows analyzing pull requests
- Manual audits of type-safety in TypeScript projects

**Trigger context:**

- User runs parent skill `find-bugs` on TypeScript files
- Superwarden expands into focused child tasks including `type-system-misuse`
- Changed hunks contain type assertions, non-null assertions, `any` usage, or type guards

**Should not trigger for:**

- Non-TypeScript files (`.js`, `.json`, etc.)
- Type system design discussions (use architecture review instead)
- Style-only reviews (use linting tools instead)

## Runtime Contract

**Inputs:**

- Changed file hunks with TypeScript code
- Repository context (tsconfig.json, linting config, existing patterns)
- Parent task scope and evidence requirements from Superwarden plan

**Required investigation:**

1. Read `tsconfig.json` for strict mode and type-safety options
2. Read linting configuration for type assertion rules and conventions
3. Grep for existing type assertion, non-null assertion, and type guard patterns
4. Read changed files and trace data flow from sources to unsafe operations
5. Verify absence of runtime checks (guards, validation, defensive code)
6. Consult public TypeScript documentation for narrowing and type system behavior

**Outputs:**

- Standard Warden findings with `{"findings": [...]}`
- Each finding anchored to changed line number
- Data-flow evidence in `verification` field
- Concrete remediation in `suggestedFix` when applicable
- Empty findings array when evidence is insufficient

**Web tool usage:**

- Use WebSearch or WebFetch for public TypeScript documentation only
- Allowed: TypeScript Handbook, FAQ, official Microsoft docs, well-known TypeScript guides
- **Prohibited**: Sending repository code, file paths, secrets, or proprietary details to web tools

## Source And Evidence Model

**Authoritative sources:**

| Source | Trust tier | Usage |
|--------|-----------|-------|
| `tsconfig.json` | canonical | Strict mode and type-safety configuration |
| `eslint.config.js`, `.eslintrc` | canonical | Linting rules and repository type assertion conventions |
| Changed file content | canonical | Type assertions, non-null assertions, `any` usage, type guards |
| TypeScript Handbook (Narrowing) | authoritative | Type narrowing behavior and best practices |
| TypeScript FAQ | authoritative | Common type system pitfalls and unsound patterns |

**Evidence requirements per finding:**

1. Changed line number with type assertion or escape hatch
2. Data-flow trace showing asserted type does not match runtime reality
3. Absence of runtime checks on all paths to unsafe operation
4. Description of potential runtime impact (TypeError, incorrect behavior, crash)
5. Reference to public TypeScript documentation when analyzing narrowing correctness

**Missing context handling:**

- If threat model is unknown (trusted vs untrusted data), note in finding rationale and calibrate severity conservatively
- If deployment environment is unknown, note how it might affect impact (e.g., serverless cold starts amplifying null reference crashes)
- If schema validation library usage is unclear, check imports and trace calls before reporting missing validation

## Reference Architecture

**Repository inspection flow:**

1. **Configuration layer**: Read `tsconfig.json` and linting config to understand project type-safety baseline
2. **Pattern layer**: Grep for existing type assertions, non-null assertions, and type guards to understand repository conventions
3. **Code layer**: Read changed files and trace data flow from type assertions to unsafe operations
4. **Validation layer**: Check for runtime guards, schema validation, and defensive programming
5. **Documentation layer**: Consult public TypeScript docs for narrowing and type system behavior

**Data-flow analysis:**

- **Sources**: Function parameters, object properties, API responses, JSON.parse results, process.env, user input
- **Sinks**: Property access, method calls, array indexing, arithmetic operations, string operations
- **Guards**: `typeof`, `instanceof`, `in`, user-defined type guards, schema validation (zod, joi, ajv), early returns

**Type assertion categories:**

1. **Downcast assertions**: `value as SpecificType` without checking discriminators
2. **Non-null assertions**: `value!` without null/undefined guards
3. **Any escape**: Typing as `any` to bypass type checking
4. **Incorrect guards**: Type predicates that don't validate required properties
5. **Unsafe widening**: Casting to `unknown` or union types and losing specificity

## Evaluation

**Lightweight validation:**

1. Run skill on repository with known type assertion patterns
2. Verify findings anchor to changed lines only
3. Confirm data-flow evidence is concrete and specific
4. Check that severity/confidence match evidence strength
5. Validate remediation suggestions are actionable

**Structural validation:**

1. All findings conform to Warden's Finding schema
2. `location.startLine` points to actual changed line with type assertion
3. `verification` field contains data-flow trace and missing check evidence
4. No findings reported for style preferences or architectural concerns

**Behavioral validation:**

1. Skill detects unsafe type assertions in changed code
2. Skill ignores correct assertions with runtime validation
3. Skill does not report unchanged code issues
4. Skill uses public TypeScript docs when analyzing narrowing
5. Skill returns empty findings when evidence is insufficient

**Acceptance gates:**

- No false positives on correct assertions with runtime checks
- No reports for style preferences (interface vs type, etc.)
- Severity calibration matches data source risk (external > internal)
- Remediation is concrete and actionable
- Public documentation references are relevant and current

## Known Limitations

1. **Data-flow precision**: Complex multi-function data flows may be difficult to trace accurately; skill focuses on direct flows within changed hunks
2. **Type inference limits**: TypeScript's control-flow narrowing is sophisticated; skill may miss cases where compiler proves type safety through complex inference
3. **Library type definitions**: Incorrect library types can make assertions appear unsafe when they're actually required workarounds; skill focuses on code logic, not upstream type bugs
4. **Test file conventions**: Repositories often disable non-null assertion rules in tests; skill respects linting config and notes context rather than reporting as bugs
5. **Gradual typing migration**: Codebases migrating from JavaScript may have legitimate `any` usage during transition; skill reports missing validation but notes migration context when evident

## Maintenance Notes

**Update triggers:**

- TypeScript releases with new narrowing behavior (check Handbook updates)
- New schema validation libraries gain adoption (add to recognized validation patterns)
- Repository linting conventions change (re-check eslint config patterns)
- Parent Superwarden plan adds or removes coverage items (update scope)

**Calibration needs:**

- Monitor false positive rate on correct assertions with runtime checks
- Adjust severity thresholds based on actual runtime impact in production
- Refine data-flow analysis for common repository patterns
- Update public documentation references when TypeScript docs restructure

**Source refresh:**

- Re-validate TypeScript Handbook URL when major versions release
- Check TypeScript FAQ for new common pitfalls and unsound patterns
- Search for updated 2026+ guidance on type assertion best practices
- Review Warden finding schema updates for new fields or validation requirements
