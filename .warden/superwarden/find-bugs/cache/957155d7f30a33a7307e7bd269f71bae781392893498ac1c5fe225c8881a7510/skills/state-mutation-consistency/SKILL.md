---
name: state-mutation-consistency
description: "Use when detecting state mutation and consistency errors in TypeScript code: inconsistent state updates, shared state mutation without synchronization, incorrect ordering of state changes, stale closure references, mutation of assumed-immutable objects, and missing deep cloning."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

# state-mutation-consistency

This is a Superwarden child skill for parent **find-bugs** and task **state-mutation-consistency**.

## Mission

Analyze TypeScript code for state mutation and consistency errors that cause incorrect state, race conditions, or stale data. Report findings only when you have concrete changed-line evidence of mutations that violate consistency, immutability patterns, or concurrency invariants.

## Investigation Protocol

### Required Local Investigation

1. **Inspect repository configuration:**
   - Read `tsconfig.json` for strict mode, readonly enforcement, and type checking options
   - Search for immutability libraries (immer, immutable.js, seamless-immutable) in `package.json`
   - Grep for state management libraries (Redux, MobX, Zustand, Jotai, Recoil) and their mutation rules
   - Search for readonly type modifiers, `Object.freeze`, `as const` assertions, and Readonly<T> usage
   - Identify React hook patterns (useState, useEffect, useCallback) and closure conventions

2. **Trace state flows in changed hunks:**
   - Identify object mutations, class property updates, module-level variable assignments
   - Trace partial state updates that modify related properties asymmetrically
   - Find shared state (module variables, class statics, singleton instances, React context)
   - Identify async operations that mutate shared state concurrently
   - Locate closures (callbacks, event handlers, setTimeout/setInterval, React hooks) capturing mutable variables

3. **Assess concurrency and synchronization:**
   - Grep for semaphores, mutexes, locks, or atomic operation patterns in the codebase
   - Check whether concurrent access is possible (multiple async operations, event handlers, timers)
   - Verify ordering constraints for state transitions (flags set before operations complete, cache cleared before writes)

### Permitted External Research

Use WebSearch or WebFetch for **public** framework and library behavior when it materially affects correctness:

- React hook stale closure patterns (useEffect dependency array, functional setState, useRef)
- State management library mutation rules (Redux immutability, MobX observables, Zustand updates)
- TypeScript immutability patterns (readonly, Object.freeze, const assertions, DeepReadonly)
- JavaScript concurrency primitives (Promise.all race conditions, async/await ordering)

**CRITICAL:** Never send repository code, secrets, private file paths, or proprietary implementation details to web tools. Use only public API names, framework concepts, and vulnerability class descriptions.

## Detection Rules

### 1. Partial State Updates

Report when changed lines update one property without updating related properties, causing inconsistent object state:

- Object with derived or computed fields updated without recalculating derivations
- Updating one side of a bidirectional relationship without updating the inverse
- Setting a state flag without completing the corresponding operation
- Clearing a cache without writing replacement data
- Updating array length without updating array contents

**Evidence required:**
- Changed line mutating a property
- Data-flow trace showing related properties that should be updated together
- No synchronization or transaction boundary ensuring atomic updates

### 2. Shared State Without Synchronization

Report when changed lines mutate module-level variables, class static properties, or singleton instances without locking:

- Module-scoped `let` or `var` variables modified from multiple async operations
- Class static properties mutated from instance methods without synchronization
- Singleton instance state modified from concurrent requests or event handlers
- Global configuration objects mutated after initialization

**Evidence required:**
- Changed line mutating shared state
- Control-flow trace showing concurrent access is possible (async handlers, timers, parallel operations)
- No semaphore, mutex, lock, or atomic operation protecting the mutation
- Reference to repository synchronization patterns (if any) when analyzing whether protection exists

### 3. Incorrect Ordering of State Changes

Report when changed lines violate state transition invariants by incorrect sequencing:

- Setting a "ready" flag before the resource is actually ready
- Setting a "loading" flag after the async operation completes
- Clearing error state before the error is handled
- Updating UI state before backend state confirms
- Committing a transaction before validation passes

**Evidence required:**
- Changed line setting state at the wrong point in control flow
- Trace showing the operation that should precede or follow the state change
- Description of the invariant violated (ready before initialized, loading cleared prematurely, etc.)

### 4. Stale Closure References

Report when callbacks or event handlers in changed lines capture variable values that later change:

- React `useEffect` with missing dependency array entries (variable captured but not listed)
- `setTimeout` or `setInterval` callbacks capturing loop variables or mutable state
- Event listeners added without cleanup that reference stale component state
- Callbacks passed to async operations that capture values updated before callback runs

**Evidence required:**
- Changed line creating a closure (function, arrow function, useEffect)
- Variable captured by the closure that is mutable and updated after closure creation
- Data-flow trace showing the captured value can become stale
- Reference to React hooks best practices or closure pattern guidance when analyzing React code

**False-positive controls:**
- Do not report when functional setState (`setState(prev => ...)`) is used
- Do not report when useRef or other stable reference patterns prevent staleness
- Do not report when the dependency array correctly includes all captured variables
- Do not report when the closure intentionally captures a snapshot value

### 5. Mutation of Assumed-Immutable Objects

Report when changed lines mutate objects that other code assumes are immutable:

- Mutating function parameters when the function signature or convention implies readonly
- Mutating objects returned from functions that return cached or shared instances
- Mutating objects marked with TypeScript `readonly` or `Readonly<T>` (runtime mutation ignores compile-time types)
- Mutating objects in a codebase that uses `Object.freeze` or immutability libraries elsewhere
- Mutating Redux state directly instead of using reducers
- Mutating props or context in React components

