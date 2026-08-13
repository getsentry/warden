import { describe, expect, it, vi } from 'vitest';
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

  it('preserves an explicit memory disable', () => {
    expect(parseCliArgs(['run', 'HEAD', '--no-service-memory']).options.serviceMemory).toBe(false);
    expect(parseCliArgs([
      'service', 'replay', 'run.json', '--no-service-memory',
    ]).options.serviceMemory).toBe(false);
  });

  it('rejects a partially numeric service timeout', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() => parseCliArgs([
        'run', 'HEAD', '--service-timeout-ms', '1500ms',
      ])).toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
  });
});
