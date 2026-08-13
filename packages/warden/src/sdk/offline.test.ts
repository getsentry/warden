import { afterEach, describe, expect, it } from 'vitest';
import {
  configureWardenOffline,
  isPiModelCatalogOffline,
  isWardenOffline,
  resetWardenOfflineForTests,
} from './offline.js';

describe('offline policy', () => {
  afterEach(() => {
    resetWardenOfflineForTests();
    delete process.env['WARDEN_OFFLINE'];
    delete process.env['PI_OFFLINE'];
  });

  it('keeps PI_OFFLINE scoped to catalog refresh', () => {
    process.env['PI_OFFLINE'] = '1';

    expect(isWardenOffline()).toBe(false);
    expect(isPiModelCatalogOffline()).toBe(true);
  });

  it('uses WARDEN_OFFLINE for Warden-wide and catalog offline behavior', () => {
    process.env['WARDEN_OFFLINE'] = '1';

    expect(isWardenOffline()).toBe(true);
    expect(isPiModelCatalogOffline()).toBe(true);
  });

  it('treats warden.toml / CLI offline as both skill and catalog offline', () => {
    configureWardenOffline(true);

    expect(isWardenOffline()).toBe(true);
    expect(isPiModelCatalogOffline()).toBe(true);
  });
});
