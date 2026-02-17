import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run eval integration tests
    include: ['src/evals/**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/evals/setup.ts'],
  },
});
