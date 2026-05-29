import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  mergeWardenConfigs,
  ConfigLoadError,
  resolveSkillConfigs,
  resolveLayeredSkillConfigs,
  buildSkillRootsByName,
  loadLayeredWardenConfig,
} from './loader.js';
import { WardenConfigSchema, type SkillConfig, type WardenConfig } from './schema.js';

describe('resolveSkillConfigs', () => {
  const baseSkill: SkillConfig = {
    name: 'test-skill',
    triggers: [
      { type: 'pull_request', actions: ['opened'] },
    ],
  };

  const baseConfig: WardenConfig = {
    version: 1,
    skills: [baseSkill],
  };

  it('returns resolved trigger with empty filters when no defaults', () => {
    const [resolved] = resolveSkillConfigs(baseConfig);

    expect(resolved?.filters).toEqual({
      paths: undefined,
      ignorePaths: undefined,
    });
    expect(resolved?.failOn).toBeUndefined();
    expect(resolved?.reportOn).toBeUndefined();
    expect(resolved?.maxFindings).toBeUndefined();
    expect(resolved?.model).toBeUndefined();
  });

  it('applies defaults when skill has no config', () => {
    const config: WardenConfig = {
      ...baseConfig,
      defaults: {
        failOn: 'high',
        reportOn: 'low',
        maxFindings: 10,
        model: 'claude-sonnet-4-20250514',
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.failOn).toBe('high');
    expect(resolved?.reportOn).toBe('low');
    expect(resolved?.maxFindings).toBe(10);
    expect(resolved?.model).toBe('claude-sonnet-4-20250514');
  });

  it('skill config overrides defaults', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      paths: ['lib/**'],
      failOn: 'medium',
      reportOn: 'high',
      model: 'claude-opus-4-20250514',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
      defaults: {
        failOn: 'high',
        reportOn: 'low',
        maxFindings: 10,
        model: 'claude-sonnet-4-20250514',
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    // Skill overrides
    expect(resolved?.filters.paths).toEqual(['lib/**']);
    expect(resolved?.failOn).toBe('medium');
    expect(resolved?.reportOn).toBe('high');
    expect(resolved?.model).toBe('claude-opus-4-20250514');

    // Defaults still applied where skill doesn't specify
    expect(resolved?.maxFindings).toBe(10);
  });

  it('trigger overrides skill and defaults (3-level merge)', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      failOn: 'high',
      reportOn: 'medium',
      model: 'claude-sonnet-4-20250514',
      triggers: [
        {
          type: 'pull_request',
          actions: ['opened'],
          failOn: 'low',
          model: 'claude-opus-4-20250514',
        },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
      defaults: {
        failOn: 'medium',
        reportOn: 'low',
        maxFindings: 10,
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    // Trigger overrides
    expect(resolved?.failOn).toBe('low');
    expect(resolved?.model).toBe('claude-opus-4-20250514');

    // Skill overrides defaults
    expect(resolved?.reportOn).toBe('medium');

    // Defaults applied where neither trigger nor skill specifies
    expect(resolved?.maxFindings).toBe(10);
  });

  it('requestChanges and failCheck follow 3-level merge (trigger > skill > defaults)', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      requestChanges: false,
      failCheck: true,
      triggers: [
        {
          type: 'pull_request',
          actions: ['opened'],
          requestChanges: true,
        },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
      defaults: {
        requestChanges: false,
        failCheck: false,
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    // Trigger overrides skill for requestChanges
    expect(resolved?.requestChanges).toBe(true);
    // Skill overrides defaults for failCheck (trigger doesn't set it)
    expect(resolved?.failCheck).toBe(true);
  });

  it('requestChanges and failCheck use defaults when not set at skill or trigger level', () => {
    const config: WardenConfig = {
      ...baseConfig,
      defaults: {
        requestChanges: false,
        failCheck: true,
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.requestChanges).toBe(false);
    expect(resolved?.failCheck).toBe(true);
  });

  it('requestChanges and failCheck are undefined when not configured', () => {
    const [resolved] = resolveSkillConfigs(baseConfig);

    expect(resolved?.requestChanges).toBeUndefined();
    expect(resolved?.failCheck).toBeUndefined();
  });

  it('wildcard entries inherit requestChanges and failCheck from skill and defaults', () => {
    const config: WardenConfig = {
      version: 1,
      skills: [{ name: 'test-skill', requestChanges: true }],
      defaults: { failCheck: true },
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.type).toBe('*');
    expect(resolved?.requestChanges).toBe(true);
    expect(resolved?.failCheck).toBe(true);
  });

  it('trigger-level reportOnSuccess overrides skill and defaults', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      reportOnSuccess: false,
      triggers: [
        {
          type: 'pull_request',
          actions: ['opened'],
          reportOnSuccess: true,
        },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.reportOnSuccess).toBe(true);
  });

  it('produces wildcard entry for skill with no triggers', () => {
    const config: WardenConfig = {
      version: 1,
      skills: [{ name: 'test-skill' }],
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.type).toBe('*');
    expect(resolved?.name).toBe('test-skill');
    expect(resolved?.skill).toBe('test-skill');
  });

  it('produces one entry per trigger', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
        { type: 'local' },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
    };

    const resolved = resolveSkillConfigs(config);

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.type).toBe('pull_request');
    expect(resolved[1]?.type).toBe('local');
  });

  it('preserves skill properties', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      remote: 'org/repo',
      paths: ['src/**'],
      ignorePaths: ['*.test.ts'],
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.name).toBe('security-review');
    expect(resolved?.skill).toBe('security-review');
    expect(resolved?.remote).toBe('org/repo');
    expect(resolved?.filters.paths).toEqual(['src/**']);
    expect(resolved?.filters.ignorePaths).toEqual(['*.test.ts']);
  });

  it('preserves trigger draft filters', () => {
    const config: WardenConfig = {
      version: 1,
      skills: [{
        name: 'test-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'], draft: false }],
      }],
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.draft).toBe(false);
  });

  it('preserves trigger label filters', () => {
    const config: WardenConfig = {
      version: 1,
      skills: [{
        name: 'test-skill',
        triggers: [{ type: 'pull_request', actions: ['opened', 'labeled'], labels: ['trigger-warden'] }],
      }],
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.labels).toEqual(['trigger-warden']);
  });

  describe('ignorePaths merging', () => {
    it('uses defaults.ignorePaths when skill has none', () => {
      const config: WardenConfig = {
        version: 1,
        skills: [baseSkill],
        defaults: { ignorePaths: ['dist/**'] },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.filters.ignorePaths).toEqual(['dist/**']);
    });

    it('merges defaults.ignorePaths with skill.ignorePaths', () => {
      const skill: SkillConfig = {
        name: 'test-skill',
        ignorePaths: ['*.test.ts'],
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      };

      const config: WardenConfig = {
        version: 1,
        skills: [skill],
        defaults: { ignorePaths: ['dist/**'] },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.filters.ignorePaths).toEqual(['dist/**', '*.test.ts']);
    });

    it('returns undefined ignorePaths when neither defaults nor skill has them', () => {
      const [resolved] = resolveSkillConfigs(baseConfig);
      expect(resolved?.filters.ignorePaths).toBeUndefined();
    });
  });

  describe('model precedence', () => {
    it('trigger.model takes precedence over skill.model', () => {
      const skill: SkillConfig = {
        name: 'test-skill',
        model: 'claude-sonnet-4-20250514',
        triggers: [
          { type: 'pull_request', actions: ['opened'], model: 'claude-opus-4-20250514' },
        ],
      };

      const [resolved] = resolveSkillConfigs({ version: 1, skills: [skill] });
      expect(resolved?.model).toBe('claude-opus-4-20250514');
    });

    it('skill.model takes precedence over defaults.model', () => {
      const config: WardenConfig = {
        version: 1,
        skills: [{
          name: 'test-skill',
          model: 'claude-opus-4-20250514',
          triggers: [{ type: 'pull_request', actions: ['opened'] }],
        }],
        defaults: { model: 'claude-sonnet-4-20250514' },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.model).toBe('claude-opus-4-20250514');
    });

    it('defaults.model takes precedence over cliModel', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: { model: 'claude-sonnet-4-20250514' },
      };

      const [resolved] = resolveSkillConfigs(config, 'claude-haiku-3-5-20241022');
      expect(resolved?.model).toBe('claude-sonnet-4-20250514');
    });

    it('defaults.agent.model takes precedence over legacy defaults.model', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          model: 'claude-sonnet-4-20250514',
          agent: { model: 'pi-agent-model' },
        },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.model).toBe('pi-agent-model');
    });

    it('cliModel is used when no config model is set', () => {
      const [resolved] = resolveSkillConfigs(baseConfig, 'claude-haiku-3-5-20241022');
      expect(resolved?.model).toBe('claude-haiku-3-5-20241022');
    });

    it('empty string cliModel is treated as undefined', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: { model: 'claude-sonnet-4-20250514' },
      };

      const [resolved] = resolveSkillConfigs(config, '');
      expect(resolved?.model).toBe('claude-sonnet-4-20250514');
    });

    it('empty string model values fall through to next in precedence', () => {
      const skill: SkillConfig = {
        name: 'test-skill',
        model: '',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      };

      const config: WardenConfig = {
        version: 1,
        skills: [skill],
        defaults: { model: '' },
      };

      const [resolved] = resolveSkillConfigs(config, 'claude-haiku-3-5-20241022');
      expect(resolved?.model).toBe('claude-haiku-3-5-20241022');
    });
  });

  describe('runtime config', () => {
    it('defaults runtime to Pi', () => {
      const [resolved] = resolveSkillConfigs(baseConfig);

      expect(resolved?.runtime).toBe('pi');
      expect(resolved?.auxiliaryModel).toBeUndefined();
      expect(resolved?.synthesisModel).toBeUndefined();
      expect(resolved?.auxiliaryMaxRetries).toBeUndefined();
    });

    it('uses one runtime with separate agent, auxiliary, and synthesis options', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          runtime: 'claude',
          agent: { model: 'claude-main', maxTurns: 12, reasoningEffort: 'medium' },
          auxiliary: { model: 'claude-haiku-4-5', maxRetries: 2 },
          synthesis: { model: 'claude-opus-4-5' },
          auxiliaryMaxRetries: 5,
        },
      };

      const [resolved] = resolveSkillConfigs(config);

      expect(resolved?.runtime).toBe('claude');
      expect(resolved?.model).toBe('claude-main');
      expect(resolved?.maxTurns).toBe(12);
      expect(resolved?.reasoningEffort).toBe('medium');
      expect(resolved?.auxiliaryModel).toBe('claude-haiku-4-5');
      expect(resolved?.synthesisModel).toBe('claude-opus-4-5');
      expect(resolved?.auxiliaryMaxRetries).toBe(2);
    });

    it('enables finding verification by default and allows disabling it', () => {
      const [defaultResolved] = resolveSkillConfigs(baseConfig);
      expect(defaultResolved?.verifyFindings).toBe(true);

      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          verification: { enabled: false },
        },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.verifyFindings).toBe(false);
    });

    it('falls back to auxiliary model when synthesis model is unset', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          auxiliary: { model: 'claude-haiku-4-5' },
        },
      };

      const [resolved] = resolveSkillConfigs(config);

      expect(resolved?.auxiliaryModel).toBe('claude-haiku-4-5');
      expect(resolved?.synthesisModel).toBe('claude-haiku-4-5');
    });
  });

  describe('minConfidence merge', () => {
    it('uses defaults.minConfidence when no skill or trigger override', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: { minConfidence: 'high' },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.minConfidence).toBe('high');
    });

    it('skill-level minConfidence overrides defaults', () => {
      const skill: SkillConfig = {
        name: 'test-skill',
        minConfidence: 'low',
        triggers: [
          { type: 'pull_request', actions: ['opened'] },
        ],
      };

      const config: WardenConfig = {
        version: 1,
        skills: [skill],
        defaults: { minConfidence: 'high' },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.minConfidence).toBe('low');
    });

    it('trigger-level minConfidence overrides skill and defaults', () => {
      const skill: SkillConfig = {
        name: 'test-skill',
        minConfidence: 'high',
        triggers: [
          {
            type: 'pull_request',
            actions: ['opened'],
            minConfidence: 'low',
          },
        ],
      };

      const config: WardenConfig = {
        version: 1,
        skills: [skill],
        defaults: { minConfidence: 'medium' },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.minConfidence).toBe('low');
    });

    it('wildcard entry inherits minConfidence from skill and defaults', () => {
      const config: WardenConfig = {
        version: 1,
        skills: [{ name: 'test-skill', minConfidence: 'high' }],
        defaults: { minConfidence: 'medium' },
      };

      const [resolved] = resolveSkillConfigs(config);
      expect(resolved?.type).toBe('*');
      expect(resolved?.minConfidence).toBe('high');
    });

    it('minConfidence is undefined when not configured', () => {
      const [resolved] = resolveSkillConfigs(baseConfig);
      expect(resolved?.minConfidence).toBeUndefined();
    });
  });
});

