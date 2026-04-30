---
name: null-undefined-control-flow
description: "Detects missing null/undefined guards before property access, method calls, or array indexing that can cause runtime TypeErrors. Use when analyzing TypeScript code for unsafe operations on potentially nullable values."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

**Superwarden Child Skill**: null-undefined-control-flow

**Parent**: find-bugs

**Task**: Detect missing null/undefined guards before property access, method calls, or array indexing that can cause runtime TypeErrors.

## Your Role

You are analyzing TypeScript code for null and undefined control-flow errors that cause runtime failures. Find logical errors where code accesses properties, calls methods, or indexes into collections without verifying the target is not null or undefined.

## Investigation Requirements

**Deep repo-local investigation is mandatory:**

- Use Read, Grep, and Glob to inspect changed hunks, trace data flow from sources to sinks, check tsconfig.json for strict null check settings, and examine surrounding code for defensive patterns.
- Trace data flow from sources (function parameters, object properties, array elements, API responses, configuration values) to sinks (property access with dot or bracket notation, method invocation, array indexing, destructuring).
- Check whether TypeScript strict null checks are enabled in tsconfig.json; if `strict: true` or `strictNullChecks: true` is present, compile-time protection exists but runtime bugs are still possible through type assertions or external data.
- If strict null checks are disabled, this is evidence of missing compile-time protection and increases the likelihood of null/undefined bugs.

**Use public external sources when they affect correctness:**

- Use WebSearch or WebFetch for current public TypeScript narrowing documentation at https://www.typescriptlang.org/docs/handbook/2/narrowing.html to understand current narrowing behavior for typeof, instanceof, in, and user-defined type guards.
- Use public documentation for framework or library null-handling behavior when analyzing third-party APIs.

**Never send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, package, API, vulnerability class, and documentation names.**

## Analysis Steps

1. **Identify potentially unsafe operations in changed hunks:**
   - Property access with dot notation: `obj.property`
   - Bracket notation access: `obj[key]`
   - Method calls: `obj.method()`
   - Array indexing: `arr[index]`
   - Destructuring: `const { prop } = obj`

2. **Trace backward to find the nullable source:**
   - Function parameters with nullable types
   - Object properties that may be undefined
   - Array elements accessed with bracket notation (noUncheckedIndexedAccess makes these `T | undefined`)
   - Return values from functions that may return null/undefined
   - API responses or configuration values
   - Results from array methods like `.find()`, `.shift()`, `.pop()`

3. **Check for guards on all code paths:**
   - Explicit null checks: `if (value !== null)`, `if (value !== undefined)`, `if (value != null)`
   - Typeof guards: `if (typeof value === 'object' && value !== null)`
   - Truthiness checks: `if (value)` (but verify this is correct – truthiness excludes `0`, `''`, `false`, `NaN`, `0n`)
   - Optional chaining: `obj?.property` (verify fallback behavior is correct)
   - Nullish coalescing: `value ?? defaultValue` (verify default is appropriate)
   - Early returns: `if (!value) return;`
   - Type guards: user-defined `value is NonNullable<T>` predicates

4. **Verify guard correctness:**
   - Truthiness checks (`if (value)`) are incorrect for nullable numbers or strings because they exclude `0` and `''`. Report these unless the code explicitly needs to filter falsy values.
   - Type narrowing must use direct checks in the condition, not extracted to variables: `const isString = typeof x === 'string'; if (isString)` does NOT narrow `x`.
   - Guards must cover all code paths. If a function has multiple return statements or branches, verify each path has protection.
   - Optional chaining (`?.`) propagates `undefined` silently. Verify the calling code handles `undefined` results correctly.

5. **Analyze optional chaining and nullish coalescing:**
   - Optional chaining `obj?.method()` returns `undefined` if `obj` is null/undefined. Verify callers handle `undefined`.
   - Nullish coalescing `value ?? default` only coalesces `null` and `undefined`, not `0` or `''`. Verify this matches the intended behavior.
   - Chained optional access `obj?.prop?.method()` can hide bugs if intermediate undefined values are not expected.

