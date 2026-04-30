# error-handling-logic-errors Specification

## Intent

This child skill detects logical errors in TypeScript error handling and recovery code that can cause:

- **Silent failures**: Errors swallowed in catch blocks, preventing callers from detecting failures.
- **Resource leaks**: File handles, database connections, timers, event listeners, or child processes not cleaned up on error paths.
- **Invalid state**: State mutations before error-prone operations without rollback, leaving objects inconsistent after errors.
- **Lost error context**: Re-throwing errors without preserving original stack traces, error codes, or cause chains.

The skill focuses on **changed lines** in try/catch/finally blocks, error checks, cleanup code, and resource acquisition.

## Scope

### In Scope

1. **Empty catch blocks or catch blocks that log but do not propagate or recover**.
2. **Incorrect error type checks**: Using string matching on error messages instead of error codes or instanceof checks; failing to narrow `unknown` catch variables.
3. **Missing finally blocks or cleanup code** for file handles, database connections, timers, event listeners, child processes, streams, or AbortController signals.
4. **State mutations before error-prone operations** without rollback or compensation.
5. **Re-throwing errors with lost context**: `throw new Error(message)` without `{ cause: originalError }`.
6. **Returning success values or default values from catch blocks** when callers expect errors to propagate.

### Out of Scope

- Style preferences for error handling syntax (throw vs return error values, async/await vs .then/.catch).
- Missing error handling in unchanged code unless directly relevant to understanding a changed-line bug.
- Architectural concerns about error boundary placement or centralized error logging.
- Error message wording or localization.

## Users And Trigger Context

- **Primary users**: Warden maintainers running the parent "find-bugs" Superwarden skill.
- **Trigger context**: The parent Superwarden skill decomposes "find logical errors" into focused child skills, including this one.
- **Common scenarios**: Analyzing pull requests or commit diffs for error handling bugs in TypeScript code.

## Runtime Contract

- **Input**: Changed hunks from git diffs (unified diff format with line numbers).
- **Output**: Warden findings in the standard Warden report schema (not a custom format).
- **Tools**: Read, Grep, Glob for repository-local investigation; WebSearch, WebFetch for public framework/runtime documentation.
- **Constraints**:
  - Never send repository code, secrets, private file paths, or proprietary details to web tools.
  - Use only public framework names, package names, API names, and documentation URLs for external research.
  - Report findings only when concrete evidence meets the threshold (changed line, control-flow trace, caller expectation contradiction, impact description).
  - Return no findings when evidence is insufficient.

## Source And Evidence Model

### Authoritative Local Sources

1. **Changed hunks**: The primary source of error handling code to analyze (try/catch/finally, error checks, cleanup code).
2. **Repository error class hierarchy**: Custom error classes (grep for `class \w+Error extends`) and error wrapping patterns (grep for throw sites with `{ cause: ... }`).
3. **tsconfig.json**: TypeScript strict mode settings (`strict: true`, `useUnknownInCatchVariables: true`) affect catch variable types.
4. **Cleanup patterns**: Repository conventions for resource cleanup (grep for `finally`, `Symbol.dispose`, `Symbol.asyncDispose`, manual cleanup functions).
5. **Framework integration**: Framework-specific error handlers (Express middleware, React error boundaries) that changed code must integrate with.
6. **Call sites**: Callers of functions with changed error handling, to infer caller expectations (grep for function name, inspect return types and error handling at call sites).

### Authoritative External Sources

1. **TypeScript error handling documentation**: TypeScript handbook on try/catch, unknown catch variables, type narrowing in catch blocks.
2. **Node.js resource cleanup patterns**: Node.js documentation on file handles (fs module), streams, timers, event listeners, child processes, AbortController.
3. **Framework error handling contracts**: Express error middleware documentation, React error boundary documentation, framework-specific patterns.
4. **ECMAScript explicit resource management proposal**: Symbol.dispose, Symbol.asyncDispose, `using` and `await using` keywords (TC39 proposal, V8 blog, MDN).

### Data Not to Store

- Repository code excerpts (beyond line numbers and issue descriptions).
- Private file paths, secrets, API keys, or proprietary error messages.
- Full stack traces or debug output from repository runs.

## Reference Architecture

### Error Handling Analysis Workflow

1. **Identify error handling in changed hunks**: Grep for `try`, `catch`, `finally`, `.catch(`, error checks.
2. **Trace control flow**: For each error handling site, trace success, error, early return, and re-throw paths.
3. **Check repository conventions**: Inspect error class hierarchy, cleanup patterns, framework integration.
4. **Check TypeScript strict mode**: Read tsconfig.json for `strict` or `useUnknownInCatchVariables`.
5. **Trace error propagation**: If a function catches errors, grep for call sites to infer caller expectations.
6. **Check resource cleanup**: Grep for resource acquisition (file opens, connections, timers) and verify cleanup on all paths.
7. **Apply false-positive controls**: Check for intentional error suppression (comments, function contracts), framework-provided cleanup.
8. **Calibrate confidence and severity**: High confidence for critical paths and scarce resources; medium confidence when deployment context is unknown; low confidence when caller expectations are ambiguous.
9. **Generate findings**: Report only when evidence meets the threshold; include changed line, control-flow trace, caller expectation contradiction, impact, and remediation.

