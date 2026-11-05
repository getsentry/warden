import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const jsonOutputFile = process.env['VITEST_EVALS_JSON'];

export default defineConfig({
  resolve: {
    alias: {
      '@sentry/warden': fileURLToPath(new URL('../warden/src/index.ts', import.meta.url)),
      // Resolve from source like @sentry/warden so evals run without a prior build.
      '@sentry/warden-service-api': fileURLToPath(new URL('../warden-service-api/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // Only run eval suites.
    include: ['src/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Roach records model calls and replays them on later runs. See roach.json.
    globalSetup: ['@sentry/roach/vitest'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/setup.ts', '@sentry/roach/vitest/setup'],
    includeTaskLocation: true,
    reporters: [
      ['vitest-evals/reporter', { toolDetails: false }],
      ...(jsonOutputFile ? [['json']] : []),
    ],
    outputFile: {
      ...(jsonOutputFile ? { json: jsonOutputFile } : {}),
    },
  },
});