6. **Check TypeScript configuration:**
   - Read tsconfig.json and check for `strict: true` or `strictNullChecks: true`.
   - If `noUncheckedIndexedAccess: true` is set (as in this repository), array element access returns `T | undefined` and requires guards.
   - Note configuration status in findings but focus on changed-line bugs, not configuration recommendations.

7. **Handle library functions:**
   - Do not assume library functions perform null checks unless their type signatures require non-nullable inputs.
   - For array methods like `.find()`, `.shift()`, `.pop()`, the return type is `T | undefined`. Verify guards exist before accessing properties.
   - For object property access, check if the property is optional (`prop?: string`) or if the object itself may be null/undefined.

8. **Distinguish intentional non-null assertions:**
   - Non-null assertions (`value!`) are intentional escape hatches. Only report these if surrounding code suggests the assertion is incorrect (e.g., defensive null checks in some callers but not others, or comments indicating uncertainty).
   - Type assertions (`as NonNullable<T>`) are similar. Report only if evidence contradicts the assertion.

## Evidence Requirements

**Report findings only when you have concrete evidence:**

- The changed line contains an unsafe access (property, method, index, destructure)
- Data-flow analysis shows a nullable source reaches that access
- No guard exists on all paths to the unsafe operation
- The guard (if present) is incorrect (e.g., truthiness check for numeric/string types)

**Each finding must cite:**

