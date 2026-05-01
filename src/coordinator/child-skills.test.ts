import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Runtime } from '../sdk/runtimes/index.js';
import {
  COORDINATOR_PLAN_SCHEMA_VERSION,
  COORDINATOR_VERSION,
  type CoordinatorPlan,
  type CoordinatorSource,
} from './plan.js';
import {
  buildCoordinatorChildSkillsResult,
  resetCoordinatorChildSkillsRoot,
  synthesizeCoordinatorChildSkill,
} from './child-skills.js';

function emptyUsage() {
  return {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0.01,
  };
}

function createPlan(): CoordinatorPlan {
  return {
    version: COORDINATOR_PLAN_SCHEMA_VERSION,
    skill: 'security-review',
    sourceHash: 'hash',
    coordinatorVersion: COORDINATOR_VERSION,
    scopeProfile: {
      kind: 'repository',
      subject: 'Security review for runtime and workflow boundaries',
      localContextUsed: true,
      observedContext: ['Node.js and TypeScript runtime', 'Workflow permission boundaries'],
      unresolvedContext: [],
    },
    synthesis: {
      phases: [{ id: 'collect-inputs', status: 'generated' }],
    },
    tasks: [{
      id: 'authz',
      title: 'Authorization',
      goal: 'Find authorization failures.',
      rationale: 'This repo gates privileged actions and workflow execution.',
      sourceSignals: ['Workflow permission boundaries', 'Privileged runtime operations'],
      owns: ['Authorization boundary failures'],
      excludes: ['Style issues'],
      evidenceFocus: ['Trace the permission boundary.'],
      childResearchHints: ['Framework authorization guidance'],
    }],
  };
}

