import { describe, it, expect } from 'vitest';
import { resolveTrigger } from './loader.js';
import { WardenConfigSchema, type Trigger, type WardenConfig } from './schema.js';

describe('resolveTrigger', () => {
  const baseTrigger: Trigger = {
    name: 'test-trigger',
    event: 'pull_request',
    actions: ['opened'],
    skill: 'test-skill',
  };

  const baseConfig: WardenConfig = {
    version: 1,
    triggers: [baseTrigger],
  };

  it('returns trigger with empty filters and output when no defaults', () => {
    const resolved = resolveTrigger(baseTrigger, baseConfig);

    expect(resolved.filters).toEqual({
      paths: undefined,
      ignorePaths: undefined,
    });
    expect(resolved.output).toEqual({
      failOn: undefined,
      commentOn: undefined,
      maxFindings: undefined,
    });
    expect(resolved.model).toBeUndefined();
  });

  it('applies defaults when trigger has no config', () => {
    const config: WardenConfig = {
      ...baseConfig,
      defaults: {
        filters: { paths: ['src/**'], ignorePaths: ['*.test.ts'] },
        output: { failOn: 'high', commentOn: 'critical', maxFindings: 10 },
        model: 'claude-sonnet-4-20250514',
      },
    };

    const resolved = resolveTrigger(baseTrigger, config);

    expect(resolved.filters.paths).toEqual(['src/**']);
    expect(resolved.filters.ignorePaths).toEqual(['*.test.ts']);
    expect(resolved.output.failOn).toBe('high');
    expect(resolved.output.commentOn).toBe('critical');
    expect(resolved.output.maxFindings).toBe(10);
    expect(resolved.model).toBe('claude-sonnet-4-20250514');
  });

  it('trigger config overrides defaults', () => {
    const trigger: Trigger = {
      ...baseTrigger,
      filters: { paths: ['lib/**'] },
      output: { failOn: 'critical', commentOn: 'high' },
      model: 'claude-opus-4-20250514',
    };

    const config: WardenConfig = {
      ...baseConfig,
      triggers: [trigger],
      defaults: {
        filters: { paths: ['src/**'], ignorePaths: ['*.test.ts'] },
        output: { failOn: 'high', commentOn: 'critical', maxFindings: 10 },
        model: 'claude-sonnet-4-20250514',
      },
    };

    const resolved = resolveTrigger(trigger, config);

    // Trigger overrides
    expect(resolved.filters.paths).toEqual(['lib/**']);
    expect(resolved.output.failOn).toBe('critical');
    expect(resolved.output.commentOn).toBe('high');
    expect(resolved.model).toBe('claude-opus-4-20250514');

    // Defaults still applied where trigger doesn't specify
    expect(resolved.filters.ignorePaths).toEqual(['*.test.ts']);
    expect(resolved.output.maxFindings).toBe(10);
  });

  it('partial defaults are applied correctly', () => {
    const config: WardenConfig = {
      ...baseConfig,
      defaults: {
        filters: { ignorePaths: ['*.md'] },
      },
    };

    const resolved = resolveTrigger(baseTrigger, config);

    expect(resolved.filters.paths).toBeUndefined();
    expect(resolved.filters.ignorePaths).toEqual(['*.md']);
    expect(resolved.output.failOn).toBeUndefined();
    expect(resolved.model).toBeUndefined();
  });

  it('preserves other trigger properties', () => {
    const trigger: Trigger = {
      ...baseTrigger,
      name: 'my-trigger',
      skill: 'security-review',
    };

    const resolved = resolveTrigger(trigger, baseConfig);

    expect(resolved.name).toBe('my-trigger');
    expect(resolved.event).toBe('pull_request');
    expect(resolved.actions).toEqual(['opened']);
    expect(resolved.skill).toBe('security-review');
  });

  describe('model precedence', () => {
    it('trigger.model takes precedence over cliModel', () => {
      const trigger: Trigger = {
        ...baseTrigger,
        model: 'claude-opus-4-20250514',
      };

      const resolved = resolveTrigger(trigger, baseConfig, 'claude-haiku-3-5-20241022');

      expect(resolved.model).toBe('claude-opus-4-20250514');
    });

    it('defaults.model takes precedence over cliModel', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          model: 'claude-sonnet-4-20250514',
        },
      };

      const resolved = resolveTrigger(baseTrigger, config, 'claude-haiku-3-5-20241022');

      expect(resolved.model).toBe('claude-sonnet-4-20250514');
    });

    it('cliModel is used when no config model is set', () => {
      const resolved = resolveTrigger(baseTrigger, baseConfig, 'claude-haiku-3-5-20241022');

      expect(resolved.model).toBe('claude-haiku-3-5-20241022');
    });

    it('trigger.model takes precedence over defaults.model', () => {
      const trigger: Trigger = {
        ...baseTrigger,
        model: 'claude-opus-4-20250514',
      };
      const config: WardenConfig = {
        ...baseConfig,
        triggers: [trigger],
        defaults: {
          model: 'claude-sonnet-4-20250514',
        },
      };

      const resolved = resolveTrigger(trigger, config, 'claude-haiku-3-5-20241022');

      expect(resolved.model).toBe('claude-opus-4-20250514');
    });

    it('empty string cliModel is treated as undefined', () => {
      const config: WardenConfig = {
        ...baseConfig,
        defaults: {
          model: 'claude-sonnet-4-20250514',
        },
      };

      const resolved = resolveTrigger(baseTrigger, config, '');

      expect(resolved.model).toBe('claude-sonnet-4-20250514');
    });

    it('empty string model values fall through to next in precedence', () => {
      // Simulates GitHub Actions substituting unconfigured secrets with ''
      const trigger: Trigger = {
        ...baseTrigger,
        model: '',
      };
      const config: WardenConfig = {
        ...baseConfig,
        triggers: [trigger],
        defaults: {
          model: '',
        },
      };

      const resolved = resolveTrigger(trigger, config, 'claude-haiku-3-5-20241022');

      expect(resolved.model).toBe('claude-haiku-3-5-20241022');
    });
  });
});

describe('maxTurns config', () => {
  it('accepts maxTurns in defaults', () => {
    const config = {
      version: 1,
      defaults: {
        maxTurns: 25,
      },
      triggers: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.defaults?.maxTurns).toBe(25);
  });

  it('accepts maxTurns in trigger', () => {
    const config = {
      version: 1,
      triggers: [
        {
          name: 'test',
          event: 'pull_request',
          actions: ['opened'],
          skill: 'security-review',
          maxTurns: 30,
        },
      ],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(result.data?.triggers[0]?.maxTurns).toBe(30);
  });

  it('rejects non-positive maxTurns', () => {
    const config = {
      version: 1,
      defaults: {
        maxTurns: 0,
      },
      triggers: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer maxTurns', () => {
    const config = {
      version: 1,
      defaults: {
        maxTurns: 10.5,
      },
      triggers: [],
    };

    const result = WardenConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
