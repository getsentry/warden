import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceEnvironmentSchema } from '@sentry/warden-service';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe('Vercel service app', () => {
  it('declares Node functions, bounded resources, cron, and static dashboard assets', async () => {
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')) as {
      functions: Record<string, { maxDuration: number; memory: number }>;
      crons: { path: string }[];
      rewrites: { source: string; destination: string }[];
      outputDirectory: string;
    };

    expect(config.functions['api/[[...route]].ts']).toEqual({ maxDuration: 30, memory: 1024 });
    expect(config.crons).toContainEqual(expect.objectContaining({ path: '/api/internal/jobs/tick' }));
    expect(config.outputDirectory).toBe('public');
    expect(config.rewrites).toEqual(expect.arrayContaining([
      { source: '/health', destination: '/api/health' },
      { source: '/ready', destination: '/api/ready' },
    ]));
    expect(config.rewrites).not.toContainEqual({ source: '/api/:path*', destination: '/api' });
    expect(ServiceEnvironmentSchema.safeParse({}).success).toBe(false);
  });

  it('builds workspace service dependencies in a clean Vercel checkout', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      scripts: { build: string };
    };

    expect(manifest.scripts.build).toContain('--filter @sentry/warden-service-api build');
    expect(manifest.scripts.build).toContain('--filter @sentry/warden-service build');
  });

  it('ships one Explore workspace without embedding credentials', async () => {
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
    const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');

    expect(html).toContain('Explore');
    expect(html).toContain('API Access');
    expect(html).toContain('class="brand-mark" viewBox="0 0 64 64"');
    expect(html).not.toContain('<span class="brand-mark" aria-hidden="true">W</span>');
    expect(html).toContain('aria-controls="account-menu-popover"');
    expect(html).not.toContain('href="/runs"');
    expect(html).not.toContain('href="/memory"');
    expect(script).not.toContain('renderRuns');
    expect(script).not.toContain('renderMemory');
    expect(script).toContain("'/api/v1/findings'");
    expect(script).toContain("'groupBy', 'repository'");
    expect(script).toContain("'groupBy', 'skill'");
    expect(script).toContain("const byDay = await api(apiPath('/api/v1/costs', dayCosts))");
    expect(script).toContain("const byRepository = await api(apiPath('/api/v1/costs', repositoryCosts))");
    expect(script).toContain("const bySkill = await api(apiPath('/api/v1/costs', skillCosts))");
    expect(script).toContain("document.createElement('table')");
    expect(script).toContain("['Severity', 'Finding', 'Repository / skill', 'Location', 'Status', 'Seen']");
    expect(script).not.toContain('finding-card');
    expect(script).not.toContain('badge');
    expect(`${html}\n${script}`).not.toContain('WARDEN_SERVICE_TOKEN');
    expect(`${html}\n${script}`).not.toContain('localStorage');
    expect(script).toContain("'/api/v1/personal-tokens'");
    expect(script).toContain("window.location.assign('/api/auth/login')");
    expect(script).toContain("fetch('/api/auth/sign-out'");
    expect(script).toContain("row.setAttribute('aria-expanded', 'false')");
    expect(script).toContain("event.key !== 'Enter' && event.key !== ' '");
    expect(script).toContain('detailRow.hidden = !expanded');
    expect(script).not.toContain('protected-session');
    expect(script).not.toContain("'/api/auth/session'");
  });

  it('reacts to finding filters and keeps them in the URL', async () => {
    const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');

    for (const filter of ['repositoryId', 'skill', 'range', 'query', 'severity', 'findingOutcome']) {
      expect(script).toContain(`'${filter}'`);
    }
    expect(script).toContain("addEventListener('change'");
    expect(script).toContain("addEventListener('input'");
    expect(script).toContain('setTimeout(() => applyFilters(form), 250)');
    expect(script).toContain("history.replaceState({}, '', `/${query ? `?${query}` : ''}`)");
    expect(script).not.toContain("element('button', 'Apply')");
    expect(script).not.toContain("element('button', 'Reset')");
    expect(script).toContain('data.nextCursor');
    expect(script).toContain("next.set('cursor', data.nextCursor)");
    expect(script).toContain("findings.set('limit', '30')");
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
    const route = await import('../api/[[...route]].js');

    expect(route.runtime).toBe('nodejs');
    expect(route.maxDuration).toBe(30);
    const response = await route.default(new Request('https://warden.example/health'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'warden-service' });
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

    const response = await app.request('https://warden.example/api/auth/login');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('accounts.google.com');
    expect(response.headers.get('set-cookie')).toContain('better-auth');
  });
});
