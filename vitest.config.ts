import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude integration tests from the main test run
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
  },
});
