import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), '..', 'package.json'), 'utf-8'));
export const MAJOR_VERSION = pkg.version.split('.')[0] ?? '0';
export const WARDEN_ACTION = `getsentry/warden@v${MAJOR_VERSION}`;
