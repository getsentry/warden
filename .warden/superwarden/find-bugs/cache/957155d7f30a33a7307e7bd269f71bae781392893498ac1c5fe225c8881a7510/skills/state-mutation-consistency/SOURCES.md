# state-mutation-consistency Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|------------|------------|--------------|-------------------|
| `tsconfig.json` | canonical | high | TypeScript strict mode and type checking configuration | Read-only, public project file |
| `package.json` | canonical | high | Dependency inventory for state management and immutability libraries | Read-only, public project file |
| Changed hunks | canonical | high | State mutations, closures, partial updates in code under review | Never send to web tools |
| `src/utils/async.ts` | canonical | high | Repository concurrency primitives (Semaphore class) | Internal source, never send to web tools |
| `src/cli/output/*.tsx` | canonical | high | React hook patterns (useState, useEffect, cleanup) | Internal source, never send to web tools |
| `evals/fixtures/stale-closure/counter.tsx` | canonical | high | Known stale closure bug fixture for validation | Internal eval fixture, never send to web tools |
| React hooks best practices (external) | trusted | high | Stale closure patterns, dependency arrays, functional setState | Public documentation only |
| TypeScript immutability patterns (external) | trusted | high | readonly, Object.freeze, const assertions, DeepReadonly | Public documentation only |
| State management library docs (external) | trusted | medium | Redux immutability, MobX observables, Zustand updates | Public documentation only |
| JavaScript concurrency guides (external) | trusted | medium | Promise.all races, async/await ordering | Public documentation only |

## Decisions

### D1: Require changed-line anchoring for all findings

**Decision:** Every finding must cite a specific changed line containing the mutation, closure, or partial update.

**Rationale:** Warden's finding schema and diff-anchoring system require changed-line evidence. Speculative issues in unchanged code are out of scope.

**Sources:** Parent Superwarden plan evidence requirements, Warden finding schema.

### D2: Use functional setState as canonical stale closure remediation

**Decision:** Recommend `setState(prev => ...)` functional form as primary remediation for stale closures in React hooks.

