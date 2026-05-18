import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveVerificationEvalMeta } from './verify.js';

describe('resolveVerificationEvalMeta', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('includes the file path when verification scenario JSON is malformed', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-verify-eval-'));
    const scenarioPath = join(tempDir, 'bad.json');
    writeFileSync(scenarioPath, '{ bad json');

    expect(() => resolveVerificationEvalMeta(scenarioPath, {
      category: 'verification',
      skill: 'skills/security-review.md',
      baseDir: tempDir,
    })).toThrow(`Invalid verification eval ${scenarioPath}`);
  });
});
