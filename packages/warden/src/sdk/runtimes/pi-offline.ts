/**
 * Offline policy for Pi model-catalog network access.
 *
 * Prefer durable config (`defaults.offline` in warden.toml) or CLI `--offline`.
 * `PI_OFFLINE` remains a one-off process override for ad-hoc runs.
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
 * Whether Pi provider catalog refresh should avoid network access.
 * True when config/CLI requested offline, or when PI_OFFLINE is set.
 */
export function isPiModelCatalogOffline(): boolean {
  return configuredOffline || process.env['PI_OFFLINE'] !== undefined;
}
