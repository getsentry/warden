import { defineConfig } from 'vitest/config';

const junitOutputFile = process.env['VITEST_JUNIT'];

export default defineConfig({
  test: {
    // Evals and integration tests have dedicated commands.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts', '**/*.eval.ts'],
    reporters: [
      'default',
      ...(junitOutputFile ? ['junit' as const] : []),
    ],
    outputFile: {
      ...(junitOutputFile ? { junit: junitOutputFile } : {}),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
