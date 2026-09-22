import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceEnvironmentSchema } from '@sentry/warden-service';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe('Vercel service app', () => {
  it('declares Node functions, bounded resources, cron, and protected dashboard routes', async () => {
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')) as {
      functions: Record<string, { maxDuration: number; memory: number }>;
      crons: { path: string }[];
      rewrites: { source: string; destination: string }[];
      outputDirectory: string;
    };

    expect(config.functions['api/index.ts']).toEqual({ maxDuration: 300, memory: 1024 });
    expect(config.crons).toContainEqual(expect.objectContaining({ path: '/api/internal/jobs/tick' }));
    expect(config.outputDirectory).toBe('static');
    expect(config.rewrites).toEqual(expect.arrayContaining([
      { source: '/health', destination: '/api' },
      { source: '/ready', destination: '/api' },
      { source: '/assets/(.*)', destination: '/api' },
      { source: '/index.html', destination: '/api' },
      { source: '/findings/(.*)', destination: '/api' },
      { source: '/', destination: '/api' },
    ]));
    expect(config.rewrites).toContainEqual({ source: '/api/(.*)', destination: '/api' });
    expect(config.rewrites).not.toContainEqual({ source: '/api/:path*', destination: '/api' });
    expect(config.rewrites).not.toContainEqual({ source: '/((?!api/|assets/).*)', destination: '/index.html' });
    expect(ServiceEnvironmentSchema.safeParse({}).success).toBe(false);
  });

  it('builds workspace service dependencies in a clean Vercel checkout', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      scripts: { build: string };
    };

    expect(manifest.scripts.build).toContain('--filter @sentry/warden-service-api build');
    expect(manifest.scripts.build).toContain('--filter @sentry/warden-service build');
    expect(manifest.scripts.build).toContain('node scripts/migrate-database.mjs');
    expect(manifest.scripts.build.indexOf('node scripts/migrate-database.mjs'))
      .toBeLessThan(manifest.scripts.build.indexOf('tsc --noEmit'));
  });

  it('renders service content through text nodes without HTML injection sinks', async () => {
    const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');

    expect(script).toContain('textContent');
    expect(script).not.toMatch(/\.innerHTML\s*=|insertAdjacentHTML|document\.write/);
  });

  it('emulates the Vercel Node function and returns the Hono health route', async () => {
    process.env['DATABASE_URL'] = 'postgresql://user:password@example.invalid/warden';
    process.env['WARDEN_SERVICE_SESSION_SECRET'] = 's'.repeat(32);
    process.env['CRON_SECRET'] = 'c'.repeat(16);
    process.env['DISABLE_AUTH'] = 'true';
    process.env['WARDEN_SERVICE_TENANT_ID'] = '00000000-0000-4000-8000-000000000001';
    const route = await import('../api/index.js');

    expect(route.runtime).toBe('nodejs');
    expect(route.maxDuration).toBe(300);
    const server = createServer(route.default);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'warden-service' });

      const page = await fetch(`http://127.0.0.1:${port}/`);
      expect(page.status).toBe(200);
      expect(page.headers.get('content-type')).toContain('text/html');
      expect(page.headers.get('cache-control')).toBe('no-store');
      expect(await page.text()).toBe(await readFile(new URL('../public/index.html', import.meta.url), 'utf8'));

      for (const [filename, contentType] of [['app.js', 'text/javascript'], ['styles.css', 'text/css']]) {
        const asset = await fetch(`http://127.0.0.1:${port}/assets/${filename}`);
        expect(asset.status).toBe(200);
        expect(asset.headers.get('content-type')).toContain(contentType);
        expect(asset.headers.get('cache-control')).toBe('no-store');
        expect(await asset.text()).toBe(await readFile(new URL(`../public/assets/${filename}`, import.meta.url), 'utf8'));
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => {
        if (error) reject(error);
        else resolve();
      }));
    }
  });

  it('starts Google OAuth when auth is enabled by default', async () => {
    const { createVercelWardenService } = await import('./create-app.js');
    const app = createVercelWardenService({
      DATABASE_URL: 'postgresql://user:password@example.invalid/warden',
      WARDEN_SERVICE_SESSION_SECRET: 's'.repeat(32),
      CRON_SECRET: 'c'.repeat(16),
      WARDEN_SERVICE_BASE_URL: 'https://warden.example',
      WARDEN_SERVICE_TENANT_ID: '00000000-0000-4000-8000-000000000001',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
    });

    const page = await app.request('https://warden.example/');
    expect(page.status).toBe(302);
    expect(page.headers.get('location')).toBe('/api/auth/login');

    const asset = await app.request('https://warden.example/assets/app.js');
    expect(asset.status).toBe(302);
    expect(asset.headers.get('location')).toBe('/api/auth/login');
    expect((await app.request('https://warden.example/index.html')).status).toBe(302);
    expect((await app.request('https://warden.example/findings/00000000-0000-4000-8000-000000000001')).status).toBe(302);

    const response = await app.request('https://warden.example/api/auth/login');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('accounts.google.com');
    expect(response.headers.get('set-cookie')).toContain('better-auth');
  });
});