describe('mergeWardenConfigs', () => {
  it('merges org defaults with repo overrides and appends skills', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      defaults: {
        failOn: 'high',
        ignorePaths: ['dist/**'],
        chunking: {
          filePatterns: [{ pattern: '**/*.lock', mode: 'skip' }],
          coalesce: { enabled: true, maxGapLines: 20, maxChunkSize: 4000 },
          maxContextFiles: 25,
        },
      },
      skills: [{
        name: 'org-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      defaults: {
        reportOn: 'medium',
        ignorePaths: ['coverage/**'],
        chunking: {
          filePatterns: [{ pattern: '**/*.snap', mode: 'skip' }],
          coalesce: { maxGapLines: 5, maxChunkSize: 2000, enabled: true },
          maxContextFiles: 10,
        },
      },
      skills: [{
        name: 'repo-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const merged = mergeWardenConfigs(baseConfig, repoConfig);

    expect(merged.defaults).toEqual({
      failOn: 'high',
      reportOn: 'medium',
      ignorePaths: ['dist/**', 'coverage/**'],
      chunking: {
        filePatterns: [
          { pattern: '**/*.lock', mode: 'skip' },
          { pattern: '**/*.snap', mode: 'skip' },
        ],
        coalesce: { enabled: true, maxGapLines: 5, maxChunkSize: 2000 },
        maxContextFiles: 10,
      },
    });
    expect(merged.skills.map((skill) => skill.name)).toEqual(['org-skill', 'repo-skill']);
  });

  it('deep-merges nested default model lanes across layers', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      defaults: {
        agent: { model: 'agent-base', maxTurns: 20 },
        auxiliary: { model: 'aux-base', maxRetries: 5 },
        synthesis: { model: 'synth-base' },
      },
      skills: [],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      defaults: {
        agent: { model: 'agent-repo' },
        auxiliary: { model: 'aux-repo' },
      },
      skills: [],
    };

    const merged = mergeWardenConfigs(baseConfig, repoConfig);

    expect(merged.defaults).toMatchObject({
      agent: { model: 'agent-repo', maxTurns: 20 },
      auxiliary: { model: 'aux-repo', maxRetries: 5 },
      synthesis: { model: 'synth-base' },
    });
  });

  it('uses base skills and warns for duplicate skill names across layers', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'shared-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'shared-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const warnings: string[] = [];
    const merged = mergeWardenConfigs(baseConfig, repoConfig, {
      baseConfigPath: '.warden-org/warden.toml',
      repoConfigPath: 'warden.toml',
      onWarning: (message) => warnings.push(message),
    });

    expect(merged.skills).toHaveLength(1);
    expect(merged.skills[0]?.name).toBe('shared-skill');
    expect(warnings).toEqual([
      'Skill "shared-skill" is defined in both .warden-org/warden.toml and warden.toml. ' +
      'Using the base config skill and ignoring the repo config duplicate.',
    ]);
  });
});

