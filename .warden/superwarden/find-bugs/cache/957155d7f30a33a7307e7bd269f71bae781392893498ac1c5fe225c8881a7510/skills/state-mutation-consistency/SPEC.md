# state-mutation-consistency Specification

## Intent

This child skill detects state mutation and consistency errors in TypeScript code that cause incorrect state, race conditions, or stale data. It focuses on:

1. Partial state updates leaving objects in inconsistent states
2. Mutation of shared state without synchronization
3. Incorrect ordering of state changes violating invariants
4. Stale closure references capturing values that later change
5. Mutation of objects assumed immutable by other code
6. Missing deep cloning when creating defensive copies

The skill is scoped to changed hunks and requires concrete changed-line evidence of mutations that violate consistency, immutability patterns, or concurrency invariants.

## Scope

**In scope:**

- Object mutations, class property updates, module-level variable assignments in changed hunks
- Partial updates that modify related properties asymmetrically
- Shared state (module variables, class statics, singleton instances) mutated without locks
- State transitions that violate ordering invariants (flags set too early, caches cleared prematurely)
- Closures (callbacks, event handlers, React hooks) capturing mutable variables
- Mutation of readonly-typed objects, function parameters, cached objects
- Shallow copies when nested mutations occur

**Out of scope:**

- Style preferences for immutability patterns (spread vs Object.assign vs libraries)
- State mutations in unchanged code unless directly relevant to changed-line bugs
- Architectural concerns about state management strategy
- Performance impact of immutability or cloning

## Users And Trigger Context

**Primary users:** Developers reviewing TypeScript code changes for logical errors in state mutation, React hooks, or concurrent async operations.

**Trigger language:** "state mutation", "race condition", "stale closure", "inconsistent update", "partial state", "shared state", "immutability violation"

**Should not trigger for:** Style reviews, performance optimization, architecture refactoring

## Runtime Contract

**Execution agent must:**

1. Read `tsconfig.json`, `package.json`, and repository source to understand immutability conventions, state management libraries, and synchronization patterns
2. Grep for React hooks, state management libraries, readonly modifiers, Object.freeze, semaphores, locks
3. Trace data flow and control flow from changed lines to identify mutations, partial updates, shared state, closures
4. Use WebSearch or WebFetch for public React hooks patterns, state library mutation rules, TypeScript immutability best practices
5. Prohibit sending repository code, secrets, private paths, or proprietary details to web tools
6. Anchor findings to changed line numbers with concrete data-flow or control-flow evidence
7. Return findings only when mutation can cause observable inconsistency, race condition, or staleness
8. Use Warden's standard finding schema; return zero findings when evidence is insufficient

## Source And Evidence Model

**Required local sources:**

- `tsconfig.json` for strict mode, readonly enforcement
- `package.json` for immutability libraries (immer, immutable.js) and state management (Redux, MobX, Zustand)
- Changed hunks for state mutations, closures, partial updates
- Repository source for synchronization patterns (semaphores, locks), immutability conventions (Object.freeze, readonly usage)
- React hook patterns (useState, useEffect, useCallback, useRef)

**Permitted external sources:**

- Public React hooks best practices (stale closure patterns, dependency arrays, functional setState)
- Public state management library documentation (Redux immutability, MobX observables, Zustand updates)
- Public TypeScript immutability patterns (readonly, Object.freeze, const assertions)
- Public JavaScript concurrency guidance (Promise.all races, async/await ordering)

**Prohibited external queries:**

- Repository code excerpts
- Private file paths
- Secrets, credentials, API keys
- Proprietary implementation details

## Reference Architecture

### Warden Repository Context

Based on local inspection:

