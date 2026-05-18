import { describe, it, expect } from 'vitest';
import { DEFAULT_EVAL_MODEL, DEFAULT_EVAL_RUNTIME, evalPassed } from './types.js';
import type { EvalMeta, JudgeResponse } from './types.js';

function makeMeta(overrides: Partial<EvalMeta> = {}): EvalMeta {
  return {
    name: 'test-eval',
    category: 'eval-bug-detection',
    skillName: 'eval-bug-detection',
    given: 'code with a known bug',
    skillPath: '/path/to/skills/bug-detection.md',
    filePaths: ['/path/to/fixtures/test/file.ts'],
    model: DEFAULT_EVAL_MODEL,
    runtime: DEFAULT_EVAL_RUNTIME,
    should_find: [{ finding: 'the bug', required: true }],
    should_not_find: [],
    ...overrides,
  };
}

function makeJudgeResponse(overrides: Partial<JudgeResponse> = {}): JudgeResponse {
  return {
    expectations: [{ met: true, matchedFindingIndex: 0, reasoning: 'Found it' }],
    antiExpectations: [],
    ...overrides,
  };
}

describe('evalPassed', () => {
  it('passes when all required should_find assertions are met', () => {
    const meta = makeMeta({
      should_find: [
        { finding: 'a', required: true },
        { finding: 'b', required: true },
      ],
    });
    const response = makeJudgeResponse({
      expectations: [
        { met: true, matchedFindingIndex: 0, reasoning: 'ok' },
        { met: true, matchedFindingIndex: 1, reasoning: 'ok' },
      ],
    });
    expect(evalPassed(meta, response)).toBe(true);
  });

  it('fails when a required should_find assertion is not met', () => {
    const meta = makeMeta({
      should_find: [{ finding: 'a', required: true }],
    });
    const response = makeJudgeResponse({
      expectations: [{ met: false, matchedFindingIndex: null, reasoning: 'not found' }],
    });
    expect(evalPassed(meta, response)).toBe(false);
  });

  it('fails when a required severity does not match the matched finding', () => {
    const meta = makeMeta({
      should_find: [{ finding: 'public endpoint discovery breakage', severity: 'high', required: true }],
    });
    const response = makeJudgeResponse({
      expectations: [{ met: true, matchedFindingIndex: 0, reasoning: 'same issue' }],
    });
    const findings = [{ id: 'f1', severity: 'low' as const, title: 'Robots blocks endpoint', description: 'desc' }];

    expect(evalPassed(meta, response, findings)).toBe(false);
  });

  it('passes when a required severity matches the matched finding', () => {
    const meta = makeMeta({
      should_find: [{ finding: 'public endpoint discovery breakage', severity: 'high', required: true }],
    });
    const response = makeJudgeResponse({
      expectations: [{ met: true, matchedFindingIndex: 0, reasoning: 'same issue' }],
    });
    const findings = [{ id: 'f1', severity: 'high' as const, title: 'Robots blocks endpoint', description: 'desc' }];

    expect(evalPassed(meta, response, findings)).toBe(true);
  });

  it('passes when optional should_find assertion is not met', () => {
    const meta = makeMeta({
      should_find: [
        { finding: 'a', required: true },
        { finding: 'b', required: false },
      ],
    });
    const response = makeJudgeResponse({
      expectations: [
        { met: true, matchedFindingIndex: 0, reasoning: 'ok' },
        { met: false, matchedFindingIndex: null, reasoning: 'missed' },
      ],
    });
    expect(evalPassed(meta, response)).toBe(true);
  });

  it('fails when should_not_find assertion is violated', () => {
    const meta = makeMeta({
      should_not_find: ['style issues'],
    });
    const response = makeJudgeResponse({
      antiExpectations: [
        { violated: true, violatingFindingIndex: 0, reasoning: 'reported style' },
      ],
    });
    expect(evalPassed(meta, response)).toBe(false);
  });

  it('passes when should_not_find assertion is not violated', () => {
    const meta = makeMeta({
      should_not_find: ['style issues'],
    });
    const response = makeJudgeResponse({
      antiExpectations: [
        { violated: false, violatingFindingIndex: null, reasoning: 'clean' },
      ],
    });
    expect(evalPassed(meta, response)).toBe(true);
  });
});
