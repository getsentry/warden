import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Runtime, SynthesisRunRequest } from '../sdk/runtimes/index.js';
import type { ProvidersConfig } from '../config/schema.js';
import { buildSkillOutline, collectSkillImproveSource } from './outline.js';
import { SKILL_BUILD_VERSION, SKILL_BUILD_OUTLINE_SCHEMA_VERSION, type SkillBuildOutline } from './outline-contract.js';
import {
  getBuildStatePath,
  readSkillBuildState,
  SKILL_BUILD_STATE_KIND,
  SKILL_BUILD_STATE_SCHEMA_VERSION,
  writeSkillBuildState,
} from './outline-state.js';

describe('skill build state', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('writes and reads the current build-state contract', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-build-state-'));
    tempDirs.push(rootDir);

    const statePath = getBuildStatePath(rootDir);
    writeSkillBuildState(statePath, {
      version: SKILL_BUILD_STATE_SCHEMA_VERSION,
      kind: SKILL_BUILD_STATE_KIND,
      identity: { requestedModel: 'claude-sonnet-4-5' },
      outline: {
        version: 1,
        skill: 'security',
        sourceHash: 'source-hash',
        buildVersion: '1',
        scopeProfile: {
          kind: 'domain',
          subject: 'Generic security review',
          localContextUsed: false,
          observedContext: ['Generic security review'],
          unresolvedContext: [],
        },
        build: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
          externalSources: [],
        },
        tracks: [{
          id: 'auth-bypass',
          title: 'Authentication bypasses',
          goal: 'Find broken authentication checks.',
          rationale: 'Authentication bugs are core security issues.',
          sourceSignals: ['Auth endpoints'],
          owns: ['Missing auth checks'],
          excludes: ['Credential storage'],
          relevanceSignals: ['Session checks'],
          evidenceFocus: ['Changed auth conditions'],
          checks: ['Trace auth preconditions'],
          safeCounterpatterns: ['Explicit user verification'],
          falsePositiveTraps: ['Defense-in-depth logging'],
          researchHints: [],
        }],
      },
      outlineRun: {
        durationMs: 5000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheCreation5mInputTokens: 0,
          cacheCreation1hInputTokens: 0,
          webSearchRequests: 0,
          costUSD: 0.01,
        },
        responseModel: 'claude-sonnet-4-5',
        numTurns: 1,
      },
      artifact: {
        version: 5,
        sourceHash: 'source-hash',
        outlineHash: 'outline-hash',
        buildVersion: '1',
        authoringProvider: {
          name: 'skill-writer',
          rootDir: '/tmp/skill-writer',
          contentHash: 'provider-hash',
        },
        name: 'security',
        fileManifest: [
          { path: 'SKILL.md', bytes: 512 },
          { path: 'references/auth-bypass.md', bytes: 512 },
        ],
        deterministicWarnings: [],
        bytes: 1024,
        durationMs: 5000,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheCreation5mInputTokens: 0,
          cacheCreation1hInputTokens: 0,
          webSearchRequests: 0,
          costUSD: 0.01,
        },
        externalSources: [],
        missingInputs: [],
        authoringWarnings: [],
        responseModel: 'claude-sonnet-4-5',
        numTurns: 2,
        generatedAt: '2026-05-01T00:00:00.000Z',
      },
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    expect(readSkillBuildState(statePath)).toMatchObject({
      version: 1,
      kind: 'skill-build-state',
      outline: {
        skill: 'security',
        buildVersion: '1',
      },
      artifact: {
        name: 'security',
        buildVersion: '1',
      },
    });
  });

  it('collects improvement briefs with current generated artifacts', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-improve-source-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'security');
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: Find security issues.
`, 'utf-8');
    writeFileSync(join(rootDir, 'SKILL.md'), '---\nname: security\n---\n', 'utf-8');
    writeFileSync(join(rootDir, 'references', 'auth.md'), '# Auth\n', 'utf-8');
    writeFileSync(join(rootDir, 'build-state.json'), '{"ignored":true}\n', 'utf-8');

    const source = collectSkillImproveSource({
      name: 'security',
      description: 'Security skill',
      prompt: 'Find security issues.',
      rootDir,
    }, 'Tighten auth guidance.');

    expect(source.files.map((file) => file.path)).toEqual(expect.arrayContaining([
      'warden.yaml',
      'improvement-brief.md',
      'current-artifacts/SKILL.md',
      'current-artifacts/references/auth.md',
    ]));
    expect(source.files.find((file) => file.path === 'improvement-brief.md')?.content).toBe(
      'Tighten auth guidance.',
    );
  });
});

describe('buildSkillOutline: custom providers forwarding', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('forwards providerOptions to runSynthesis when providers are configured', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-outline-providers-'));
    tempDirs.push(rootDir);
    // Write a minimal warden.yaml so generatedSkillDefinitionSourceFile can load it.
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1\nkind: generated-skill\nname: security\nprompt: Find security issues.\n`, 'utf-8');

    const providers: ProvidersConfig = {
      litellm: {
        baseUrl: 'http://localhost:4000',
        api: 'openai-completions',
        models: [{ id: 'litellm/gpt-4o', name: 'gpt-4o' }],
      },
    };

    // Build a minimal valid outline to return from the stub.
    const fakeOutline: SkillBuildOutline = {
      version: SKILL_BUILD_OUTLINE_SCHEMA_VERSION,
      skill: 'security',
      sourceHash: 'placeholder', // overwritten after source is collected
      buildVersion: SKILL_BUILD_VERSION,
      scopeProfile: {
        kind: 'domain',
        subject: 'Generic security review',
        localContextUsed: false,
        observedContext: ['Generic security review'],
        unresolvedContext: [],
      },
      build: {
        phases: [{ id: 'build-tracks', status: 'generated' }],
      },
      tracks: [{
        id: 'auth-bypass',
        title: 'Authentication bypasses',
        goal: 'Find broken authentication checks.',
        rationale: 'Authentication bugs are core security issues.',
        sourceSignals: ['Auth endpoints'],
        owns: ['Missing auth checks'],
        excludes: [],
        relevanceSignals: ['Session checks'],
        evidenceFocus: ['Changed auth conditions'],
        checks: ['Trace auth preconditions'],
        safeCounterpatterns: ['Explicit user verification'],
        falsePositiveTraps: ['Defense-in-depth logging'],
        researchHints: [],
      }],
    };

    const capturedRequests: SynthesisRunRequest<unknown>[] = [];

    const mockRuntime: Runtime = {
      name: 'pi',
      runSkill: vi.fn().mockResolvedValue({ result: undefined }),
      runAuxiliary: vi.fn().mockResolvedValue({ success: false, error: 'not used', usage: {} }),
      runSynthesis: vi.fn().mockImplementation(async (req: SynthesisRunRequest<unknown>) => {
        capturedRequests.push(req);
        // Return a valid outline with the correct sourceHash for the collected source.
        const outline = { ...fakeOutline, sourceHash: req.prompt.match(/sourceHash "([^"]+)"/)?.[1] ?? fakeOutline.sourceHash };
        return { success: true as const, data: outline, usage: { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, cacheCreation5mInputTokens: 0, cacheCreation1hInputTokens: 0, webSearchRequests: 0, costUSD: 0 } };
      }),
    };

    await buildSkillOutline({
      skill: { name: 'security', description: 'Security skill', prompt: 'Find security issues.', rootDir },
      runtime: mockRuntime,
      providers,
      regenerate: true,
    });

    expect(capturedRequests).toHaveLength(1);
    const req = capturedRequests[0]!;
    // providerOptions must be forwarded: it is a PiProviderOptions object with providers[0].name === 'litellm'
    expect(req.providerOptions).toBeDefined();
    const po = req.providerOptions as { providers: { name: string }[] };
    expect(po.providers[0]!.name).toBe('litellm');
  });

  it('forwards providerOptions through the repoPath agentic branch', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-outline-providers-repo-'));
    tempDirs.push(rootDir);
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1\nkind: generated-skill\nname: security\nprompt: Find security issues.\n`, 'utf-8');

    const providers: ProvidersConfig = {
      litellm: {
        baseUrl: 'http://localhost:4000',
        api: 'openai-completions',
        models: [{ id: 'litellm/gpt-4o', name: 'gpt-4o' }],
      },
    };

    const fakeOutline: SkillBuildOutline = {
      version: SKILL_BUILD_OUTLINE_SCHEMA_VERSION,
      skill: 'security',
      sourceHash: 'placeholder',
      buildVersion: SKILL_BUILD_VERSION,
      scopeProfile: {
        kind: 'domain',
        subject: 'Generic security review',
        localContextUsed: false,
        observedContext: ['Generic security review'],
        unresolvedContext: [],
      },
      build: {
        phases: [{ id: 'build-tracks', status: 'generated' }],
      },
      tracks: [{
        id: 'auth-bypass',
        title: 'Authentication bypasses',
        goal: 'Find broken authentication checks.',
        rationale: 'Authentication bugs are core security issues.',
        sourceSignals: ['Auth endpoints'],
        owns: ['Missing auth checks'],
        excludes: [],
        relevanceSignals: ['Session checks'],
        evidenceFocus: ['Changed auth conditions'],
        checks: ['Trace auth preconditions'],
        safeCounterpatterns: ['Explicit user verification'],
        falsePositiveTraps: ['Defense-in-depth logging'],
        researchHints: [],
      }],
    };

    // The agentic branch (repoPath set) runs through runtime.runSkill and parses
    // the structured outline from result.text. Echo the correct sourceHash back so
    // validateOutlineIdentity passes.
    const capturedRequests: { providerOptions?: unknown }[] = [];
    const mockRuntime: Runtime = {
      name: 'pi',
      runSkill: vi.fn().mockImplementation(async (req: { userPrompt: string; providerOptions?: unknown }) => {
        capturedRequests.push({ providerOptions: req.providerOptions });
        const sourceHash = req.userPrompt.match(/sourceHash "([^"]+)"/)?.[1] ?? fakeOutline.sourceHash;
        return {
          result: {
            status: 'success' as const,
            text: JSON.stringify({ ...fakeOutline, sourceHash }),
            errors: [],
            usage: { inputTokens: 10, outputTokens: 5, costUSD: 0 },
          },
        };
      }),
      runAuxiliary: vi.fn().mockResolvedValue({ success: false, error: 'not used', usage: {} }),
      runSynthesis: vi.fn().mockResolvedValue({ success: false, error: 'should not be called', usage: {} }),
    };

    await buildSkillOutline({
      skill: { name: 'security', description: 'Security skill', prompt: 'Find security issues.', rootDir },
      runtime: mockRuntime,
      repoPath: rootDir,
      providers,
      regenerate: true,
    });

    expect(mockRuntime.runSynthesis).not.toHaveBeenCalled();
    expect(capturedRequests).toHaveLength(1);
    const po = capturedRequests[0]!.providerOptions as { providers: { name: string }[] };
    expect(po.providers[0]!.name).toBe('litellm');
  });
});
