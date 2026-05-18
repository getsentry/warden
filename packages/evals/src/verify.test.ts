import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveVerificationEvalMeta, runVerificationEval } from './verify.js';
import type { EvalMeta } from './types.js';
import type { Finding } from '../../../src/types/index.js';

const mocks = vi.hoisted(() => ({
  resolveSkillAsync: vi.fn(),
  setupEvalRepo: vi.fn(),
  verifyFindings: vi.fn(),
}));

vi.mock('../../../src/skills/loader.js', () => ({
  resolveSkillAsync: mocks.resolveSkillAsync,
}));

vi.mock('../../../src/sdk/verify.js', () => ({
  verifyFindings: mocks.verifyFindings,
}));

vi.mock('./runner.js', () => ({
  setupEvalRepo: mocks.setupEvalRepo,
}));

describe('resolveVerificationEvalMeta', () => {
  let tempDir: string | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
  });

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

  it('keeps supporting files when setting up verification eval repos', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-verify-eval-'));
    const repoDir = join(tempDir, 'repo');
    const skillPath = join(tempDir, 'skills', 'security-review', 'SKILL.md');
    const fixturePath = join(tempDir, 'fixtures', 'endpoint.py');
    const licensePath = join(tempDir, 'fixtures', 'LICENSE');
    mkdirSync(join(tempDir, 'skills', 'security-review'), { recursive: true });
    mkdirSync(join(tempDir, 'fixtures'), { recursive: true });
    writeFileSync(skillPath, '---\nname: security-review\n---\n');
    writeFileSync(fixturePath, 'def endpoint():\n    pass\n');
    writeFileSync(licensePath, 'source license\n');

    const candidate: Finding = {
      id: 'candidate',
      severity: 'high',
      title: 'candidate finding',
      description: 'candidate description',
    };
    mocks.setupEvalRepo.mockReturnValue(repoDir);
    mocks.resolveSkillAsync.mockResolvedValue({ name: 'security-review' });
    mocks.verifyFindings.mockResolvedValue({ findings: [] });

    await runVerificationEval({
      name: 'license-context',
      category: 'verification',
      skillName: 'security-review',
      given: 'license context should be present',
      skillPath,
      filePaths: [fixturePath],
      supportingFilePaths: [licensePath],
      candidate,
      expectedVerdict: 'reject',
      model: 'anthropic/claude-sonnet-4-6',
      runtime: 'pi',
    }, {
      apiKey: 'test-api-key',
    });

    expect(mocks.setupEvalRepo).toHaveBeenCalledWith(
      expect.objectContaining<Partial<EvalMeta>>({
        supportingFilePaths: [licensePath],
      }),
      expect.any(Function),
    );
  });
});
