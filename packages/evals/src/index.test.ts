import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  discoverEvalFiles,
  discoverEvalScenarioFiles,
  discoverEvalScenarios,
  discoverEvals,
  loadEvalFile,
  loadEvalScenarioFile,
  resolveEvalMetas,
  resolveEvalScenarioMeta,
} from './index.js';
import {
  DEFAULT_EVAL_MODEL,
  DEFAULT_EVAL_RUNTIME,
  EvalFileSchema,
  EvalScenarioFileSchema,
  EvalScenarioSchema,
} from './types.js';

const evalsDir = join(import.meta.dirname, '..');

describe('discoverEvalFiles', () => {
  it('returns array of YAML file paths', () => {
    const files = discoverEvalFiles(evalsDir);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\.ya?ml$/);
    }
  });

  it('returns empty array for non-existent directory', () => {
    const files = discoverEvalFiles('/non/existent/path');
    expect(files).toEqual([]);
  });

  it('returns sorted paths', () => {
    const files = discoverEvalFiles(evalsDir);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });
});

describe('loadEvalFile', () => {
  it('loads and validates a YAML eval file', () => {
    const files = discoverEvalFiles(evalsDir);
    expect(files.length).toBeGreaterThan(0);

    const evalFile = loadEvalFile(files[0]!);
    expect(evalFile).toHaveProperty('skill');
    expect(evalFile).toHaveProperty('evals');
    expect(Array.isArray(evalFile.evals)).toBe(true);
    expect(evalFile.evals.length).toBeGreaterThan(0);
  });

  it('loads all YAML eval files without error', () => {
    const files = discoverEvalFiles(evalsDir);
    for (const file of files) {
      expect(() => loadEvalFile(file)).not.toThrow();
    }
  });

  it('throws for missing file', () => {
    expect(() => loadEvalFile('/non/existent.yaml')).toThrow('Eval file not found');
  });
});

describe('resolveEvalMetas', () => {
  it('resolves scenarios into EvalMeta objects', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    expect(metas.length).toBe(evalFile.evals.length);
    for (const meta of metas) {
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('category');
      expect(meta).toHaveProperty('skillName');
      expect(meta).toHaveProperty('given');
      expect(meta).toHaveProperty('skillPath');
      expect(meta).toHaveProperty('filePaths');
      expect(meta).toHaveProperty('model');
      expect(meta).toHaveProperty('runtime');
      expect(meta).toHaveProperty('should_find');
      expect(meta).toHaveProperty('should_not_find');
    }
  });

  it('resolves skill path as absolute', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    for (const meta of metas) {
      expect(meta.skillPath).toMatch(/^\//);
      expect(meta.skillPath).toContain('evals/skills/');
    }
  });

  it('throws when the eval skill path does not exist', () => {
    const evalFile = EvalFileSchema.parse({
      skill: 'skills/missing.md',
      evals: [{
        name: 'missing-skill',
        given: 'an eval with a missing skill',
        files: ['fixtures/null-property-access/handler.ts'],
        should_find: [{ finding: 'anything' }],
      }],
    });

    expect(() => resolveEvalMetas(evalFile, join(evalsDir, 'missing-skill.yaml')))
      .toThrow('Eval skill not found');
  });

  it('throws when a fixture file does not exist', () => {
    const evalFile = EvalFileSchema.parse({
      skill: 'skills/bug-detection.md',
      evals: [{
        name: 'missing-fixture',
        given: 'an eval with a missing fixture',
        files: ['fixtures/missing-fixture/handler.ts'],
        should_find: [{ finding: 'anything' }],
      }],
    });

    expect(() => resolveEvalMetas(evalFile, join(evalsDir, 'missing-fixture.yaml')))
      .toThrow('Eval fixture not found for missing-fixture/missing-fixture');
  });

  it('resolves fixture file paths as absolute', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    for (const meta of metas) {
      for (const filePath of meta.filePaths) {
        expect(filePath).toMatch(/^\//);
        expect(filePath).toContain('evals/fixtures/');
      }
    }
  });

  it('extracts category from YAML filename and skillName from frontmatter', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    // First file alphabetically should be eval-bug-detection.yaml
    expect(metas[0]!.category).toBe('eval-bug-detection');
    expect(metas[0]!.skillName).toBe('eval-bug-detection');
  });
});

