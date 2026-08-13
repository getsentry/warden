/**
 * Offline policy for Warden network side effects.
 *
 * Prefer durable config (`defaults.offline` in warden.toml) or CLI `--offline`
 * for both remote skill loading and Pi model-catalog refresh.
 * `PI_OFFLINE` is a Pi-only one-off override: it blocks catalog network
 * refresh without forcing remote skills onto cache-only mode.
 */

let configuredOffline = false;

/** Record offline intent from warden.toml / CLI for this process. */
export function configurePiModelCatalogOffline(offline: boolean | undefined): void {
  if (offline) {
    configuredOffline = true;
  }
}

/** Reset process offline state. Intended for tests. */
export function resetPiModelCatalogOfflineForTests(): void {
  configuredOffline = false;
}

/**
 * Whether Warden-configured offline mode is active (warden.toml / CLI).
 * Use this for remote skill loading. Does not include PI_OFFLINE.
 */
export function isConfiguredOffline(): boolean {
  return configuredOffline;
}

/**
 * Whether Pi provider catalog refresh should avoid network access.
 * True when config/CLI requested offline, or when PI_OFFLINE is set.
 */
export function isPiModelCatalogOffline(): boolean {
  return configuredOffline || process.env['PI_OFFLINE'] !== undefined;
}
