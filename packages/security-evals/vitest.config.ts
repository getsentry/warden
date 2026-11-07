import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Run through `pnpm evals:security`, which maps CLI flags onto WARDEN_SECURITY_EVALS_* env vars.
export default defineConfig({
  resolve: {
    alias: {
      '@sentry/warden': fileURLToPath(new URL('../warden/src/index.ts', import.meta.url)),
      '@sentry/warden-service-api': fileURLToPath(new URL('../warden-service-api/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.eval.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Roach records model calls and replays them while the worktree content stays pinned.
    globalSetup: ['@sentry/roach/vitest'],
    setupFiles: ['./src/setup.ts', '@sentry/roach/vitest/setup'],
    // Passes share one results object and one worktree per shard.
    fileParallelism: false,
  },
});
