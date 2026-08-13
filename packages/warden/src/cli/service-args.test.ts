import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './args.js';

describe('service CLI options', () => {
  it('parses the optional service profile and deadline flags', () => {
    expect(parseCliArgs([
      'run',
      'HEAD',
      '--service-url', 'https://warden.example.com',
      '--service-data', 'code',
      '--service-memory',
      '--service-timeout-ms', '1500',
    ]).options).toMatchObject({
      serviceUrl: 'https://warden.example.com',
      serviceData: 'code',
      serviceMemory: true,
      serviceTimeoutMs: 1_500,
    });
  });

  it('parses --no-service as a one-run override', () => {
    expect(parseCliArgs(['run', 'HEAD', '--no-service']).options.noService).toBe(true);
  });
});
