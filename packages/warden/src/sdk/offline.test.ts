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

  it.each(['1', 'true', ' TRUE '])(
    'uses WARDEN_OFFLINE=%s for Warden-wide offline behavior',
    (value) => {
      process.env['WARDEN_OFFLINE'] = value;

      expect(isWardenOffline()).toBe(true);
    },
  );

  it.each(['0', 'false', '', 'invalid'])(
    'stays online when WARDEN_OFFLINE=%s',
    (value) => {
      process.env['WARDEN_OFFLINE'] = value;

      expect(isWardenOffline()).toBe(false);
    },
  );

  it('treats warden.toml / CLI offline as Warden-wide offline', () => {
    configureWardenOffline(true);

    expect(isWardenOffline()).toBe(true);
  });

  it('clears configured offline when later set to false', () => {
    configureWardenOffline(true);
    configureWardenOffline(false);

    expect(isWardenOffline()).toBe(false);
  });

  it('stays online when no offline controls are set', () => {
    expect(isWardenOffline()).toBe(false);
  });
});
