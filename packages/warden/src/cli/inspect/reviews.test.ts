import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadReviews,
  saveReviews,
  saveReviewsAndPublish,
  upsertReview,
  reviewKey,
  reviewFilePath,
  reviewsPublishBody,
} from './reviews.js';

describe('reviewKey', () => {
  it('formats the key as skill:id:occurrence', () => {
    expect(reviewKey('security-review', 'abc123', 1)).toBe('security-review:abc123:1');
    expect(reviewKey('security-review', 'abc123', 2)).toBe('security-review:abc123:2');
  });
});

describe('reviewFilePath', () => {
  it('places the sidecar under .warden/reviews/', () => {
    expect(reviewFilePath('/repo', 'my-run-id')).toBe(
      '/repo/.warden/reviews/my-run-id.json',
    );
  });
});

describe('loadReviews / saveReviews / upsertReview', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-reviews-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns empty reviews when the sidecar does not exist yet', () => {
    const result = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    expect(result.schemaVersion).toBe(2);
    expect(result.runId).toBe('run-1');
    expect(result.logPath).toBe('/path/to/log.jsonl');
    expect(result.reviews).toEqual({});
  });

  it('round-trips verdict, comment, and occurrence (v2)', () => {
    const key = reviewKey('my-skill', 'finding-1', 1);
    let data = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    data = upsertReview(data, key, {
      findingId: 'finding-1',
      skill: 'my-skill',
      verdict: 'false_positive',
      comment: 'test helper, not reachable',
    });
    saveReviews(tempDir, data);

    const loaded = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.reviews[key]).toMatchObject({
      findingId: 'finding-1',
      skill: 'my-skill',
      occurrence: 1,
      verdict: 'false_positive',
      comment: 'test helper, not reachable',
    });
  });

  it('overwrites a previous verdict when relabelled (ISC-15)', () => {
    const key = reviewKey('my-skill', 'finding-1', 1);
    let data = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    data = upsertReview(data, key, {
      findingId: 'finding-1',
      skill: 'my-skill',
      verdict: 'false_positive',
      comment: 'original comment',
    });
    saveReviews(tempDir, data);

    let loaded = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    loaded = upsertReview(loaded, key, {
      findingId: 'finding-1',
      skill: 'my-skill',
      verdict: 'true_positive',
      comment: 'updated',
    });
    saveReviews(tempDir, loaded);

    const final = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    expect(final.reviews[key]?.verdict).toBe('true_positive');
    expect(final.reviews[key]?.comment).toBe('updated');
    expect(final.reviews[key]?.occurrence).toBe(1);
  });

  it('keeps an empty comment (ISC-13)', () => {
    const key = reviewKey('my-skill', 'finding-1', 1);
    let data = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    data = upsertReview(data, key, {
      findingId: 'finding-1',
      skill: 'my-skill',
      verdict: 'mitigated',
      comment: '',
    });
    saveReviews(tempDir, data);

    const loaded = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    expect(loaded.reviews[key]?.comment).toBe('');
  });

  it('atomic write: result file exists and is valid JSON after save', () => {
    let data = loadReviews(tempDir, 'run-2', '/log.jsonl');
    data = upsertReview(data, 'skill:id:1', {
      findingId: 'id',
      skill: 'skill',
      verdict: 'mitigated',
      comment: '',
    });
    saveReviews(tempDir, data);

    const filePath = reviewFilePath(tempDir, 'run-2');
    expect(existsSync(filePath)).toBe(true);
    const loaded = loadReviews(tempDir, 'run-2', '/log.jsonl');
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.reviews['skill:id:1']?.occurrence).toBe(1);
  });

  it('loads a v1 sidecar and parses occurrence from the map key (ISC-11)', () => {
    const key = reviewKey('security-review', 'abc123', 2);
    const filePath = reviewFilePath(tempDir, 'run-v1');
    mkdirSync(join(tempDir, '.warden', 'reviews'), { recursive: true });
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          schemaVersion: 1,
          runId: 'run-v1',
          logPath: '/old/log.jsonl',
          updatedAt: '2026-08-18T09:11:07.000Z',
          reviews: {
            [key]: {
              findingId: 'abc123',
              skill: 'security-review',
              verdict: 'false_positive',
              comment: 'legacy sidecar',
              updatedAt: '2026-08-18T09:11:07.000Z',
            },
          },
        },
        null,
        2,
      ) + '\n',
      'utf-8',
    );

    const loaded = loadReviews(tempDir, 'run-v1', '/old/log.jsonl');
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.reviews[key]).toMatchObject({
      findingId: 'abc123',
      skill: 'security-review',
      occurrence: 2,
      verdict: 'false_positive',
      comment: 'legacy sidecar',
    });
  });

  it('throws on an unknown schemaVersion instead of dropping reviews', () => {
    const filePath = reviewFilePath(tempDir, 'run-future');
    mkdirSync(join(tempDir, '.warden', 'reviews'), { recursive: true });
    writeFileSync(
      filePath,
      JSON.stringify({
        schemaVersion: 99,
        runId: 'run-future',
        logPath: '/log.jsonl',
        updatedAt: '2026-08-18T09:11:07.000Z',
        reviews: {
          'skill:id:1': {
            findingId: 'id',
            skill: 'skill',
            occurrence: 1,
            verdict: 'true_positive',
            comment: 'must not be dropped',
            updatedAt: '2026-08-18T09:11:07.000Z',
          },
        },
      }) + '\n',
      'utf-8',
    );

    expect(() => loadReviews(tempDir, 'run-future', '/log.jsonl')).toThrow(
      /Unsupported review sidecar schemaVersion: 99/,
    );
  });

  it('maps stored occurrence from a v2 sidecar into the reviews POST body',
    () => {
      const key = reviewKey('security-review', 'finding-1', 2);
      let data = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
      data = upsertReview(data, key, {
        findingId: 'finding-1',
        skill: 'security-review',
        verdict: 'false_positive',
        comment: 'test fixture, not a real leak',
      });
      expect(reviewsPublishBody(data)).toEqual({
        reviews: [{
          skill: 'security-review',
          findingId: 'finding-1',
          occurrence: 2,
          verdict: 'false_positive',
          comment: 'test fixture, not a real leak',
          updatedAt: data.reviews[key]!.updatedAt,
        }],
      });
    },
  );

  it('maps occurrence from a migrated v1 sidecar into the reviews POST body',
    () => {
      const key = reviewKey('security-review', 'abc123', 2);
      const filePath = reviewFilePath(tempDir, 'run-v1');
      mkdirSync(join(tempDir, '.warden', 'reviews'), { recursive: true });
      writeFileSync(
        filePath,
        JSON.stringify({
          schemaVersion: 1,
          runId: 'run-v1',
          logPath: '/old/log.jsonl',
          updatedAt: '2026-08-18T09:11:07.000Z',
          reviews: {
            [key]: {
              findingId: 'abc123',
              skill: 'security-review',
              verdict: 'mitigated',
              comment: 'legacy sidecar',
              updatedAt: '2026-08-18T09:11:07.000Z',
            },
          },
        }) + '\n',
        'utf-8',
      );

      const loaded = loadReviews(tempDir, 'run-v1', '/old/log.jsonl');
      expect(reviewsPublishBody(loaded).reviews).toEqual([{
        skill: 'security-review',
        findingId: 'abc123',
        occurrence: 2,
        verdict: 'mitigated',
        comment: 'legacy sidecar',
        updatedAt: '2026-08-18T09:11:07.000Z',
      }]);
    },
  );

  it('writes the sidecar when publish fails and retries on a later save (ISC-8)', async () => {
    const key = reviewKey('security-review', 'finding-1', 1);
    let data = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    data = upsertReview(data, key, {
      findingId: 'finding-1',
      skill: 'security-review',
      verdict: 'false_positive',
      comment: 'test fixture, not a real leak',
    });
    const warning = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private response body'));
    const service = {
      url: 'https://warden.example.com',
      token: 'warden-test-token',
      data: 'findings' as const,
      memory: false,
      timeoutMs: 50,
    };

    await saveReviewsAndPublish(tempDir, data, service, warning);

    const loaded = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    expect(loaded.reviews[key]?.verdict).toBe('false_positive');
    expect(warning).toHaveBeenCalledWith(
      'Warden service could not publish reviews for run run-1. Local results are unchanged.',
    );
    expect(fetchMock).toHaveBeenCalled();

    fetchMock.mockResolvedValue(Response.json({
      runId: 'stored-run-1',
      clientRunId: 'run-1',
      applied: 1,
      unmatched: [],
    }));
    warning.mockClear();
    const retried = loadReviews(tempDir, 'run-1', '/path/to/log.jsonl');
    await saveReviewsAndPublish(tempDir, retried, service, warning);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.endsWith('/api/v1/runs/run-1/reviews'))).toBe(true);
    expect(warning).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
