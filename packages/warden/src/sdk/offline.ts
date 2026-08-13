/**
 * Offline policy for Warden network side effects.
 *
 * `defaults.offline`, CLI `--offline`, and `WARDEN_OFFLINE` block remote skill
 * loading and Pi model-catalog refresh. `PI_OFFLINE` only blocks Pi catalogs.
 */

let configuredOffline = false;

/** Record offline intent from warden.toml / CLI for this process. */
export function configureWardenOffline(offline: boolean | undefined): void {
  if (offline) {
    configuredOffline = true;
  }
}

/** Reset process offline state. Intended for tests. */
export function resetWardenOfflineForTests(): void {
  configuredOffline = false;
}

/** Whether Warden-wide offline mode is active. */
export function isWardenOffline(): boolean {
  return configuredOffline || process.env['WARDEN_OFFLINE'] !== undefined;
}

/** Whether Pi provider catalog refresh should avoid network access. */
export function isPiModelCatalogOffline(): boolean {
  return isWardenOffline() || process.env['PI_OFFLINE'] !== undefined;
}
