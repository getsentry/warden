import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@sentry/warden': fileURLToPath(new URL('../warden/src/index.ts', import.meta.url)),
      // Resolve from source like @sentry/warden so evals run without a prior build.
      '@sentry/warden-service-api': fileURLToPath(new URL('../warden-service-api/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
