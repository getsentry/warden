import { describe, it, expect } from 'vitest';
import { generateTriggerToml } from './writer.js';
import type { Trigger } from './schema.js';

describe('generateTriggerToml', () => {
  it('generates basic trigger TOML', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened', 'synchronize'],
      skill: 'security-review',
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('[[triggers]]');
    expect(result).toContain('name = "security-review"');
    expect(result).toContain('event = "pull_request"');
    expect(result).toContain('actions = ["opened", "synchronize"]');
    expect(result).toContain('skill = "security-review"');
  });

  it('includes remote field when present', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened'],
      skill: 'security-review',
      remote: 'getsentry/skills@abc123',
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('remote = "getsentry/skills@abc123"');
  });

  it('omits remote field when not present', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened'],
      skill: 'security-review',
    };

    const result = generateTriggerToml(trigger);

    expect(result).not.toContain('remote');
  });

  it('includes filters when present', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened'],
      skill: 'security-review',
      filters: {
        paths: ['src/**/*.ts'],
        ignorePaths: ['**/*.test.ts'],
      },
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('[triggers.filters]');
    expect(result).toContain('paths = ["src/**/*.ts"]');
    expect(result).toContain('ignorePaths = ["**/*.test.ts"]');
  });

  it('includes output config when present', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened'],
      skill: 'security-review',
      output: {
        failOn: 'high',
        commentOn: 'medium',
        maxFindings: 10,
      },
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('[triggers.output]');
    expect(result).toContain('failOn = "high"');
    expect(result).toContain('commentOn = "medium"');
    expect(result).toContain('maxFindings = 10');
  });

  it('includes model when present', () => {
    const trigger: Trigger = {
      name: 'security-review',
      event: 'pull_request',
      actions: ['opened'],
      skill: 'security-review',
      model: 'claude-sonnet-4-20250514',
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('model = "claude-sonnet-4-20250514"');
  });

  it('handles schedule events without actions', () => {
    const trigger: Trigger = {
      name: 'weekly-scan',
      event: 'schedule',
      skill: 'security-review',
      filters: {
        paths: ['src/**/*.ts'],
      },
    };

    const result = generateTriggerToml(trigger);

    expect(result).toContain('event = "schedule"');
    expect(result).not.toContain('actions');
  });
});