**Rationale:**
- Observed in `live-status.tsx`: `setFrame((current) => (current + 1) % SPINNER_FRAMES.length)`
- Observed in `ink-runner.tsx`: `setFrame((f) => (f + 1) % SPINNER_FRAMES.length)`
- External source [How to Fix Stale Closure Issues in React Hooks](https://oneuptime.com/blog/post/2026-01-24-fix-stale-closure-issues-react-hooks/view) confirms functional updates as best practice

**Sources:** Local Warden patterns, external React hooks guides.

### D3: Infer concurrency from async operations when synchronization primitives exist

**Decision:** When repository uses semaphores or locks elsewhere, report shared state mutations without synchronization as likely race conditions.

**Rationale:**
- Warden has `Semaphore` class in `src/utils/async.ts` for concurrent file processing
- Presence of synchronization primitives indicates developers understand concurrency
- Missing synchronization on shared state is likely an oversight, not intentional

**Sources:** `src/utils/async.ts` Semaphore implementation, runPool concurrency patterns.

### D4: Respect TypeScript readonly as immutability signal

**Decision:** Treat `readonly` modifiers, `Readonly<T>` types, and `ReadonlySet`/`ReadonlyArray` as evidence that objects should not be mutated, even though TypeScript types don't prevent runtime mutation.

**Rationale:**
- Grep shows consistent `readonly` usage in Warden: `ReadonlySet<string>`, `readonly initialPermits`
- tsconfig.json has strict mode enabled with `noPropertyAccessFromIndexSignature`
- External source [TypeScript Readonly vs Object.freeze](https://www.webdevtutor.net/blog/typescript-readonly-vs-objectfreeze) explains readonly is compile-time intent

**Sources:** Local Warden readonly patterns, TypeScript documentation.

### D5: Stale closure fixture is validation ground truth

**Decision:** `evals/fixtures/stale-closure/counter.tsx` must be detected with high confidence.

**Rationale:**
- Fixture explicitly documents the bug: "This closure captures `count` once at mount time"
- Comment shows expected remediation: "should use functional form"
- Presence of eval fixture indicates maintainers expect detection

**Sources:** `evals/fixtures/stale-closure/counter.tsx` inline comments.

### D6: Prohibit sending repository code to web tools

**Decision:** Never send changed hunks, file paths, variable names, or implementation details to WebSearch or WebFetch.

**Rationale:**
- Parent Superwarden plan: "Do not send repository code, secrets, private file paths, or proprietary details to web tools"
- Child skill must use public framework/library names, vulnerability classes, and API concepts only

**Sources:** Parent plan instructions, Superwarden source-handling contract.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|-----------------|----------|
| Vulnerability prerequisites | complete | Partial updates, shared state, ordering violations, stale closures, immutability violations, shallow clones all have clear prerequisites |
| Exploitable dataflow examples | complete | Counter fixture for stale closure, ink-runner for correct patterns, async.ts for synchronization |
| False-positive controls | complete | Functional setState, useRef, correct dependency arrays, intentional snapshots excluded |
| Severity/confidence calibration | complete | High severity for race conditions and critical ordering violations, medium for partial updates, confidence tied to evidence strength |
| Remediation patterns | complete | Functional setState, dependency arrays, semaphores, spread/assign, deep clone libraries, state machines |
| Framework/runtime caveats | complete | React hooks (useEffectEvent in 19+), TypeScript readonly (compile-time only), Node.js event loop concurrency |
| API surface | complete | React hooks (useState, useEffect, useCallback, useRef), TypeScript types (readonly, Readonly, as const), Object.freeze, structuredClone |
| Config/runtime options | complete | tsconfig.json strict mode, React strict mode effects, state management library modes |
| Common use cases | complete | React component state, module configuration, concurrent file processing, event handlers, timers |
| Known issues/workarounds | complete | React 19+ useEffectEvent for non-dependency latest values, functional setState for closures, semaphores for shared state |
| Version/migration variance | partial | React 19+ useEffectEvent noted, but older React versions not explicitly covered; TypeScript 5.x assumed |

## Open Gaps

### G1: State machine invariant detection

**Gap:** Cannot infer domain-specific state transition rules without explicit guards or documentation.

**Impact:** May miss ordering violations for complex state machines (e.g., "must be authenticated before authorized").

**Mitigation:** Report obvious ordering violations (flag before operation, cache before write) with high confidence; note unknown invariants in medium-confidence findings.

**Next steps:** If Warden adopts explicit state machine libraries (XState, ts-pattern), grep for state definitions and transition guards.

### G2: Deep clone necessity inference

**Gap:** Difficult to prove nested mutations will occur without dynamic analysis or explicit mutation patterns.

**Impact:** May report shallow copies as bugs when nested objects are not actually mutated.

**Mitigation:** Require evidence of nested property access or mutation after shallow copy; do not report shallow copy alone.

**Next steps:** If false positives occur, tighten evidence requirements to explicit nested mutations on subsequent lines.

### G3: React 19+ useEffectEvent coverage

**Gap:** External source [Understanding React's useEffectEvent](https://peterkellner.net/2026/01/09/understanding-react-useeffectevent-vs-useeffect/) describes React 19.2+ useEffectEvent for reading latest values without dependencies, but Warden repository uses React 18.x.

**Impact:** If Warden upgrades to React 19+, skill should recognize useEffectEvent as valid stale closure mitigation.

**Mitigation:** Current skill focuses on functional setState and useRef; add useEffectEvent recognition when Warden upgrades React.

**Next steps:** Monitor package.json for React version upgrades; re-run WebSearch for React 19+ patterns when upgrade occurs.

### G4: Worker thread true parallelism

**Gap:** Node.js Worker threads introduce true parallelism requiring stronger synchronization than event-loop async.

**Impact:** If Warden adopts Worker threads, current Semaphore class may be insufficient; need SharedArrayBuffer atomics or MessageChannel patterns.

**Mitigation:** Grep for worker_threads usage; if found, re-assess synchronization primitives and report missing atomics.

**Next steps:** Low priority; Warden currently uses single-threaded async concurrency only.

## Changelog

### 2026-04-30: Initial synthesis

- **Context:** Superwarden child skill synthesis for find-bugs parent, state-mutation-consistency task
- **Local sources inspected:**
  - `tsconfig.json`: strict mode, readonly enforcement
  - `package.json`: React, Ink, no Redux/MobX/Zustand
  - `src/utils/async.ts`: Semaphore class
  - `src/cli/output/*.tsx`: React hooks with functional setState, timer cleanup
  - `evals/fixtures/stale-closure/counter.tsx`: Stale closure fixture
- **External sources consulted:**
  - [How to avoid race conditions with asynchronous javascript](https://www.lorenzweiss.de/race_conditions_explained/)
  - [How to Fix Stale Closure Issues in React Hooks](https://oneuptime.com/blog/post/2026-01-24-fix-stale-closure-issues-react-hooks/view)
  - [Understanding React's useEffectEvent](https://peterkellner.net/2026/01/09/understanding-react-useeffectevent-vs-useeffect/)
  - [JavaScript's Object.freeze and TypeScript's Readonly](https://www.dalejefferson.com/articles/2019-06-12-object-freeze-typescript-readonly/)
  - [Invariant in TypeScript - GeeksforGeeks](https://www.geeksforgeeks.org/typescript/invariant-in-typescript/)
- **Detection rules:** 6 categories (partial updates, shared state, ordering, stale closures, immutability violations, shallow clones)
- **Severity calibration:** High for race conditions and critical ordering violations, medium for partial updates, low for cosmetic issues
- **Remediation patterns:** Functional setState, dependency arrays, semaphores, spread/assign, deep clone, state machines
- **Validation plan:** Stale closure fixture detection, zero false positives on correct patterns, concrete remediation
- **Open gaps:** State machine invariants, deep clone necessity, React 19+ useEffectEvent, Worker threads