### Error Class Hierarchy Example (from source inspection)

The Warden repository uses custom error classes:

- `SkillRunnerError` with optional `code` property (ErrorCode).
- `WardenAuthenticationError` for authentication failures.
- `CoordinatorPlanError`, `CoordinatorChildSkillError`, `StructuredSuperwardenAgentError` for coordinator errors.
- `ConfigLoadError`, `EventContextError`, `SkillLoaderError`, `ExecError`, `ActionFailedError`, `UserAbortError` for domain-specific errors.

Error wrapping pattern: `throw new CustomError(message, { cause: originalError })`.

### Cleanup Patterns (from source inspection)

- The repository uses **manual cleanup** with try/catch/finally blocks (e.g., `src/utils/exec.ts` does not use Symbol.dispose).
- No evidence of `using` or `await using` keywords in current codebase.
- Resource cleanup is expected in finally blocks or on all control-flow paths.

### Framework Integration (from source inspection)

- **Sentry telemetry**: Intentional error suppression in Sentry tracing code (`src/sentry.ts`): empty catch blocks with comment "Never break the workflow".
- **Express or framework middleware**: Not found in source inspection; if present in future, route handlers should throw or call `next(err)`.

## Evaluation

### Lightweight Validation

- Run the child skill against known error handling bugs (test fixtures with swallowed errors, missing cleanup, lost context).
- Verify findings cite changed line numbers, control-flow traces, and impacts.
- Verify no findings for correct error handling (proper cleanup, error wrapping with cause, intentional suppression with justification).

### Structural Validation

- Confirm findings use Warden's standard report schema (not a custom format).
- Confirm no repository code, secrets, or private file paths appear in findings.
- Confirm external sources are public documentation URLs only.

### Behavioral Validation

- Run against real Warden pull requests with error handling changes.
- Confirm findings describe concrete bugs (silent failures, resource leaks, invalid state, lost context).
- Confirm no false positives for intentional error suppression, framework-provided cleanup, or correct error wrapping.

### Acceptance Gates

- Findings cite changed line numbers, not unchanged code.
- Findings include control-flow traces showing error swallowing, missing cleanup, or incorrect propagation.
- Findings describe caller expectation contradictions (inferred from call sites, function contracts, or framework integration).
- Findings describe potential impact (silent failure, resource leak, invalid state, lost context).
- No findings when evidence is insufficient (caller expectations ambiguous, deployment context missing).

## Known Limitations

1. **Deployment context unknown**: The skill cannot determine whether the repository is a short-lived CLI script (where resource leaks may be tolerable) or a long-lived server (where resource leaks cause exhaustion). Findings note this ambiguity when relevant.

2. **Framework integration inference**: If the repository uses a framework with automatic error boundaries (Express, React), but the integration is not evident from local source inspection, the skill may under-report or over-report integration bugs. The skill notes missing framework context in findings.

3. **Caller expectation inference**: When a function's error handling contract is not documented (no JSDoc, no explicit return type), the skill infers caller expectations from call sites. If call sites are inconsistent or missing, confidence is reduced.

4. **TypeScript catch variable type**: The skill checks tsconfig.json for `strict` or `useUnknownInCatchVariables` to determine catch variable type. If tsconfig.json is missing or ambiguous, the skill assumes `unknown` (safe default).

5. **Async error propagation**: The skill traces async error propagation (missing `await`, unhandled rejections) but does not detect all race conditions or ordering bugs. Those are covered by the sibling "async-control-flow-errors" child skill.

6. **Resource cleanup patterns**: The skill detects missing cleanup for common Node.js resources (file handles, timers, event listeners, connections). It does not detect missing cleanup for uncommon or custom resources unless they follow standard patterns (Symbol.dispose, finally blocks).

## Maintenance Notes

### When to Update This Skill

- **TypeScript language changes**: If TypeScript changes catch variable default types or adds new error handling syntax, update the skill to reflect current behavior and cite updated documentation.

- **Node.js resource management changes**: If Node.js adds new resource cleanup APIs (e.g., standardizes Symbol.dispose for file handles, connections), update the skill to recognize and expect those patterns.

- **Framework adoption**: If the Warden repository adopts a framework with automatic error boundaries (Express, Fastify, NestJS), update the skill to check integration with that framework's error handling contracts.

- **Repository error class evolution**: If the Warden repository adds new error classes, error codes, or error wrapping patterns, update the skill to recognize and expect those conventions.

- **False positive feedback**: If users report false positives (correct error handling flagged as bugs), update false-positive controls and add examples to the skill.

### Regeneration Triggers

- Superwarden parent skill version change.
- Warden report schema change.
- Repository error handling convention change (new error classes, cleanup patterns).
- External documentation updates (TypeScript handbook, Node.js resource cleanup guides, TC39 explicit resource management proposal).

### Coverage Expansion

- Add detection for error handling in Promise chains (`.then().catch()`) if not covered by sibling skills.
- Add detection for error handling in callback-based async code (Node.js callback conventions) if the repository uses callbacks.
- Add detection for error handling in worker threads, child processes, or IPC if the repository uses those patterns.
