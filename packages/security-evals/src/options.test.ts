import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MATRIX_SKILLS, WARDEN_SKILLS_REF, laneConfig, resolveSuiteOptions } from './options.js';

describe('resolveSuiteOptions', () => {
  it('defaults to the production lane over every matrix skill', () => {
    const options = resolveSuiteOptions({});
    expect(options).toMatchObject({
      skills: [...MATRIX_SKILLS],
      entries: [],
      repeats: 1,
      runtime: 'pi',
      model: 'openrouter/x-ai/grok-4.5',
      effort: 'high',
      auxiliaryModel: 'openrouter/openai/gpt-5.6-luna',
      auxiliaryEffort: 'high',
      maxTurns: 100,
      removeWorktrees: false,
    });
    expect(options.baseline).toMatch(/baseline\/results\.json$/);
  });

  it('reads filters and overrides from env', () => {
    const options = resolveSuiteOptions({
      WARDEN_SECURITY_EVALS_SKILLS: 'wrdn-pii, security-review',
      WARDEN_SECURITY_EVALS_ENTRIES: 'wrdn-pii/*',
      WARDEN_SECURITY_EVALS_REPEATS: '3',
      WARDEN_SECURITY_EVALS_BASELINE: 'none',
      WARDEN_SECURITY_EVALS_SKILLS_REPO: '/src/warden-skills',
    });
    expect(options.skillsRepo).toBe('/src/warden-skills');
    expect(options.skills).toEqual(['wrdn-pii', 'security-review']);
    expect(options.entries).toEqual(['wrdn-pii/*']);
    expect(options.repeats).toBe(3);
    expect(options.baseline).toBeUndefined();
  });

  it('maps --repo pairs and the --sentry-repo alias onto one clone per repository', () => {
    expect(resolveSuiteOptions({
      WARDEN_SECURITY_EVALS_REPOS: 'getsentry/getsentry=/src/getsentry',
      WARDEN_SECURITY_EVALS_SENTRY_REPO: '/src/sentry',
    }).repos).toEqual({ 'getsentry/getsentry': '/src/getsentry', 'getsentry/sentry': '/src/sentry' });
    expect(() => resolveSuiteOptions({ WARDEN_SECURITY_EVALS_REPOS: '/src/sentry' })).toThrow('owner/name=<path>');
    expect(() => resolveSuiteOptions({
      WARDEN_SECURITY_EVALS_REPOS: 'getsentry/sentry=/a',
      WARDEN_SECURITY_EVALS_SENTRY_REPO: '/b',
    })).toThrow('set by both');
  });

  it('records provenance a baseline lane must match', () => {
    const options = resolveSuiteOptions({});
    expect(laneConfig('security-review', options)).toMatchObject({ skillRef: 'builtin', model: 'openrouter/x-ai/grok-4.5' });
    expect(laneConfig('wrdn-pii', options).skillRef).toBe(`getsentry/warden-skills@${WARDEN_SKILLS_REF}`);
    expect(laneConfig('wrdn-pii', options).wardenVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('pins the same warden-skills ref the CI workflow checks out', () => {
    const workflow = readFileSync(
      join(import.meta.dirname, '..', '..', '..', '.github', 'workflows', 'security-evals.yml'),
      'utf8',
    );
    expect(workflow).toContain(`WARDEN_SKILLS_REF: ${WARDEN_SKILLS_REF}`);
  });

  it('rejects unknown skills and bad counts', () => {
    expect(() => resolveSuiteOptions({ WARDEN_SECURITY_EVALS_SKILLS: 'wrdn-nope' })).toThrow('Unknown skills');
    expect(() => resolveSuiteOptions({ WARDEN_SECURITY_EVALS_REPEATS: '0' })).toThrow('positive integer');
  });
});
