import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('@sentry/warden/package.json');
export const MAJOR_VERSION = pkg.version.split('.')[0] ?? '0';
export const WARDEN_ACTION = `getsentry/warden@v${MAJOR_VERSION}`;
