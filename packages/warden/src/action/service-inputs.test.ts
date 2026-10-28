import { afterEach, describe, expect, it } from 'vitest';
import { parseActionInputs, validateInputs } from './inputs.js';

const keys = [
  'INPUT_GITHUB_TOKEN',
  'INPUT_SERVICE_URL',
  'INPUT_SERVICE_TOKEN',
  'INPUT_SERVICE_DATA',
  'INPUT_SERVICE_MEMORY',
  'INPUT_SERVICE_TIMEOUT_MS',
] as const;

afterEach(() => {
  for (const key of keys) Reflect.deleteProperty(process.env, key);
});

describe('service Action inputs', () => {
  it('leaves optional policy inputs unset so environment and config can supply them', () => {
    process.env['INPUT_GITHUB_TOKEN'] = 'github-token';

    expect(parseActionInputs()).toMatchObject({
      serviceUrl: undefined,
      serviceData: undefined,
      serviceMemory: undefined,
      serviceTimeoutMs: undefined,
    });
  });

  it('parses the masked token and explicit profile without logging either', () => {
    process.env['INPUT_GITHUB_TOKEN'] = 'github-token';
    process.env['INPUT_SERVICE_URL'] = 'https://warden.example.com';
    process.env['INPUT_SERVICE_TOKEN'] = 'service-secret';
    process.env['INPUT_SERVICE_DATA'] = 'code';
    process.env['INPUT_SERVICE_MEMORY'] = 'true';
    process.env['INPUT_SERVICE_TIMEOUT_MS'] = '1200';

    const inputs = parseActionInputs();

    expect(inputs).toMatchObject({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-secret',
      serviceData: 'code',
      serviceMemory: true,
      serviceTimeoutMs: 1_200,
    });
    expect(() => validateInputs(inputs)).not.toThrow();
  });

  it('rejects feature/profile combinations before a request', () => {
    expect(() => validateInputs({
      ...parseActionInputs(),
      githubToken: 'github-token',
      serviceData: 'metrics',
      serviceMemory: true,
    })).toThrow('service-memory requires');
  });
});
