import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Fs from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  };
});

import { readFileSync } from 'node:fs';

const mockReadFileSync = vi.mocked(readFileSync);

describe('getVersion', () => {
  const previousActionPath = process.env['GITHUB_ACTION_PATH'];

  beforeEach(() => {
    vi.resetModules();
    mockReadFileSync.mockReset();
  });

  afterEach(() => {
    if (previousActionPath === undefined) {
      delete process.env['GITHUB_ACTION_PATH'];
    } else {
      process.env['GITHUB_ACTION_PATH'] = previousActionPath;
    }
  });

  it("prefers GITHUB_ACTION_PATH's packages/warden/package.json (correct under ncc's flattened dist/action layout)", async () => {
    process.env['GITHUB_ACTION_PATH'] = '/checked-out-action';
    mockReadFileSync.mockImplementation((path) => {
      if (String(path) === '/checked-out-action/packages/warden/package.json') {
        return JSON.stringify({ version: '1.2.3' });
      }
      throw new Error(`unexpected path: ${path}`);
    });

    const { getVersion } = await import('./version.js');
    expect(getVersion()).toBe('1.2.3');
  });

  it('falls back to the source-relative package.json when GITHUB_ACTION_PATH is unset', async () => {
    delete process.env['GITHUB_ACTION_PATH'];
    mockReadFileSync.mockImplementation(() => JSON.stringify({ version: '4.5.6' }));

    const { getVersion } = await import('./version.js');
    expect(getVersion()).toBe('4.5.6');
  });

  it("falls back to the source-relative package.json when GITHUB_ACTION_PATH's package.json has no version field", async () => {
    // Regression: this is exactly the monorepo-root package.json case — it
    // exists and parses, it just has no `version` (it's `private: true`) —
    // must not be treated as a successful resolution.
    process.env['GITHUB_ACTION_PATH'] = '/checked-out-action';
    mockReadFileSync.mockImplementation((path) => {
      if (String(path) === '/checked-out-action/packages/warden/package.json') {
        return JSON.stringify({ name: 'warden-monorepo', private: true });
      }
      return JSON.stringify({ version: '7.8.9' });
    });

    const { getVersion } = await import('./version.js');
    expect(getVersion()).toBe('7.8.9');
  });

  it('returns a sentinel instead of throwing when no package.json resolves at all', async () => {
    delete process.env['GITHUB_ACTION_PATH'];
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const { getVersion } = await import('./version.js');
    expect(getVersion()).toBe('0.0.0-unknown');
  });

  it('caches the resolved version across calls', async () => {
    delete process.env['GITHUB_ACTION_PATH'];
    mockReadFileSync.mockImplementation(() => JSON.stringify({ version: '1.0.0' }));

    const { getVersion } = await import('./version.js');
    expect(getVersion()).toBe('1.0.0');
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(getVersion()).toBe('1.0.0');
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });
});
