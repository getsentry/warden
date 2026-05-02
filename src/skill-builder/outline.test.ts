import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
        version: 4,
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
        validationIssues: [],
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
});
