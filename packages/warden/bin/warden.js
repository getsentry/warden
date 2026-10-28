#!/usr/bin/env node
try {
  await import('../dist/cli/index.js');
} catch (error) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('/dist/cli/index.js')
  ) {
    console.error('Warden CLI is not built. Run `pnpm --filter @sentry/warden build` first.');
    process.exit(1);
  }

  throw error;
}
