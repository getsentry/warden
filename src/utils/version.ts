import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | undefined;

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')) as { version: string };
  cachedVersion = pkg.version;
  return cachedVersion;
}

export function getMajorVersion(): string {
  return getVersion().split('.')[0] ?? '0';
}