describe('standalone scenario files', () => {
  it('discovers JSON scenario files for a category', () => {
    const files = discoverEvalScenarioFiles('security-review', evalsDir);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\.json$/);
      expect(file).toContain('evals/security-review/');
    }
  });

  it('loads and validates a JSON scenario file', () => {
    const file = join(evalsDir, 'security-review', 'sentry-replay-delete-read-scope.json');
    const scenario = loadEvalScenarioFile(file);

    expect(scenario.name).toBeUndefined();
    expect(scenario.given).toContain('project:read');
    expect(scenario.should_find.length).toBe(1);
  });

  it('resolves standalone scenarios with shared suite defaults', () => {
    const file = join(evalsDir, 'security-review', 'sentry-replay-delete-read-scope.json');
    const scenario = loadEvalScenarioFile(file);
    const meta = resolveEvalScenarioMeta(scenario, file, {
      category: 'security-review',
      skill: '../../src/builtin-skills/security-review/SKILL.md',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
      baseDir: evalsDir,
    });

    expect(meta.name).toBe('sentry-replay-delete-read-scope');
    expect(meta.category).toBe('security-review');
    expect(meta.skillName).toBe('security-review');
    expect(meta.skillPath).toContain('src/builtin-skills/security-review/SKILL.md');
    expect(meta.runtime).toBe('pi');
    expect(meta.model).toBe('anthropic/claude-sonnet-4-6');
    expect(meta.filePaths[0]).toContain('evals/fixtures/sentry-replay-delete-read-scope/');
  });

  it('discovers all standalone scenarios for a category', () => {
    const metas = discoverEvalScenarios({
      category: 'security-review',
      skill: '../../src/builtin-skills/security-review/SKILL.md',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
      baseDir: evalsDir,
    });

    expect(metas.length).toBe(10);
    expect(metas.map((meta) => meta.name)).toContain('sentry-replay-delete-read-scope');
  });

  it('discovers standalone code-review scenarios', () => {
    const metas = discoverEvalScenarios({
      category: 'code-review',
      skill: '../../src/builtin-skills/code-review/SKILL.md',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
      baseDir: evalsDir,
    });

    expect(metas.map((meta) => meta.name)).toEqual(expect.arrayContaining([
      'eval-optional-assertion-rationale',
      'robots-prefix-blocks-public-metadata',
      'sentry-vitest-evals-duration-sixty-seconds',
      'sentry-vitest-evals-github-reporter-positional-json',
    ]));
    expect(metas.every((meta) => meta.skillName === 'code-review')).toBe(true);
    expect(metas[0]?.skillPath).toContain('src/builtin-skills/code-review/SKILL.md');
  });

  it('requires repro metadata for source-captured fixtures', () => {
    const licenseFilePattern = /\/(?:LICENSE(?:\.(?:md|txt))?|LICENCE(?:\.md)?|COPYING(?:\.md)?)$/;
    const scenarioFiles = [
      ...discoverEvalScenarioFiles('code-review', evalsDir),
      ...discoverEvalScenarioFiles('security-review', evalsDir),
      ...discoverEvalScenarioFiles('verification', evalsDir),
    ];
    const missingMetadata: string[] = [];

    for (const file of scenarioFiles) {
      const scenario = JSON.parse(readFileSync(file, 'utf-8')) as {
        files?: string[];
        supporting_files?: string[];
        notes?: {
          repository?: string;
          source_ref?: string;
          source_files?: {
            fixturePath: string;
            sourcePath: string;
            ref?: string;
          }[];
        };
      };
      const fixtureFiles = scenario.files ?? [];
      const supportingFiles = scenario.supporting_files ?? [];
      const sourceFiles = scenario.notes?.source_files ?? [];
      const fixtureRoots = new Set<string>();
      const repositories = new Set<string>();
      let sourceCaptured = Boolean(scenario.notes?.repository);
      for (const fixture of fixtureFiles) {
        if (fixture.startsWith('fixtures/sentry-') || fixture.includes('/github/')) {
          sourceCaptured = true;
        }
        const segments = fixture.split('/');
        const githubIndex = segments.indexOf('github');
        if (githubIndex !== -1 && segments[githubIndex + 1] && segments[githubIndex + 2]) {
          fixtureRoots.add(segments.slice(0, githubIndex + 3).join('/'));
          repositories.add(`${segments[githubIndex + 1]}/${segments[githubIndex + 2]}`);
        }
      }

      for (const root of fixtureRoots) {
        const hasLicense = [...fixtureFiles, ...supportingFiles].some(
          (supportingFile) =>
            supportingFile.startsWith(`${root}/`) &&
            licenseFilePattern.test(`/${supportingFile}`)
        );
        if (!hasLicense) {
          missingMetadata.push(`${file}: ${root}/LICENSE`);
        }
      }
      for (const repository of repositories) {
        if (scenario.notes?.repository !== repository || !scenario.notes.source_ref) {
          missingMetadata.push(`${file}: ${repository}@<missing source_ref>`);
        }
      }
      if (sourceCaptured) {
        if (!scenario.notes?.repository || !scenario.notes.source_ref) {
          missingMetadata.push(`${file}: <missing repository/source_ref>`);
        }
        const hasLicense = [...fixtureFiles, ...supportingFiles].some((fixture) =>
          licenseFilePattern.test(`/${fixture}`)
        );
        if (!hasLicense) {
          missingMetadata.push(`${file}: <missing LICENSE supporting file>`);
        }
        for (const fixture of fixtureFiles) {
          const sourceFile = sourceFiles.find((entry) => entry.fixturePath === fixture);
          if (!sourceFile?.sourcePath) {
            missingMetadata.push(`${file}: ${fixture} -> <missing sourcePath>`);
          }
        }
      }
    }

    expect(missingMetadata).toEqual([]);
  });

  it('throws when a standalone scenario fixture file does not exist', () => {
    const scenario = EvalScenarioFileSchema.parse({
      given: 'an eval with a missing fixture',
      files: ['fixtures/missing-fixture/handler.ts'],
      should_find: [{ finding: 'anything' }],
    });

    expect(() => resolveEvalScenarioMeta(scenario, join(evalsDir, 'security-review', 'missing-fixture.json'), {
      category: 'security-review',
      skill: '../../src/builtin-skills/security-review/SKILL.md',
      baseDir: evalsDir,
    })).toThrow('Eval fixture not found for security-review/missing-fixture');
  });
});

