import { afterEach, describe, expect, it } from 'vitest';
import {
  configureWardenOffline,
  isWardenOffline,
  resetWardenOfflineForTests,
} from './offline.js';

describe('offline policy', () => {
  afterEach(() => {
    resetWardenOfflineForTests();
    delete process.env['WARDEN_OFFLINE'];
  });

  it('uses WARDEN_OFFLINE for Warden-wide offline behavior', () => {
    process.env['WARDEN_OFFLINE'] = '1';

    expect(isWardenOffline()).toBe(true);
  });

  it('treats warden.toml / CLI offline as Warden-wide offline', () => {
    configureWardenOffline(true);

    expect(isWardenOffline()).toBe(true);
  });

  it('stays online when no offline controls are set', () => {
    expect(isWardenOffline()).toBe(false);
  });
});
