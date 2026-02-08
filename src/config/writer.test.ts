import { describe, it, expect } from 'vitest';
import { generateSkillToml } from './writer.js';
import type { SkillConfig } from './schema.js';

describe('generateSkillToml', () => {
  it('generates basic skill TOML with trigger', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      triggers: [
        { type: 'pull_request', actions: ['opened', 'synchronize'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('[[skills]]');
    expect(result).toContain('name = "security-review"');
    expect(result).toContain('[[skills.triggers]]');
    expect(result).toContain('type = "pull_request"');
    expect(result).toContain('actions = ["opened", "synchronize"]');
  });

  it('includes remote field when present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      remote: 'getsentry/skills@abc123',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('remote = "getsentry/skills@abc123"');
  });

  it('omits remote field when not present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).not.toContain('remote');
  });

  it('includes paths when present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      paths: ['src/**/*.ts'],
      ignorePaths: ['**/*.test.ts'],
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('paths = ["src/**/*.ts"]');
    expect(result).toContain('ignorePaths = ["**/*.test.ts"]');
  });

  it('includes flattened output fields when present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      failOn: 'high',
      reportOn: 'medium',
      maxFindings: 10,
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('failOn = "high"');
    expect(result).toContain('reportOn = "medium"');
    expect(result).toContain('maxFindings = 10');
  });

  it('includes model when present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      model: 'claude-sonnet-4-20250514',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('model = "claude-sonnet-4-20250514"');
  });

  it('handles local trigger type', () => {
    const skill: SkillConfig = {
      name: 'code-simplifier',
      triggers: [
        { type: 'local' },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('type = "local"');
    expect(result).not.toContain('actions');
  });

  it('handles schedule trigger without actions', () => {
    const skill: SkillConfig = {
      name: 'weekly-scan',
      paths: ['src/**/*.ts'],
      triggers: [
        { type: 'schedule' },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('type = "schedule"');
    expect(result).not.toContain('actions');
  });

  it('handles skill with no triggers', () => {
    const skill: SkillConfig = {
      name: 'wildcard-skill',
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('[[skills]]');
    expect(result).toContain('name = "wildcard-skill"');
    expect(result).not.toContain('[[skills.triggers]]');
  });

  it('includes trigger-level overrides', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      triggers: [
        {
          type: 'pull_request',
          actions: ['opened'],
          model: 'claude-opus-4-20250514',
          failOn: 'critical',
          reportOn: 'high',
          maxFindings: 5,
        },
      ],
    };

    const result = generateSkillToml(skill);

    // Trigger-level overrides should appear after the [[skills.triggers]] header
    const triggerSection = result.split('[[skills.triggers]]')[1]!;
    expect(triggerSection).toContain('model = "claude-opus-4-20250514"');
    expect(triggerSection).toContain('failOn = "critical"');
    expect(triggerSection).toContain('reportOn = "high"');
    expect(triggerSection).toContain('maxFindings = 5');
  });

  it('includes reportOnSuccess when present', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      reportOnSuccess: true,
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('reportOnSuccess = true');
  });

  it('includes reportOnSuccess = false', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      reportOnSuccess: false,
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('reportOnSuccess = false');
  });

  it('includes trigger-level maxTurns', () => {
    const skill: SkillConfig = {
      name: 'security-review',
      triggers: [
        {
          type: 'pull_request',
          actions: ['opened'],
          maxTurns: 3,
        },
      ],
    };

    const result = generateSkillToml(skill);

    const triggerSection = result.split('[[skills.triggers]]')[1]!;
    expect(triggerSection).toContain('maxTurns = 3');
  });

  it('includes schedule config for schedule triggers', () => {
    const skill: SkillConfig = {
      name: 'weekly-scan',
      paths: ['src/**/*.ts'],
      triggers: [
        {
          type: 'schedule',
          schedule: {
            issueTitle: 'Weekly Security Scan',
            createFixPR: true,
            fixBranchPrefix: 'security-fix',
          },
        },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('[skills.triggers.schedule]');
    expect(result).toContain('issueTitle = "Weekly Security Scan"');
    expect(result).toContain('createFixPR = true');
    expect(result).toContain('fixBranchPrefix = "security-fix"');
  });

  it('omits default fixBranchPrefix in schedule config', () => {
    const skill: SkillConfig = {
      name: 'weekly-scan',
      paths: ['src/**/*.ts'],
      triggers: [
        {
          type: 'schedule',
          schedule: {
            createFixPR: false,
            fixBranchPrefix: 'warden-fix',
          },
        },
      ],
    };

    const result = generateSkillToml(skill);

    expect(result).toContain('[skills.triggers.schedule]');
    expect(result).toContain('createFixPR = false');
    expect(result).not.toContain('fixBranchPrefix');
  });

  it('generates multiple triggers for one skill', () => {
    const skill: SkillConfig = {
      name: 'multi-trigger',
      triggers: [
        { type: 'pull_request', actions: ['opened'] },
        { type: 'local' },
      ],
    };

    const result = generateSkillToml(skill);

    const triggerCount = (result.match(/\[\[skills\.triggers\]\]/g) || []).length;
    expect(triggerCount).toBe(2);
  });
});
