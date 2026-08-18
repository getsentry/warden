import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadReviews,
  saveReviews,
  upsertReview,
  reviewKey,
  reviewFilePath,
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
    expect(result.schemaVersion).toBe(1);
    expect(result.runId).toBe('run-1');
    expect(result.logPath).toBe('/path/to/log.jsonl');
    expect(result.reviews).toEqual({});
  });

  it('round-trips verdict and comment', () => {
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
    expect(loaded.reviews[key]).toMatchObject({
      findingId: 'finding-1',
      skill: 'my-skill',
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
    expect(loaded.schemaVersion).toBe(1);
  });
});
