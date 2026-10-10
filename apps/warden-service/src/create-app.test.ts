import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe('Vercel service app', () => {
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
      expect(await page.text()).toBe(
        await readFile(new URL('../dist/dashboard/index.html', import.meta.url), 'utf8'),
      );

      for (const [filename, contentType] of [
        ['app.js', 'text/javascript'],
        ['styles.css', 'text/css'],
      ]) {
        const asset = await fetch(`http://127.0.0.1:${port}/assets/${filename}`);
        expect(asset.status).toBe(200);
        expect(asset.headers.get('content-type')).toContain(contentType);
        expect(asset.headers.get('cache-control')).toBe('no-store');
        expect(await asset.text()).toBe(
          await readFile(new URL(`../dist/dashboard/assets/${filename}`, import.meta.url), 'utf8'),
        );
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
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
    expect(
      (await app.request('https://warden.example/findings/00000000-0000-4000-8000-000000000001'))
        .status,
    ).toBe(302);

    const response = await app.request('https://warden.example/api/auth/login');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('accounts.google.com');
    expect(response.headers.get('set-cookie')).toContain('better-auth');
  });
});
