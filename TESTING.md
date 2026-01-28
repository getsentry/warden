# Testing Guidelines

## Philosophy

Tests should be **focused** and **isolated**. Every test must:

- Run independently without affecting other tests or local state
- Use temporary directories for file operations
- Clean up resources in `afterEach` hooks

## Running Tests

```bash
pnpm test              # Run all tests in watch mode
pnpm test:run          # Run all tests once
```

## Test Organization

### File Naming

- Test files use `*.test.ts` extension
- Co-locate tests with source: `foo.ts` → `foo.test.ts`

### Directory Structure

```
src/
├── cli/
│   ├── args.ts
│   ├── args.test.ts
│   ├── files.ts
│   └── files.test.ts
├── triggers/
│   ├── matcher.ts
│   └── matcher.test.ts
├── output/
│   ├── renderer.ts
│   └── renderer.test.ts
└── skills/
    ├── loader.ts
    └── loader.test.ts
```

## Test Isolation

### File System Tests

Always use temporary directories for file operations:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('my feature', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('does something with files', () => {
    writeFileSync(join(tempDir, 'test.ts'), 'content');
    // ... test code
  });
});
```

### Pure Function Tests

For pure functions without side effects, no special setup is needed:

```typescript
import { describe, it, expect } from 'vitest';
import { matchGlob, shouldFail } from './matcher.js';

describe('matchGlob', () => {
  it('matches exact paths', () => {
    expect(matchGlob('src/index.ts', 'src/index.ts')).toBe(true);
  });
});
```

## Coverage Depth

Test core behavior and catch regressions—not every possible edge case. Prioritize:

- Happy paths and common usage patterns
- Error cases users will actually hit
- Past bugs (regression tests)

Skip:

- Exhaustive input permutations
- Unlikely edge cases that add maintenance burden without value
- Implementation details that may change

## Writing Good Tests

### Do

- Test behavior, not implementation
- Use descriptive test names that explain the scenario
- Test error cases users will realistically encounter
- Group related tests with nested `describe()` blocks
- Verify cleanup happens (no leftover files)

### Don't

- Share state between tests (each test should be independent)
- Depend on test execution order
- Leave unrestored mocks or spies
- Use hardcoded paths (use temp directories)

## Coverage Goals

Cover core functionality:

- CLI argument parsing and file handling
- Trigger matching logic
- Skill loading and execution
- Output rendering
