import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Evals and integration tests have dedicated commands.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts', '**/*.eval.ts'],
  },
});
