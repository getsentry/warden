import { betterAuth } from 'better-auth/minimal';
import type { Hono } from 'hono';
import { z } from 'zod';
import type { DashboardAuthenticationAdapter, ServiceVariables } from './auth.js';

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const SessionSchema = z.object({
  user: z.object({
    email: z.string().email(),
    emailVerified: z.boolean(),
  }).loose(),
}).loose();

export type GoogleAuthSession = z.infer<typeof SessionSchema>;

export interface GoogleAuthBridge {
  handler(request: Request): Promise<Response>;
  getSession(request: Request): Promise<GoogleAuthSession | null>;
  signInWithGoogle(request: Request, callbackURL: string): Promise<Response>;
}

export interface GoogleAuthConfig {
  baseURL: string;
  secret: string;
  clientId: string;
  clientSecret: string;
  hostedDomain: string;
}

export interface GoogleBrowserAuthOptions {
  auth: GoogleAuthBridge;
  tenantId: string;
  allowedDomain: string;
}

function dashboardReturnPath(value: string | undefined): string {
  if (!value) return '/';
  try {
    const base = new URL('https://warden.invalid');
    const target = new URL(value, base);
    const isDashboardPage = target.pathname === '/'
      || /^\/findings\/[^/]+\/?$/.test(target.pathname);
    return target.origin === base.origin && isDashboardPage
      ? `${target.pathname}${target.search}`
      : '/';
  } catch {
    return '/';
  }
}

/** Build a login path that returns authenticated users to the requested dashboard page. */
export function dashboardLoginPath(request: Request): string {
  const url = new URL(request.url);
  const returnTo = dashboardReturnPath(`${url.pathname}${url.search}`);
  return returnTo === '/'
    ? '/api/auth/login'
    : `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function normalizedAuthorizedEmail(session: GoogleAuthSession | null, allowedDomain: string): string | null {
  if (!session?.user.emailVerified) return null;
  const email = session.user.email.trim().toLowerCase();
  const separator = email.lastIndexOf('@');
  return separator > 0 && email.slice(separator + 1) === allowedDomain.trim().toLowerCase()
    ? email
    : null;
}

/** Create the stateless Better Auth Google OAuth bridge used by the dashboard. */
export function createGoogleAuth(config: GoogleAuthConfig): GoogleAuthBridge {
  const baseURL = new URL(config.baseURL).origin;
  const auth = betterAuth({
    appName: 'Warden',
    baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [baseURL],
    socialProviders: {
      google: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        hd: config.hostedDomain,
        prompt: 'select_account',
        mapProfileToUser(profile) {
          return {
            email: profile.email,
            emailVerified: profile.email_verified,
            image: profile.picture,
            name: profile.name,
          };
        },
      },
    },
    account: {
      storeStateStrategy: 'cookie',
      storeAccountCookie: false,
      updateAccountOnSignIn: false,
    },
    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      disableSessionRefresh: true,
      cookieCache: {
        enabled: true,
        strategy: 'jwe',
        maxAge: SESSION_MAX_AGE_SECONDS,
        refreshCache: false,
      },
    },
  });

  return {
    handler(request) {
      return auth.handler(request);
    },
    async getSession(request) {
      const result = SessionSchema.safeParse(await auth.api.getSession({ headers: request.headers }));
      return result.success ? result.data : null;
    },
    async signInWithGoogle(request, callbackURL) {
      const result = await auth.api.signInSocial({
        body: { provider: 'google', callbackURL },
        headers: request.headers,
        returnHeaders: true,
      });
      if (!('url' in result.response) || !result.response.url) {
        throw new Error('Google sign-in did not return a redirect URL');
      }
      result.headers.set('location', result.response.url);
      return new Response(null, { status: 302, headers: result.headers });
    },
  };
}

/** Map one verified Google domain to read-only authority in one configured tenant. */
export function createGoogleAuthenticationAdapter(
  options: GoogleBrowserAuthOptions,
): DashboardAuthenticationAdapter {
  return {
    async authenticate(request) {
      const email = normalizedAuthorizedEmail(await options.auth.getSession(request), options.allowedDomain);
      if (!email) return null;
      return {
        tenantId: options.tenantId,
        tokenId: null,
        roles: ['read'],
        repositoryAllowlist: null,
        credentialKind: 'browser',
        principalSubject: `google:${email}`,
      };
    },
  };
}

/** Register the login entry point and Better Auth callback/session endpoints. */
export function registerGoogleAuthRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  options: GoogleBrowserAuthOptions,
): void {
  app.get('/api/auth/login', async (context) => {
    const returnTo = dashboardReturnPath(context.req.query('returnTo'));
    const session = await options.auth.getSession(context.req.raw);
    if (normalizedAuthorizedEmail(session, options.allowedDomain)) {
      return context.redirect(returnTo);
    }
    return options.auth.signInWithGoogle(context.req.raw, new URL(returnTo, context.req.url).toString());
  });
  app.on(['GET', 'POST'], '/api/auth/*', (context) => options.auth.handler(context.req.raw));
}