describe('discoverEvals', () => {
  it('returns a flat list of all eval metas', () => {
    const evals = discoverEvals(evalsDir);

    expect(evals.length).toBeGreaterThan(0);
    for (const meta of evals) {
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('category');
      expect(meta).toHaveProperty('skillName');
      expect(meta).toHaveProperty('given');
      expect(meta.should_find.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array for non-existent directory', () => {
    const evals = discoverEvals('/non/existent/path');
    expect(evals).toEqual([]);
  });
});

describe('EvalFileSchema', () => {
  it('validates a correct YAML structure', () => {
    const valid = {
      skill: 'skills/bug-detection.md',
      evals: [{
        name: 'test-eval',
        given: 'code with a bug',
        files: ['fixtures/test/file.ts'],
        should_find: [{ finding: 'the bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default model', () => {
    const valid = {
      skill: 'skills/test.md',
      evals: [{
        name: 'test',
        given: 'test scenario',
        files: ['fixtures/test.ts'],
        should_find: [{ finding: 'a bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe(DEFAULT_EVAL_MODEL);
    }
  });

  it('applies default runtime', () => {
    const valid = {
      skill: 'skills/test.md',
      evals: [{
        name: 'test',
        given: 'test scenario',
        files: ['fixtures/test.ts'],
        should_find: [{ finding: 'a bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.runtime).toBe(DEFAULT_EVAL_RUNTIME);
    }
  });

  it('accepts a Pi runtime with provider-qualified model', () => {
    const valid = {
      skill: '../../src/builtin-skills/security-review/SKILL.md',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
      evals: [{
        name: 'sentry-miss',
        given: 'Sentry endpoint with a known authorization miss',
        files: ['fixtures/sentry-miss/endpoint.py'],
        should_find: [{ finding: 'authorization bypass' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects unsupported runtimes', () => {
    const invalid = {
      skill: 'skills/test.md',
      runtime: 'local',
      evals: [{
        name: 'test',
        given: 'test scenario',
        files: ['fixtures/test.ts'],
        should_find: [{ finding: 'a bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing skill', () => {
    const invalid = {
      evals: [{
        name: 'test',
        given: 'test',
        files: ['file.ts'],
        should_find: [{ finding: 'bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty evals array', () => {
    const invalid = {
      skill: 'skills/test.md',
      evals: [],
    };
    const result = EvalFileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('EvalScenarioSchema', () => {
  it('validates a correct scenario', () => {
    const valid = {
      name: 'null-access',
      given: 'code with null bug',
      files: ['fixtures/handler.ts'],
      should_find: [{ finding: 'null access', severity: 'high' }],
    };
    const result = EvalScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default required=true for should_find', () => {
    const valid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [{ finding: 'bug' }],
    };
    const result = EvalScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.should_find[0]!.required).toBe(true);
    }
  });

  it('rejects empty files array', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: [],
      should_find: [{ finding: 'bug' }],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty should_find', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [{ finding: 'test', severity: 'invalid' }],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
