import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JudgeContext } from 'vitest-evals';
import { createWardenEvalJudge } from './harness.js';
import { runJudge } from './judge.js';
import { DEFAULT_EVAL_MODEL, DEFAULT_EVAL_RUNTIME } from './types.js';
import { emptyUsage } from '../../../src/sdk/usage.js';
import type { EvalMeta } from './types.js';
import type { Finding } from '../../../src/types/index.js';

vi.mock('./judge.js', () => ({
  runJudge: vi.fn(),
}));

const mockedRunJudge = vi.mocked(runJudge);

function makeMeta(overrides: Partial<EvalMeta> = {}): EvalMeta {
  return {
    name: 'optional-assertion',
    category: 'code-review',
    skillName: 'code-review',
    given: 'an eval with an optional assertion',
    skillPath: '/path/to/skills/code-review/SKILL.md',
    filePaths: ['/path/to/fixtures/harness.ts'],
    model: DEFAULT_EVAL_MODEL,
    runtime: DEFAULT_EVAL_RUNTIME,
    should_find: [{ finding: 'required issue', required: true }],
    should_not_find: [],
    ...overrides,
  };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    severity: 'low',
    confidence: 'medium',
    title: 'Required issue',
    description: 'The required issue was found.',
    ...overrides,
  };
}

function makeJudgeContext(meta: EvalMeta, findings: Finding[]): JudgeContext<EvalMeta> {
  return {
    input: '',
    output: '',
    inputValue: meta,
    toolCalls: [],
    metadata: {},
    run: {
      output: {
        name: `${meta.category}/${meta.name}`,
        summary: 'Found one issue.',
        skill: 'code-review',
        findings,
      },
      session: { messages: [] },
      usage: {},
      errors: [],
    },
    session: { messages: [] },
    harness: undefined,
  };
}

describe('createWardenEvalJudge', () => {
  beforeEach(() => {
    mockedRunJudge.mockReset();
  });

  it('does not include optional should_find misses in passing rationale', async () => {
    const meta = makeMeta({
      should_find: [
        { finding: 'required issue', required: true },
        { finding: 'optional extra issue', required: false },
      ],
    });
    const findings = [makeFinding()];
    mockedRunJudge.mockResolvedValue({
      response: {
        expectations: [
          { met: true, matchedFindingIndex: 0, reasoning: 'found' },
          { met: false, matchedFindingIndex: null, reasoning: 'not found' },
        ],
        antiExpectations: [],
      },
      usage: emptyUsage(),
    });

    const judge = createWardenEvalJudge('test-key');
    const result = await judge(makeJudgeContext(meta, findings));

    expect(result.score).toBe(1);
    expect(result.metadata?.rationale).toBe('All eval assertions passed.');
  });

  it('explains required severity failures without a matched finding index', async () => {
    const meta = makeMeta({
      should_find: [{ finding: 'required issue', severity: 'low', required: true }],
    });
    mockedRunJudge.mockResolvedValue({
      response: {
        expectations: [
          { met: true, matchedFindingIndex: null, reasoning: 'found without index' },
        ],
        antiExpectations: [],
      },
      usage: emptyUsage(),
    });

    const judge = createWardenEvalJudge('test-key');
    const result = await judge(makeJudgeContext(meta, [makeFinding()]));

    expect(result.score).toBe(0);
    expect(result.metadata?.rationale).toBe(
      'should_find[0] severity could not be checked: no matched finding'
    );
  });

  it('fails when the judge fails even if all should_find assertions are optional', async () => {
    const meta = makeMeta({
      should_find: [{ finding: 'optional issue', required: false }],
      should_not_find: ['style-only feedback'],
    });
    mockedRunJudge.mockResolvedValue({
      response: {
        expectations: [
          { met: false, matchedFindingIndex: null, reasoning: 'judge failed' },
        ],
        antiExpectations: [
          { violated: false, violatingFindingIndex: null, reasoning: 'judge failed' },
        ],
      },
      usage: emptyUsage(),
      error: 'No JSON found in judge response',
    });

    const judge = createWardenEvalJudge('test-key');
    const result = await judge(makeJudgeContext(meta, [makeFinding()]));

    expect(result.score).toBe(0);
    expect(result.metadata?.rationale).toBe('Judge failed: No JSON found in judge response');
  });
});
