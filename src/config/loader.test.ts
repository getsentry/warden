import { describe, it, expect } from 'vitest';
import { resolveSkillConfigs } from './loader.js';
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
        reportOn: 'critical',
        maxFindings: 10,
        model: 'claude-sonnet-4-20250514',
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    expect(resolved?.failOn).toBe('high');
    expect(resolved?.reportOn).toBe('critical');
    expect(resolved?.maxFindings).toBe(10);
    expect(resolved?.model).toBe('claude-sonnet-4-20250514');
  });

  it('skill config overrides defaults', () => {
    const skill: SkillConfig = {
      name: 'test-skill',
      paths: ['lib/**'],
      failOn: 'critical',
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
        reportOn: 'critical',
        maxFindings: 10,
        model: 'claude-sonnet-4-20250514',
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    // Skill overrides
    expect(resolved?.filters.paths).toEqual(['lib/**']);
    expect(resolved?.failOn).toBe('critical');
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
          failOn: 'critical',
          model: 'claude-opus-4-20250514',
        },
      ],
    };

    const config: WardenConfig = {
      version: 1,
      skills: [skill],
      defaults: {
        failOn: 'low',
        reportOn: 'info',
        maxFindings: 10,
      },
    };

    const [resolved] = resolveSkillConfigs(config);

    // Trigger overrides
    expect(resolved?.failOn).toBe('critical');
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

describe('maxTurns config', () => {
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
