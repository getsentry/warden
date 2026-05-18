import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildGitHubEvalFixturePath,
  evalFixtureRepoPath,
  evalFixtureSourceRepository,
  safeEvalFixturePathSegment,
  singleEvalFixtureSourceRepository,
} from './fixtures.js';

describe('eval fixture paths', () => {
  it('builds GitHub storage paths and clean temp repo paths', () => {
    const storagePath = join(
      '/tmp/work',
      'evals',
      'fixtures',
      'source-context',
      buildGitHubEvalFixturePath({
        owner: 'getsentry',
        repo: 'sentry',
        sourcePath: 'src/sentry/api/endpoint.py',
      }),
    );

    expect(storagePath).toContain('source-context/github/getsentry/sentry/src/sentry/api/endpoint.py');
    expect(evalFixtureRepoPath(storagePath)).toBe('source-context/src/sentry/api/endpoint.py');
    expect(evalFixtureSourceRepository(storagePath)).toBe('getsentry/sentry');
  });

  it('leaves hand-written fixture paths unchanged', () => {
    const fixturePath = join('/tmp/work', 'evals', 'fixtures', 'scenario', 'handler.ts');

    expect(evalFixtureRepoPath(fixturePath)).toBe('scenario/handler.ts');
    expect(evalFixtureSourceRepository(fixturePath)).toBeUndefined();
  });

  it('returns one source repository only when all encoded fixtures agree', () => {
    const first = join('/tmp/work', 'evals', 'fixtures', 'case', 'github', 'getsentry', 'sentry', 'a.py');
    const second = join('/tmp/work', 'evals', 'fixtures', 'case', 'github', 'getsentry', 'sentry', 'b.py');
    const third = join('/tmp/work', 'evals', 'fixtures', 'case', 'github', 'getsentry', 'warden', 'c.ts');

    expect(singleEvalFixtureSourceRepository([first, second])).toBe('getsentry/sentry');
    expect(singleEvalFixtureSourceRepository([first, third])).toBeUndefined();
  });

  it('sanitizes unsafe path segments', () => {
    expect(safeEvalFixturePathSegment('sentry app')).toBe('sentry_app');
    expect(safeEvalFixturePathSegment('..')).toBe('path');
  });
});
