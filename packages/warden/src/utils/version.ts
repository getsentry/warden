import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | undefined;

function readPackageVersion(packageJsonPath: string): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
}

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  // GITHUB_ACTION_PATH (set by GitHub Actions for every action) is this
  // repo's own checked-out root, independent of how the running code is laid
  // out — unlike an import.meta.url-relative path, which is only two levels
  // above packages/warden/package.json when running from TypeScript source.
  // ncc bundling flattens dist/action/index.js, so that same relative depth
  // lands on the monorepo root's package.json instead, which has no version
  // field (it's `private: true`) — silently returning undefined here would
  // break any real Action run the moment a schema requires this as a string.
  const actionPath = process.env['GITHUB_ACTION_PATH'];
  const versionFromActionPath = actionPath && readPackageVersion(join(actionPath, 'packages/warden/package.json'));
  if (versionFromActionPath) {
    cachedVersion = versionFromActionPath;
    return cachedVersion;
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  cachedVersion = readPackageVersion(join(__dirname, '..', '..', 'package.json')) ?? '0.0.0-unknown';
  return cachedVersion;
}

export function getMajorVersion(): string {
  return getVersion().split('.')[0] ?? '0';
}