1. Changed line number containing the unsafe operation
2. The nullable or undefined source (parameter, property, return value, or expression)
3. Concrete evidence that no null/undefined guard exists on all paths
4. TypeScript strict null check configuration status from tsconfig.json
5. Reference to public TypeScript narrowing documentation when analyzing guard correctness (use https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

**Missing context handling:**

If repository context is missing (e.g., whether a function parameter can be null in practice despite a non-nullable type annotation), note this in the finding rationale but do not report it as a bug **unless** the code itself contains contradictory evidence such as:

- Defensive null checks in some callers but not others
- Comments indicating the value may be null
- Conditional logic that only makes sense if the value can be null
- Recent changes removing a null check

## Out of Scope

**Do not report:**

- Style preferences for guard syntax (if vs optional chaining vs early return)
- Nullable values that are intentionally propagated with correct optional chaining
- Non-null assertions (`!`) that are correct based on surrounding invariants
- Missing null checks in unchanged code unless directly relevant to understanding a changed-line bug
- Suggestions to enable strict null checks (report actual bugs in changed code instead)
- Missing comments or documentation about null handling

## Severity and Confidence Calibration

**Severity:**

- **high**: Direct property access or method call on a value that is very likely null/undefined (e.g., array `.find()` result without guard, optional parameter without check)
- **medium**: Property access on a value that may be null/undefined in some code paths (e.g., conditional assignment, object property that may be undefined)
- **low**: Rare edge case where null/undefined is theoretically possible but very unlikely (e.g., well-known library returning null only in documented error cases)

**Confidence:**

- **high**: Clear data flow from nullable source to unsafe access with no guards, and TypeScript configuration confirms strict null checks are disabled or bypassed
- **medium**: Nullable source reaches access but guard may exist in parent function or calling code is unclear
- **low**: Type annotations suggest non-null but runtime behavior is uncertain, or guard exists but may be incorrect

## Remediation Expectations

**Suggested fixes should:**

1. Add explicit null/undefined checks before the unsafe operation
2. Use appropriate guard syntax:
   - `if (value !== null && value !== undefined)` or `if (value != null)` for explicit checks
   - `if (typeof value === 'object' && value !== null)` for object type guards
   - `value?.property` for optional chaining when undefined propagation is acceptable
   - `value ?? defaultValue` for nullish coalescing when a default is appropriate
3. Avoid truthiness checks (`if (value)`) for nullable numbers or strings unless filtering falsy values is intended
4. Handle both null and undefined unless the code guarantees only one is possible
5. Add early returns or throw errors for invalid null/undefined states when recovery is not possible

**Example remediation patterns:**

```typescript
// Before: unsafe access
function getLength(arr: number[] | null) {
  return arr.length; // TypeError if arr is null
}

// After: explicit guard with early return
function getLength(arr: number[] | null) {
  if (arr === null) {
    throw new Error('Array cannot be null');
  }
  return arr.length;
}

// Or: optional chaining with default
function getLength(arr: number[] | null) {
  return arr?.length ?? 0;
}
```

```typescript
// Before: incorrect truthiness check
function processValue(value: string | null) {
  if (value) { // Wrong: excludes empty string
    return value.toUpperCase();
  }
  return '';
}

// After: explicit null check
function processValue(value: string | null) {
  if (value !== null) {
    return value.toUpperCase();
  }
  return '';
}
```

## Framework and Runtime Caveats

- **TypeScript types are compile-time only.** Type annotations do not provide runtime validation. External data (JSON parsing, API responses, user input) may violate type contracts.
- **Array element access with `noUncheckedIndexedAccess: true`** (enabled in this repository) makes `arr[i]` return `T | undefined`. Always guard array access or use `.at()` method.
- **Optional chaining short-circuits.** `obj?.method?.()` stops at the first null/undefined and returns undefined. Verify calling code handles undefined.
- **Non-null assertions are unchecked.** The `!` operator bypasses TypeScript's null checks. Use only when you have proof the value is non-null.
- **Strict mode configuration.** Check tsconfig.json for `strict` or `strictNullChecks`. If disabled, the repository accepts more null/undefined bugs at compile time.

## Output Contract

**Use Warden's standard finding schema.** Do not invent a custom output format.

- Report findings only when you have concrete evidence as defined above.
- Return no findings when evidence is insufficient.
- Each finding must include: `title`, `description`, `severity`, `confidence`, `location` (with `path`, `startLine`, `endLine`), and optionally `suggestedFix`.
- Use `additionalLocations` to reference related code (e.g., the nullable source definition, incorrect guards in other functions).
- Include reasoning in the `description` field: cite the nullable source, the missing guard, and the potential runtime impact (TypeError, crash, incorrect behavior).

## Example Finding Structure

```json
{
  "title": "Missing null guard before property access on 'user'",
  "description": "Line 45 accesses 'user.name' without verifying 'user' is not null. The 'user' parameter is typed as 'User | null' (line 42), and no null check exists on the path from the function entry to this access. TypeScript strict null checks are enabled (tsconfig.json line 9), but this access bypassed compile-time protection through a type assertion on line 43. Runtime impact: TypeError if 'user' is null.\n\nAccording to TypeScript narrowing documentation (https://www.typescriptlang.org/docs/handbook/2/narrowing.html), type assertions do not provide runtime narrowing. Add an explicit null check before accessing 'user.name'.",
  "severity": "high",
  "confidence": "high",
  "location": {
    "path": "src/user-service.ts",
    "startLine": 45,
    "endLine": 45
  },
  "suggestedFix": {
    "description": "Add explicit null check before property access",
    "diff": "--- a/src/user-service.ts\n+++ b/src/user-service.ts\n@@ -42,6 +42,9 @@\n function greetUser(user: User | null) {\n   const u = user as User; // unsafe assertion\n+  if (u === null) {\n+    throw new Error('User cannot be null');\n+  }\n   console.log(u.name);\n }"
  },
  "additionalLocations": [
    {
      "path": "src/user-service.ts",
      "startLine": 42,
      "endLine": 42,
      "description": "Parameter 'user' is declared as nullable here"
    },
    {
      "path": "src/user-service.ts",
      "startLine": 43,
      "endLine": 43,
      "description": "Unsafe type assertion bypasses null check"
    }
  ]
}
```
