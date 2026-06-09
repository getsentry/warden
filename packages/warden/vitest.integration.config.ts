import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run integration tests
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: true,
  },
});