describe('buildSkillRootsByName', () => {
  it('does not require baseSkillRoot when the base config only uses remote skills', () => {
    const layered = {
      config: {
        version: 1 as const,
        skills: [{ name: 'org-skill', remote: 'owner/repo' }],
      },
      baseConfig: {
        version: 1 as const,
        skills: [{ name: 'org-skill', remote: 'owner/repo' }],
      },
    };

    expect(buildSkillRootsByName('/repo', layered)).toBeUndefined();
  });

  it('resolves built-in base skills without baseSkillRoot', () => {
    const layered = {
      config: {
        version: 1 as const,
        skills: [{ name: 'security-review' }],
      },
      baseConfig: {
        version: 1 as const,
        skills: [{ name: 'security-review' }],
      },
    };

    const roots = buildSkillRootsByName('/repo', layered);
    const [resolved] = resolveLayeredSkillConfigs(layered, undefined, roots);

    expect(roots).toEqual({ base: { 'security-review': undefined } });
    expect(resolved?.useBuiltinSkill).toBe(true);
    expect(resolved?.skillRoot).toBeUndefined();
  });

  it('requires baseSkillRoot when base config defines local skills', () => {
    const layered = {
      config: {
        version: 1 as const,
        skills: [{ name: 'org-skill' }],
      },
      baseConfig: {
        version: 1 as const,
        skills: [{ name: 'org-skill' }],
      },
    };

    expect(() => buildSkillRootsByName('/repo', layered)).toThrow(ConfigLoadError);
    expect(() => buildSkillRootsByName('/repo', layered)).toThrow(
      'base-skill-root is required when the base config defines local skills'
    );
  });

  it('does not treat package-shaped repo skills as built-in base skills', () => {
    const layered = {
      config: {
        version: 1 as const,
        skills: [{ name: 'attacker-skill' }],
      },
      baseConfig: {
        version: 1 as const,
        skills: [{ name: 'attacker-skill' }],
      },
    };

    expect(() => buildSkillRootsByName('/repo', layered)).toThrow(ConfigLoadError);
    expect(() => buildSkillRootsByName('/repo', layered)).toThrow(
      'base-skill-root is required when the base config defines local skills'
    );
  });

  it('keeps base and repo skill roots separate', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-roots-'));
    const layered = {
      config: {
        version: 1 as const,
        skills: [{ name: 'shared-skill' }],
      },
      baseConfig: {
        version: 1 as const,
        skills: [{ name: 'shared-skill' }],
      },
      repoConfig: {
        version: 1 as const,
        skills: [{ name: 'shared-skill' }],
      },
    };

    try {
      mkdirSync(join(tempDir, '.warden-org'));

      const roots = buildSkillRootsByName(tempDir, layered, '.warden-org');

      expect(roots).toEqual({
        base: { 'shared-skill': join(tempDir, '.warden-org') },
        repo: { 'shared-skill': tempDir },
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('resolveLayeredSkillConfigs', () => {
  it('keeps base defaults attached to base skills when repo config adds its own defaults', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      defaults: {
        failOn: 'high',
        batchDelayMs: 1000,
        auxiliaryMaxRetries: 7,
        chunking: { maxContextFiles: 25 },
      },
      skills: [{
        name: 'org-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      defaults: {
        failOn: 'low',
        batchDelayMs: 10,
        auxiliaryMaxRetries: 1,
        chunking: { maxContextFiles: 5 },
      },
      skills: [{
        name: 'repo-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const resolved = resolveLayeredSkillConfigs({
      config: mergeWardenConfigs(baseConfig, repoConfig),
      baseConfig,
      repoConfig,
    });

    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toMatchObject({
      name: 'org-skill',
      failOn: 'high',
      batchDelayMs: 1000,
      auxiliaryMaxRetries: 7,
      maxContextFiles: 25,
    });
    expect(resolved[1]).toMatchObject({
      name: 'repo-skill',
      failOn: 'low',
      batchDelayMs: 10,
      auxiliaryMaxRetries: 1,
      maxContextFiles: 5,
    });
  });

  it('lets repo-defined skills inherit the base runtime when repo defaults omit it', () => {
    const baseConfig = {
      version: 1,
      defaults: {
        runtime: 'pi',
      },
      skills: [{
        name: 'org-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    } as unknown as WardenConfig;

    const repoConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'repo-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const resolved = resolveLayeredSkillConfigs({
      config: { version: 1, skills: [] },
      baseConfig,
      repoConfig,
    });

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.runtime).toBe('pi');
    expect(resolved[1]?.runtime).toBe('pi');
  });

  it('lets repo-defined skills inherit base verification defaults when omitted', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      defaults: {
        failOn: 'high',
        model: 'base-model',
        ignorePaths: ['base/**'],
        runtime: 'claude',
        verification: { enabled: false },
        chunking: { maxContextFiles: 25 },
      },
      skills: [{
        name: 'org-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'repo-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const resolved = resolveLayeredSkillConfigs({
      config: { version: 1, skills: [] },
      baseConfig,
      repoConfig,
    });

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.verifyFindings).toBe(false);
    expect(resolved[1]?.verifyFindings).toBe(false);
    expect(resolved[1]?.runtime).toBe('claude');
    expect(resolved[1]?.failOn).toBeUndefined();
    expect(resolved[1]?.model).toBeUndefined();
    expect(resolved[1]?.filters.ignorePaths).toBeUndefined();
    expect(resolved[1]?.maxContextFiles).toBeUndefined();
  });

  it('ignores repo layer duplicates when resolving skills', () => {
    const baseConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'shared-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const repoConfig: WardenConfig = {
      version: 1,
      skills: [{
        name: 'shared-skill',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const resolved = resolveLayeredSkillConfigs(
      {
        config: { version: 1, skills: [] },
        baseConfig,
        repoConfig,
      },
      undefined,
      {
        base: { 'shared-skill': '/repo/.warden-org' },
        repo: { 'shared-skill': '/repo' },
      }
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.skillRoot).toBe('/repo/.warden-org');
  });
});

describe('loadLayeredWardenConfig', () => {
  it('loads base skill and skips repo duplicate with a warning', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-config-'));
    const warnings: string[] = [];

    try {
      mkdirSync(join(tempDir, '.warden-org'));
      writeFileSync(
        join(tempDir, '.warden-org', 'warden.toml'),
        [
          'version = 1',
          '',
          '[[skills]]',
          'name = "security-review"',
          '',
        ].join('\n')
      );
      writeFileSync(
        join(tempDir, 'warden.toml'),
        [
          'version = 1',
          '',
          '[[skills]]',
          'name = "security-review"',
          '',
          '[[skills]]',
          'name = "repo-only"',
          '',
        ].join('\n')
      );

      const layered = loadLayeredWardenConfig(tempDir, {
        baseConfigPath: '.warden-org/warden.toml',
        configPath: 'warden.toml',
        onWarning: (message) => warnings.push(message),
      });

      expect(layered.config.skills.map((skill) => skill.name)).toEqual([
        'security-review',
        'repo-only',
      ]);
      expect(layered.repoConfig?.skills.map((skill) => skill.name)).toEqual(['repo-only']);
      expect(warnings).toEqual([
        'Skill "security-review" is defined in both .warden-org/warden.toml and warden.toml. ' +
        'Using the base config skill and ignoring the repo config duplicate.',
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects using the same file for the base and repo config', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-config-'));

    try {
      writeFileSync(join(tempDir, 'warden.toml'), 'version = 1\n');

      expect(() => loadLayeredWardenConfig(tempDir, {
        baseConfigPath: './warden.toml',
        configPath: 'warden.toml',
      })).toThrow(ConfigLoadError);
      expect(() => loadLayeredWardenConfig(tempDir, {
        baseConfigPath: './warden.toml',
        configPath: 'warden.toml',
      })).toThrow('base-config-path and config-path must point to different files');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('maxTurns config', () => {
  it('accepts runtime, agent, auxiliary, and synthesis defaults', () => {
    const config = {
      version: 1,
      defaults: {
        runtime: 'pi',
        agent: { model: 'claude-main', maxTurns: 25 },
        auxiliary: { model: 'claude-haiku-4-5', maxRetries: 2 },
        synthesis: { model: 'claude-opus-4-5' },
      },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.runtime).toBe('pi');
    expect(result.data?.defaults?.auxiliary?.model).toBe('claude-haiku-4-5');
    expect(result.data?.defaults?.synthesis?.model).toBe('claude-opus-4-5');
  });

  it('accepts reasoning effort in agent defaults', () => {
    const config = {
      version: 1,
      defaults: {
        agent: { reasoningEffort: 'medium' },
      },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.agent?.reasoningEffort).toBe('medium');
  });

  it('rejects unknown reasoning efforts', () => {
    const config = {
      version: 1,
      defaults: {
        agent: { reasoningEffort: 'extreme' },
      },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts verification defaults', () => {
    const config = {
      version: 1,
      defaults: {
        verification: { enabled: false },
      },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.verification?.enabled).toBe(false);
  });

  it('rejects unknown runtimes', () => {
    const config = {
      version: 1,
      defaults: { runtime: 'bogus' },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects legacy split runtime provider settings', () => {
    const config = {
      version: 1,
      defaults: {
        agent: { provider: 'pi' },
        auxiliary: { provider: 'claude' },
      },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts maxTurns in defaults', () => {
    const config = {
      version: 1,
      defaults: { maxTurns: 25 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.maxTurns).toBe(25);
  });

  it('accepts maxTurns in skill', () => {
    const config = {
      version: 1,
      skills: [{ name: 'test', maxTurns: 30 }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.maxTurns).toBe(30);
  });

  it('accepts maxTurns in skill trigger', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'pull_request', actions: ['opened'], maxTurns: 30 }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.maxTurns).toBe(30);
  });

  it('rejects non-positive maxTurns', () => {
    const config = {
      version: 1,
      defaults: { maxTurns: 0 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer maxTurns', () => {
    const config = {
      version: 1,
      defaults: { maxTurns: 10.5 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('batchDelayMs config', () => {
  it('accepts batchDelayMs in defaults', () => {
    const config = {
      version: 1,
      defaults: { batchDelayMs: 1000 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.batchDelayMs).toBe(1000);
  });

  it('accepts zero batchDelayMs', () => {
    const config = {
      version: 1,
      defaults: { batchDelayMs: 0 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.batchDelayMs).toBe(0);
  });

  it('rejects negative batchDelayMs', () => {
    const config = {
      version: 1,
      defaults: { batchDelayMs: -100 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer batchDelayMs', () => {
    const config = {
      version: 1,
      defaults: { batchDelayMs: 100.5 },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('trigger type config', () => {
  it('accepts pull_request trigger type', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'pull_request', actions: ['opened'] }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.type).toBe('pull_request');
  });

  it('accepts pull_request label filters', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'pull_request', actions: ['opened', 'labeled'], labels: ['trigger-warden'] }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.labels).toEqual(['trigger-warden']);
  });

  it('rejects label filters for non-pull_request triggers', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'local', labels: ['Warden'] }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts local trigger type', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'local' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.type).toBe('local');
  });

  it('accepts schedule trigger type', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        paths: ['src/**/*.ts'],
        triggers: [{ type: 'schedule' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.type).toBe('schedule');
  });

  it('rejects invalid trigger type', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'invalid' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('requires actions for pull_request triggers', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'pull_request' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('does not require actions for local triggers', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'local' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('allows skill without triggers (wildcard)', () => {
    const config = {
      version: 1,
      skills: [{ name: 'test' }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers).toBeUndefined();
  });
});

describe('skill name uniqueness', () => {
  it('allows unique skill names', () => {
    const config = {
      version: 1,
      skills: [
        { name: 'skill-a' },
        { name: 'skill-b' },
      ],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects duplicate skill names', () => {
    const config = {
      version: 1,
      skills: [
        { name: 'my-skill' },
        { name: 'my-skill' },
      ],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Duplicate skill names: my-skill');
    }
  });

  it('reports all duplicate names in error message', () => {
    const config = {
      version: 1,
      skills: [
        { name: 'dup-a' },
        { name: 'dup-a' },
        { name: 'dup-b' },
        { name: 'dup-b' },
        { name: 'unique' },
      ],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? '';
      expect(message).toContain('dup-a');
      expect(message).toContain('dup-b');
      expect(message).not.toContain('unique');
    }
  });
});

describe('schedule skill validation', () => {
  it('requires paths for skills with schedule triggers', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'weekly-scan',
        triggers: [{ type: 'schedule' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts schedule skills with paths', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'weekly-scan',
        paths: ['src/**/*.ts'],
        triggers: [{ type: 'schedule' }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('requestChanges and failCheck config', () => {
  it('accepts requestChanges in defaults', () => {
    const config = {
      version: 1,
      defaults: { requestChanges: false },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.requestChanges).toBe(false);
  });

  it('accepts failCheck in defaults', () => {
    const config = {
      version: 1,
      defaults: { failCheck: true },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.failCheck).toBe(true);
  });

  it('accepts requestChanges in skill', () => {
    const config = {
      version: 1,
      skills: [{ name: 'test', requestChanges: false }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.requestChanges).toBe(false);
  });

  it('accepts failCheck in skill trigger', () => {
    const config = {
      version: 1,
      skills: [{
        name: 'test',
        triggers: [{ type: 'pull_request', actions: ['opened'], failCheck: true }],
      }],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.skills[0]?.triggers?.[0]?.failCheck).toBe(true);
  });

  it('rejects non-boolean requestChanges', () => {
    const config = {
      version: 1,
      defaults: { requestChanges: 'yes' },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('defaults.ignorePaths config', () => {
  it('accepts ignorePaths in defaults', () => {
    const config = {
      version: 1,
      defaults: { ignorePaths: ['dist/**', 'node_modules/**'] },
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.ignorePaths).toEqual(['dist/**', 'node_modules/**']);
  });
});

describe('logs config', () => {
  it('accepts logs section with cleanup and retentionDays', () => {
    const config = {
      version: 1,
      skills: [],
      logs: { cleanup: 'auto', retentionDays: 7 },
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.logs?.cleanup).toBe('auto');
    expect(result.data?.logs?.retentionDays).toBe(7);
  });

  it('defaults cleanup to "ask" and retentionDays to 30', () => {
    const config = {
      version: 1,
      skills: [],
      logs: {},
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.logs?.cleanup).toBe('ask');
    expect(result.data?.logs?.retentionDays).toBe(30);
  });

  it('accepts all cleanup modes', () => {
    for (const mode of ['ask', 'auto', 'never']) {
      const config = {
        version: 1,
        skills: [],
        logs: { cleanup: mode },
      };

      const result = WardenConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      expect(result.data?.logs?.cleanup).toBe(mode);
    }
  });

  it('rejects invalid cleanup mode', () => {
    const config = {
      version: 1,
      skills: [],
      logs: { cleanup: 'sometimes' },
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects non-positive retentionDays', () => {
    const config = {
      version: 1,
      skills: [],
      logs: { retentionDays: 0 },
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer retentionDays', () => {
    const config = {
      version: 1,
      skills: [],
      logs: { retentionDays: 3.5 },
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('config is valid without logs section', () => {
    const config = {
      version: 1,
      skills: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.logs).toBeUndefined();
  });
});
