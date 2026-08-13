import { afterEach, describe, expect, it } from 'vitest';
import {
  configurePiModelCatalogOffline,
  isConfiguredOffline,
  isPiModelCatalogOffline,
  resetPiModelCatalogOfflineForTests,
} from './pi-offline.js';

describe('pi offline policy', () => {
  afterEach(() => {
    resetPiModelCatalogOfflineForTests();
    delete process.env['PI_OFFLINE'];
  });

  it('keeps PI_OFFLINE scoped to catalog refresh, not configured offline', () => {
    process.env['PI_OFFLINE'] = '1';

    expect(isConfiguredOffline()).toBe(false);
    expect(isPiModelCatalogOffline()).toBe(true);
  });

  it('treats warden.toml / CLI offline as both skill and catalog offline', () => {
    configurePiModelCatalogOffline(true);

    expect(isConfiguredOffline()).toBe(true);
    expect(isPiModelCatalogOffline()).toBe(true);
  });
});