- **TypeScript configuration:** strict mode enabled (`tsconfig.json` has `"strict": true`), includes `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`
- **State management:** No Redux, MobX, Zustand, or Jotai in `package.json`; uses React hooks (Ink components), class-based state, and functional patterns
- **Immutability patterns:** Grep shows `readonly` modifiers on class properties, `Readonly<T>` types, `ReadonlySet`, `as const` assertions; no widespread `Object.freeze` usage
- **Concurrency primitives:** Custom `Semaphore` class in `src/utils/async.ts` for async concurrency control
- **React hooks:** Ink components in `src/cli/output/*.tsx` use `useState`, `useEffect`, `setInterval` with cleanup, functional setState patterns
- **Shared state:** Module-level constants (readonly sets, configuration), class instances passed through constructors, no global mutable singletons observed

### Common Patterns Observed

1. **Correct functional setState:** `setFrame((f) => (f + 1) % SPINNER_FRAMES.length)` in `live-status.tsx` and `ink-runner.tsx`
2. **Correct useEffect cleanup:** `return () => clearInterval(timer)` consistently used for timers
3. **Immutable configuration:** `VALID_REVIEW_STATES: ReadonlySet<string>` in `review-state.ts`
4. **Semaphore synchronization:** `Semaphore` class used to limit concurrent file processing
5. **Object spread updates:** `skillStates[idx] = { ...existing, ...updates }` for immutable updates

### Fixture Evidence

The repository includes a stale closure eval fixture at `evals/fixtures/stale-closure/counter.tsx`:

```tsx
useEffect(() => {
  // Bug: This closure captures `count` once at mount time.
  const id = setInterval(() => {
    setCount(count + step); // Should use functional form: setCount(c => c + step)
  }, intervalMs);
  return () => clearInterval(id);
}, []); // Empty deps array - count is stale
```

This demonstrates the repository maintainers are aware of stale closure issues and expect detection.

## Evaluation

**Lightweight validation:**

1. Run the skill against the stale closure fixture: should detect `setCount(count + step)` as a stale closure
2. Run against `ink-runner.tsx`: should report zero findings (uses functional setState correctly)
3. Run against `async.ts` Semaphore class: should report zero findings (synchronization primitive itself)

**Behavioral validation:**

1. Inject a partial state update bug (update one property without related property) and verify detection
2. Inject a shared state mutation without semaphore and verify detection
3. Inject an Object.assign shallow copy before nested mutation and verify detection

**Acceptance criteria:**

- Detects stale closure in eval fixture with changed-line evidence
- Does not report false positives on correct functional setState or useEffect cleanup
- Provides concrete remediation (functional setState, dependency array, semaphore usage)
- Severity and confidence calibrated to evidence strength

## Known Limitations

1. **Concurrency model inference:** Cannot always determine if concurrent access is possible without runtime profiling; reports likely race conditions with medium confidence when async operations are present
2. **Immutability convention detection:** Relies on TypeScript types and local grep patterns; may miss convention violations if patterns are inconsistent across the codebase
3. **Deep clone necessity:** Difficult to prove nested mutations will occur without dynamic analysis; reports missing deep cloning when shallow copy precedes nested property access
4. **State machine invariants:** Cannot infer all state transition rules without explicit documentation or guards; reports obvious ordering violations but may miss domain-specific invariants
5. **Framework-specific patterns:** React hooks best practices evolve (React 19+ useEffectEvent); external research helps but may lag behind latest releases

## Maintenance Notes

**Update triggers:**

- React releases new hook APIs (useEffectEvent, useTransition patterns)
- State management libraries change mutation rules (Redux Toolkit, Zustand middleware)
- TypeScript adds new immutability features (const type parameters, exact types)
- Warden repository adopts new state management libraries or concurrency primitives
- Eval suite adds new state mutation fixtures

**Calibration:**

- If false positives on intentional snapshots: add evidence requirements for "mutation can cause observable inconsistency"
- If false negatives on subtle races: lower confidence threshold for concurrent async operations
- If severity mismatches impact: recalibrate based on production incidents tracked in Warden issues

**External source updates:**

- Re-run WebSearch for React hooks best practices annually or after major React releases
- Re-run WebSearch for TypeScript immutability patterns after TypeScript major versions
- Update state management library mutation rules when Warden repository adopts new libraries
