import { defineConfig } from 'vitest/config';

const jsonOutputFile = process.env['VITEST_EVALS_JSON'];

export default defineConfig({
  test: {
    // Only run eval suites.
    include: ['src/evals/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/evals/setup.ts'],
    reporters: jsonOutputFile
      ? [['vitest-evals/reporter', { toolDetails: false }], ['json']]
      : [['vitest-evals/reporter', { toolDetails: false }]],
    outputFile: jsonOutputFile,
  },
});
