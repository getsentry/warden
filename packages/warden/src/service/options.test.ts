import { describe, expect, it, vi } from 'vitest';
import { ServiceConfigSchema } from '../config/schema.js';
import { resolveServiceOptions } from './options.js';

describe('ServiceConfigSchema', () => {
  it('defaults a configured service to findings and memory', () => {
    expect(ServiceConfigSchema.parse({
      url: 'https://warden.example.com',
    })).toMatchObject({
      data: 'findings',
      memory: true,
    });
  });

  it('disables memory when metrics is explicitly selected', () => {
    expect(ServiceConfigSchema.parse({
      url: 'https://warden.example.com',
      data: 'metrics',
    })).toMatchObject({
      data: 'metrics',
      memory: false,
    });
  });

  it('requires the data profile needed by memory', () => {
    expect(ServiceConfigSchema.safeParse({
      url: 'https://warden.example.com',
      data: 'metrics',
      memory: true,
    }).success).toBe(false);
    expect(ServiceConfigSchema.safeParse({
      url: 'https://warden.example.com',
      data: 'code',
      memory: true,
    }).success).toBe(true);
  });
});

describe('resolveServiceOptions', () => {
  it('uses useful defaults when only a URL and token are configured', () => {
    expect(resolveServiceOptions({
      environment: {
        WARDEN_SERVICE_URL: 'https://warden.example.com',
        WARDEN_SERVICE_TOKEN: 'secret',
      },
    })).toMatchObject({
      data: 'findings',
      memory: true,
    });
  });

  it('allows memory to be disabled explicitly', () => {
    expect(resolveServiceOptions({
      explicit: { memory: false },
      environment: {
        WARDEN_SERVICE_URL: 'https://warden.example.com',
        WARDEN_SERVICE_TOKEN: 'secret',
      },
    })).toMatchObject({
      data: 'findings',
      memory: false,
    });
  });

  it('resolves explicit options before environment and configuration', () => {
    const result = resolveServiceOptions({
      explicit: { url: 'https://explicit.example.com', token: 'explicit-token', data: 'code' },
      environment: {
        WARDEN_SERVICE_URL: 'https://environment.example.com',
        WARDEN_SERVICE_TOKEN: 'environment-token',
      },
      config: ServiceConfigSchema.parse({ url: 'https://config.example.com' }),
    });

    expect(result).toMatchObject({
      url: 'https://explicit.example.com',
      token: 'explicit-token',
      data: 'code',
    });
  });

  it('does no work without a URL and emits one safe warning for a missing token', () => {
    const warning = vi.fn();
    expect(resolveServiceOptions({ environment: {}, onWarning: warning })).toBeUndefined();
    expect(warning).not.toHaveBeenCalled();

    expect(resolveServiceOptions({
      environment: { WARDEN_SERVICE_URL: 'https://warden.example.com' },
      onWarning: warning,
    })).toBeUndefined();
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0]?.[0]).not.toContain('https://warden.example.com');
  });

  it('honors the one-run disable override', () => {
    expect(resolveServiceOptions({
      explicit: { disabled: true },
      environment: {
        WARDEN_SERVICE_URL: 'https://warden.example.com',
        WARDEN_SERVICE_TOKEN: 'secret',
      },
    })).toBeUndefined();
  });
});
