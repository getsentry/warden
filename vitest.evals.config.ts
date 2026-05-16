import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run eval suites.
    include: ['src/evals/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Load .env, .env.local, .env.test for API keys
    setupFiles: ['./src/evals/setup.ts'],
    reporters: [['vitest-evals/reporter', { toolDetails: false }]],
  },
});
