import { defineConfig } from 'vitest/config';

const jsonOutputFile = process.env['VITEST_EVALS_JSON'];
const junitOutputFile = process.env['VITEST_EVALS_JUNIT'];

export default defineConfig({
  test: {
    // Only run eval suites.
    include: ['src/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/setup.ts'],
    reporters: [
      ['vitest-evals/reporter', { toolDetails: false }],
      ...(jsonOutputFile ? [['json']] : []),
      ...(junitOutputFile ? [['junit']] : []),
    ],
    outputFile: {
      ...(jsonOutputFile ? { json: jsonOutputFile } : {}),
      ...(junitOutputFile ? { junit: junitOutputFile } : {}),
    },
  },
});
