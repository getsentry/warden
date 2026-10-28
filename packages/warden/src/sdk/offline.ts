/**
 * Offline policy for Warden network side effects.
 *
 * `defaults.offline`, CLI `--offline`, and `WARDEN_OFFLINE` block remote skill
 * loading and Pi model-catalog refresh.
 */

let configuredOffline = false;

/** Record offline intent from warden.toml / CLI for this process. */
export function configureWardenOffline(offline: boolean | undefined): void {
  // Explicit false clears sticky offline so reused processes can go back online.
  configuredOffline = Boolean(offline);
}

/** Reset process offline state. Intended for tests. */
export function resetWardenOfflineForTests(): void {
  configuredOffline = false;
}

/** Whether Warden-wide offline mode is active. */
export function isWardenOffline(): boolean {
  const envValue = process.env['WARDEN_OFFLINE']?.trim().toLowerCase();
  return configuredOffline || envValue === 'true' || envValue === '1';
}