describe('Superwarden child skill synthesis', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-child-synthesis-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs a structured agent pass and writes child skill artifacts', async () => {
    const plan = createPlan();
    const source: CoordinatorSource = {
      hash: 'hash',
      files: [{ path: 'SKILL.md', content: 'Review security issues.' }],
    };
    const childJson = {
      version: 1,
      parentSkill: 'security-review',
      taskId: 'authz',
      name: 'authz',
      description: 'Review authorization failures.',
      skillBody: 'Use WebSearch or WebFetch when public prior art matters.',
      specMd: '# authz Specification\n\n## Intent\n\nReview authorization.\n\n## Scope\n\nIn scope.\n\n## Users And Trigger Context\n\nSecurity reviewers.\n\n## Runtime Contract\n\nRun through Warden.\n\n## Source And Evidence Model\n\nUse changed code.\n\n## Reference Architecture\n\nSKILL.md contains runtime instructions.\n\n## Evaluation\n\nValidate findings.\n\n## Known Limitations\n\nMissing context may limit findings.\n\n## Maintenance Notes\n\nRegenerate when scope changes.\n',
      sourcesMd: '# authz Sources\n\n## Source Inventory\n\n| Source | Trust tier | Confidence | Contribution | Usage constraints |\n| --- | --- | --- | --- | --- |\n| Task | canonical | high | Scope | None |\n\n## Decisions\n\n- Require evidence.\n\n## Coverage Matrix\n\n| Dimension | Coverage status | Evidence |\n| --- | --- | --- |\n| Vulnerability prerequisites | complete | Task scope |\n\n## Open Gaps\n\n- None.\n\n## Changelog\n\n- Initial synthesis.\n',
      externalSources: [{ title: 'OWASP', url: 'https://owasp.org', reason: 'Prior art' }],
      missingInputs: [],
    };
    const runtime: Runtime = {
      name: 'claude',
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
      runSkill: vi.fn(async () => ({
        result: {
          status: 'success' as const,
          text: JSON.stringify(childJson),
          errors: [],
          usage: emptyUsage(),
          durationMs: 12_000,
          responseModel: 'agent-model',
          numTurns: 4,
        },
      })),
    };
    const cachePath = join(tempDir, 'plan.json');
    const rootDir = resetCoordinatorChildSkillsRoot(cachePath);

    const artifact = await synthesizeCoordinatorChildSkill({
      plan,
      task: plan.tasks[0]!,
      source,
      cachePath,
      rootDir,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    });
    const summary = buildCoordinatorChildSkillsResult(rootDir, [artifact], 1_500);

    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      tools: { allowed: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'] },
      repoPath: tempDir,
      skillName: 'authz:superwarden-child-synthesis',
      userPrompt: expect.stringContaining('## Users And Trigger Context'),
    }));
    expect(existsSync(join(artifact.path, 'SKILL.md'))).toBe(true);
    expect(readFileSync(join(artifact.path, 'SKILL.md'), 'utf-8')).toContain(
      'allowed-tools: Read Grep Glob WebFetch WebSearch',
    );
    expect(artifact.source).toBe('generated');
    expect(artifact.durationMs).toBe(12_000);
    expect(artifact.externalSources).toHaveLength(1);
    expect(summary.durationMs).toBe(1_500);
    expect(summary.usage.inputTokens).toBe(1000);
  });

  it('reuses cached child skill artifacts when task inputs match', async () => {
    const plan = createPlan();
    const source: CoordinatorSource = {
      hash: 'hash',
      files: [{ path: 'SKILL.md', content: 'Review security issues.' }],
    };
    const childJson = {
      version: 1,
      parentSkill: 'security-review',
      taskId: 'authz',
      name: 'authz',
      description: 'Review authorization failures.',
      skillBody: 'Use WebSearch or WebFetch when public prior art matters.',
      specMd: '# authz Specification\n\n## Intent\n\nReview authorization.\n\n## Scope\n\nIn scope.\n\n## Users And Trigger Context\n\nSecurity reviewers.\n\n## Runtime Contract\n\nRun through Warden.\n\n## Source And Evidence Model\n\nUse changed code.\n\n## Reference Architecture\n\nSKILL.md contains runtime instructions.\n\n## Evaluation\n\nValidate findings.\n\n## Known Limitations\n\nMissing context may limit findings.\n\n## Maintenance Notes\n\nRegenerate when scope changes.\n',
      sourcesMd: '# authz Sources\n\n## Source Inventory\n\n| Source | Trust tier | Confidence | Contribution | Usage constraints |\n| --- | --- | --- | --- | --- |\n| Task | canonical | high | Scope | None |\n\n## Decisions\n\n- Require evidence.\n\n## Coverage Matrix\n\n| Dimension | Coverage status | Evidence |\n| --- | --- | --- |\n| Vulnerability prerequisites | complete | Task scope |\n\n## Open Gaps\n\n- None.\n\n## Changelog\n\n- Initial synthesis.\n',
      externalSources: [{ title: 'OWASP', url: 'https://owasp.org', reason: 'Prior art' }],
      missingInputs: [],
    };
    const runtime: Runtime = {
      name: 'claude',
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
      runSkill: vi.fn(async () => ({
        result: {
          status: 'success' as const,
          text: JSON.stringify(childJson),
          errors: [],
          usage: emptyUsage(),
          durationMs: 12_000,
          responseModel: 'agent-model',
          numTurns: 4,
        },
      })),
    };
    const cachePath = join(tempDir, 'plan.json');
    const rootDir = resetCoordinatorChildSkillsRoot(cachePath);

    const generated = await synthesizeCoordinatorChildSkill({
      plan,
      task: plan.tasks[0]!,
      source,
      cachePath,
      rootDir,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    });
    const cached = await synthesizeCoordinatorChildSkill({
      plan,
      task: plan.tasks[0]!,
      source,
      cachePath,
      rootDir,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    });

    expect(runtime.runSkill).toHaveBeenCalledTimes(1);
    expect(generated.source).toBe('generated');
    expect(cached.source).toBe('cache');
    expect(cached.durationMs).toBe(12_000);
    expect(cached.usage.inputTokens).toBe(1000);
    expect(cached.externalSources).toHaveLength(1);
    expect(readdirSync(generated.path).sort()).toEqual(['SKILL.md', 'SOURCES.md', 'SPEC.md']);
    const cacheRecord = JSON.parse(readFileSync(cachePath, 'utf-8'));
    expect(cacheRecord.plan.tasks[0].id).toBe('authz');
    expect(cacheRecord.childSkills.authz.durationMs).toBe(12_000);
    expect(cacheRecord.childSkills.authz.usage.inputTokens).toBe(1000);
  });

  it('includes raw agent output when child synthesis returns no JSON', async () => {
    const plan = createPlan();
    const source: CoordinatorSource = {
      hash: 'hash',
      files: [{ path: 'SKILL.md', content: 'Review security issues.' }],
    };
    const runtime: Runtime = {
      name: 'claude',
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
      runSkill: vi.fn(async () => ({
        stderr: 'diagnostic line from claude',
        result: {
          status: 'success' as const,
          text: 'I inspected the repository but need more context before writing the child skill.',
          errors: [],
          usage: emptyUsage(),
          durationMs: 12_000,
          responseModel: 'agent-model',
          numTurns: 4,
        },
      })),
    };
    const cachePath = join(tempDir, 'plan.json');
    const rootDir = resetCoordinatorChildSkillsRoot(cachePath);

    await expect(synthesizeCoordinatorChildSkill({
      plan,
      task: plan.tasks[0]!,
      source,
      cachePath,
      rootDir,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    })).rejects.toThrow(
      /Child skill synthesis failed for authz: Superwarden agent output failed validation or repair: repair_failed: no_json[\s\S]*Model: agent-model[\s\S]*Usage: 2,000 input \/ 1,000 output tokens[\s\S]*Claude Code stderr:[\s\S]*diagnostic line from claude[\s\S]*Raw output:[\s\S]*need more context/,
    );
    expect(runtime.runAuxiliary).not.toHaveBeenCalled();
  });

  it('tells child synthesis to exclude sibling task concerns', async () => {
    const plan: CoordinatorPlan = {
      version: COORDINATOR_PLAN_SCHEMA_VERSION,
      skill: 'security-review',
      sourceHash: 'hash',
      coordinatorVersion: COORDINATOR_VERSION,
      scopeProfile: {
        kind: 'repository',
        subject: 'Security review for runtime and workflow boundaries',
        localContextUsed: true,
        observedContext: ['Node.js and TypeScript runtime', 'Workflow permission boundaries'],
        unresolvedContext: [],
      },
      synthesis: {
        phases: [{ id: 'collect-inputs', status: 'generated' }],
      },
      tasks: [
        {
          id: 'authz',
          title: 'Authorization',
          goal: 'Find authorization failures.',
          rationale: 'This repo gates privileged actions and workflow execution.',
          sourceSignals: ['Workflow permission boundaries', 'Privileged runtime operations'],
          owns: ['Authorization boundary failures'],
          excludes: ['Style issues'],
          evidenceFocus: ['Trace the permission boundary.'],
          childResearchHints: ['Framework authorization guidance'],
        },
        {
          id: 'secrets',
          title: 'Secret handling',
          goal: 'Find secret exposure issues.',
          rationale: 'This repo brokers credentials and workflow secrets.',
          sourceSignals: ['Secret handling paths', 'Workflow token usage'],
          owns: ['Secret exposure and credential leakage'],
          excludes: ['Authorization-only issues'],
          evidenceFocus: ['Trace where secrets are persisted or exposed.'],
          childResearchHints: ['Secret management guidance'],
        },
      ],
    };
    const source: CoordinatorSource = {
      hash: 'hash',
      files: [{ path: 'SKILL.md', content: 'Review security issues.' }],
    };
    const childJson = {
      version: 1,
      parentSkill: 'security-review',
      taskId: 'authz',
      name: 'authz',
      description: 'Review authorization failures.',
      skillBody: '## Do not cover\n- Secret handling concerns.\n',
      specMd: '# authz Specification\n\n## Intent\n\nReview authorization.\n\n## Scope\n\nIn scope.\n\n## Users And Trigger Context\n\nSecurity reviewers.\n\n## Runtime Contract\n\nRun through Warden.\n\n## Source And Evidence Model\n\nUse changed code.\n\n## Reference Architecture\n\nSKILL.md contains runtime instructions.\n\n## Evaluation\n\nValidate findings.\n\n## Known Limitations\n\nMissing context may limit findings.\n\n## Maintenance Notes\n\nRegenerate when scope changes.\n',
      sourcesMd: '# authz Sources\n\n## Source Inventory\n\n| Source | Trust tier | Confidence | Contribution | Usage constraints |\n| --- | --- | --- | --- | --- |\n| Task | canonical | high | Scope | None |\n\n## Decisions\n\n- Require evidence.\n\n## Coverage Matrix\n\n| Dimension | Coverage status | Evidence |\n| --- | --- | --- |\n| Vulnerability prerequisites | complete | Task scope |\n\n## Open Gaps\n\n- None.\n\n## Changelog\n\n- Initial synthesis.\n',
      externalSources: [],
      missingInputs: [],
    };
    const runtime: Runtime = {
      name: 'claude',
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
      runSkill: vi.fn().mockResolvedValue({
        result: {
          status: 'success' as const,
          text: JSON.stringify(childJson),
          errors: [],
          usage: emptyUsage(),
          durationMs: 12_000,
          responseModel: 'agent-model',
          numTurns: 4,
        },
      }),
    };
    const cachePath = join(tempDir, 'plan.json');
    const rootDir = resetCoordinatorChildSkillsRoot(cachePath);

    await synthesizeCoordinatorChildSkill({
      plan,
      task: plan.tasks[0]!,
      source,
      cachePath,
      rootDir,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    });

    expect(runtime.runSkill).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userPrompt: expect.stringContaining('Sibling tasks that this child skill must not absorb'),
    }));
    expect(runtime.runSkill).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userPrompt: expect.stringContaining('- secrets: Secret handling'),
    }));
    expect(runtime.runSkill).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userPrompt: expect.stringContaining('Parent scope profile'),
    }));
  });
});