**Evidence required:**
- Changed line mutating an object
- Evidence the object is assumed immutable: readonly type, Object.freeze usage, immutability library patterns, or function documentation
- Reference to repository immutability conventions or state management library rules when analyzing violations

### 6. Missing Deep Cloning

Report when changed lines create shallow copies but nested objects require deep cloning:

- Spread operator or `Object.assign` used on objects with nested mutable properties
- Array slice or spread used when array elements are objects that will be mutated
- Defensive copy that only copies the top level when nested state will be modified

**Evidence required:**
- Changed line creating a shallow copy (spread, Object.assign, Array.slice)
- Nested property access or mutation in subsequent code
- Context showing the copy was intended to prevent mutation (defensive copy, state update, cache isolation)

## Severity and Confidence Calibration

**High severity:**
- Shared state mutation without synchronization in concurrent contexts (race conditions)
- Incorrect ordering violating critical invariants (security checks bypassed, data corruption)
- Stale closures causing incorrect behavior in production scenarios (timers, event handlers)

**Medium severity:**
- Partial updates violating obvious invariants (derived fields stale, bidirectional relationships broken)
- Mutation of assumed-immutable objects in codebases with immutability patterns
- Missing deep cloning when nested mutations occur

**Low severity:**
- Ordering issues in non-critical flows (UI flicker, cosmetic inconsistency)
- Stale closures in development-only code or low-impact scenarios

**High confidence:**
- Control-flow or data-flow trace clearly shows the inconsistency or race condition
- Repository uses explicit immutability or state management patterns that are violated
- Concurrency primitives (semaphores, locks) exist elsewhere but are missing for this mutation

**Medium confidence:**
- Likely inconsistency based on code structure but concurrency model is unclear
- Immutability assumption inferred from types or conventions but not explicit

**Low confidence:**
- Speculative race condition without clear evidence of concurrent access
- Possible immutability violation without repository convention evidence

## Remediation Patterns

Provide concrete remediation guidance:

### Partial State Updates
- Update all related properties in a single statement or transaction
- Use object spread to create new objects with all updated fields
- Implement state machine patterns with discriminated unions
- Add validation to enforce invariants after state changes

### Shared State Without Synchronization
- Use semaphores, mutexes, or locks from repository concurrency utilities
- Refactor to avoid shared state (pass state through function parameters)
- Use immutable updates with atomic compare-and-swap
- Move state to component or request scope instead of module scope

### Incorrect Ordering
- Move state changes to correct control-flow positions (after operation completes, before commit)
- Use try/finally to ensure cleanup state is set even on errors
- Add assertions or guards to detect ordering violations

### Stale Closures
- Add missing variables to React useEffect dependency arrays
- Use functional setState: `setState(prev => prev + 1)` instead of `setState(count + 1)`
- Use useRef to hold mutable values that closures should read fresh
- Capture snapshot values explicitly when intentional
- Clean up event listeners and timers in useEffect cleanup functions

### Mutation of Assumed-Immutable Objects
- Use spread operator or Object.assign to create new objects
- Use array map/filter/reduce instead of push/splice/sort mutations
- Follow Redux reducer patterns (return new state, never mutate)
- Use immer library for nested immutable updates
- Add Object.freeze in development to catch mutations early

### Missing Deep Cloning
- Use structured clone: `structuredClone(obj)`
- Use deep clone libraries (lodash cloneDeep, immer)
- Recursively spread nested objects
- Use JSON parse/stringify for simple cases (loses functions, dates)

## Framework and Runtime Caveats

### React Hooks
- useEffect dependency arrays are lint-enforced in most projects; missing dependencies are usually intentional snapshots or bugs
- React 19+ provides useEffectEvent for reading latest values without dependencies
- Functional setState is the canonical solution for stale closure in state updates

### TypeScript Types
- `readonly` and `Readonly<T>` are compile-time only; runtime mutations are not prevented
- `as const` assertions make objects deeply readonly at compile time
- `Object.freeze` provides runtime shallow immutability but has performance cost

### State Management Libraries
- Redux: state must never be mutated; always return new objects from reducers
- MobX: mutations are observed and trigger reactions; use observables correctly
- Zustand: use set with functional updates for derived state

### Node.js Concurrency
- JavaScript is single-threaded but async operations interleave
- Multiple concurrent async operations can race on shared module state
- Worker threads introduce true parallelism requiring synchronization primitives

## Out of Scope

- Style preferences for immutability patterns (spread vs Object.assign vs libraries)
- State mutations in unchanged code unless directly relevant to understanding changed-line bugs
- Architectural concerns about state management strategy or global state usage
- Performance impact of immutability or cloning
- Missing immutability patterns as a style issue when no bug is present

## Output Contract

Report findings using Warden's standard finding schema. Each finding must include:

1. **Changed line number** containing the state mutation or closure reference
2. **Data-flow or control-flow trace** showing the inconsistency, race condition, or stale reference
3. **Evidence** that no synchronization, ordering constraint, or immutability pattern prevents the issue
4. **Impact description:** incorrect behavior, corrupted state, race condition, or stale data
5. **Repository context:** reference to immutability conventions or state management library rules when analyzing violations
6. **Concrete remediation** from patterns above

**Return zero findings when:**
- No concrete evidence of inconsistency exists
- Synchronization or ordering constraints prevent the issue
- Immutability patterns or functional updates are used correctly
- The mutation is intentional and safe based on surrounding context

Do not invent a custom output schema. Use Warden's existing report structure.
