import { defineConfig } from 'vitest/config';

const junitOutputFile = process.env['VITEST_JUNIT'];
const rootJunitOutputFile = junitOutputFile?.startsWith('/')
  ? junitOutputFile
  : junitOutputFile ? `../../${junitOutputFile}` : undefined;

export default defineConfig({
  test: {
    // Evals and integration tests have dedicated commands.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts', '**/*.eval.ts'],
    reporters: [
      'default',
      ...(junitOutputFile ? ['junit' as const] : []),
    ],
    outputFile: {
      ...(rootJunitOutputFile ? { junit: rootJunitOutputFile } : {}),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: '../../coverage',
    },
  },
});
