import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const jsonOutputFile = process.env['VITEST_EVALS_JSON'];

export default defineConfig({
  resolve: {
    alias: {
      '@sentry/warden': fileURLToPath(new URL('../warden/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // Only run eval suites.
    include: ['src/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/setup.ts'],
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
