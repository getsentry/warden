import { describe, it, expect } from 'vitest';
import { DEFAULT_EVAL_MODEL, evalPassed, formatEvalResult } from './types.js';
import type { EvalMeta, JudgeResponse, EvalResult } from './types.js';

function makeMeta(overrides: Partial<EvalMeta> = {}): EvalMeta {
  return {
    name: 'test-eval',
    category: 'bug-detection',
    given: 'code with a known bug',
    skillPath: '/path/to/skills/bug-detection.md',
    filePaths: ['/path/to/fixtures/test/file.ts'],
    model: DEFAULT_EVAL_MODEL,
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

describe('formatEvalResult', () => {
  it('formats passing result', () => {
    const result: EvalResult = {
      name: 'bug-detection/null-access',
      meta: makeMeta(),
      passed: true,
      report: {
        skill: 'eval-bug-detection',
        summary: 'Found 1 issue',
        findings: [{ id: 'f1', severity: 'high', title: 'Null access', description: 'desc' }],
      },
      judgeResponse: makeJudgeResponse(),
      logs: [],
      durationMs: 1000,
    };

    const output = formatEvalResult(result);
    expect(output).toContain('[PASS]');
    expect(output).toContain('bug-detection/null-access');
    expect(output).toContain('Given:');
  });

  it('formats failing result', () => {
    const result: EvalResult = {
      name: 'bug-detection/null-access',
      meta: makeMeta(),
      passed: false,
      report: {
        skill: 'eval-bug-detection',
        summary: 'No issues found',
        findings: [],
      },
      judgeResponse: makeJudgeResponse({
        expectations: [{ met: false, matchedFindingIndex: null, reasoning: 'nothing found' }],
      }),
      logs: [],
      durationMs: 1000,
    };

    const output = formatEvalResult(result);
    expect(output).toContain('[FAIL]');
    expect(output).toContain('nothing found');
  });
});
