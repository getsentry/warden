import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBuildStatePath, readSkillBuildState, resolveSkillBuildStatePath } from './outline.js';

describe('resolveSkillBuildStatePath', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('prefers build-state.json and falls back to legacy synthesis.json', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-build-state-'));
    tempDirs.push(rootDir);

    expect(resolveSkillBuildStatePath(rootDir)).toBe(join(rootDir, 'synthesis.json'));

    writeFileSync(join(rootDir, 'synthesis.json'), '{}\n', 'utf-8');
    expect(resolveSkillBuildStatePath(rootDir)).toBe(join(rootDir, 'synthesis.json'));

    writeFileSync(getBuildStatePath(rootDir), '{}\n', 'utf-8');
    expect(resolveSkillBuildStatePath(rootDir)).toBe(getBuildStatePath(rootDir));
  });

  it('normalizes legacy state fields on read', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-build-state-'));
    tempDirs.push(rootDir);

    writeFileSync(join(rootDir, 'synthesis.json'), `${JSON.stringify({
      version: 1,
      kind: 'skill-build-state',
      outline: {
        version: 1,
        skill: 'security',
        sourceHash: 'source-hash',
        synthesisVersion: '1',
        scopeProfile: {
          kind: 'domain',
          subject: 'Generic security review',
          localContextUsed: false,
          observedContext: ['Generic security review'],
          unresolvedContext: [],
        },
        synthesis: {
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
      artifact: {
        version: 3,
        sourceHash: 'source-hash',
        outlineHash: 'outline-hash',
        synthesisVersion: '1',
        name: 'security',
        trackIds: ['auth-bypass'],
        referenceManifest: [{
          trackId: 'auth-bypass',
          path: 'references/tracks/auth-bypass.md',
          role: 'procedure',
          openWhen: 'authentication checks are present',
        }],
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
        generatedAt: '2026-05-01T00:00:00.000Z',
      },
      updatedAt: '2026-05-01T00:00:00.000Z',
    }, null, 2)}\n`, 'utf-8');

    const state = readSkillBuildState(join(rootDir, 'synthesis.json'));

    expect(state?.outline.buildVersion).toBe('1');
    expect(state?.outline.build.phases).toEqual([{ id: 'collect-inputs', status: 'generated' }]);
    expect(state?.artifact?.buildVersion).toBe('1');
  });
});
