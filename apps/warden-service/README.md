# Warden Service on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgetsentry%2Fwarden&project-name=warden-service&repository-name=warden-service&root-directory=apps%2Fwarden-service&env=WARDEN_SERVICE_SESSION_SECRET%2CCRON_SECRET%2CWARDEN_SERVICE_TENANT_ID%2CGOOGLE_CLIENT_ID%2CGOOGLE_CLIENT_SECRET)

This is the reference deployment for the optional Warden backing service. It uses Vercel Node functions, static dashboard assets, Vercel Cron, and a Marketplace Postgres database such as Neon. Redis and an always-on worker are not required.

## Deploy

1. Use the deploy button or import `getsentry/warden` into Vercel with `apps/warden-service` as the root directory.
2. Add Neon from the Vercel Storage or Marketplace screen and connect it to the project. Confirm that Vercel created `DATABASE_URL`.
3. Add independent random values for `WARDEN_SERVICE_SESSION_SECRET` and `CRON_SECRET`. The session secret must contain at least 32 characters. The Cron secret must contain at least 16.
4. Keep `WARDEN_SERVICE_DATABASE_DRIVER=neon` and the default connection limit of 3 unless the database operator gives you a different limit.
5. Run migrations from the repository root before directing clients to the deployment:

   ```bash
   pnpm --filter @sentry/warden-service build
   pnpm --filter @sentry/warden-service exec warden-service db migrate
   pnpm --filter @sentry/warden-service exec warden-service db status
   ```

6. Create the first tenant and ingest token. Save the token when it is printed. The service stores only its hash.

   ```bash
   TENANT_ID=$(pnpm --silent --filter @sentry/warden-service exec warden-service tenant create --slug acme --name "Acme" | tail -1)
   pnpm --filter @sentry/warden-service exec warden-service token create \
     --tenant "$TENANT_ID" --name ingest --role ingest
   ```

7. In Google Auth Platform, create a Web application OAuth client. Add the stable production origin as an authorized JavaScript origin and `<origin>/api/auth/callback/google` as an authorized redirect URI.
8. Set `WARDEN_SERVICE_TENANT_ID=$TENANT_ID` and add the OAuth client as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Warden uses Vercel's stable production URL automatically; set `WARDEN_SERVICE_BASE_URL` only to override it with a custom origin. `WARDEN_SERVICE_GOOGLE_DOMAIN` defaults to `sentry.io`.
9. Deploy, open `/health` and `/ready`, then verify that Google sign-in and the Cron request to `/api/internal/jobs/tick` work.

The service never runs migrations during a function cold start.

## API Access

Open **API access** in the dashboard to create a personal token. The plaintext token is shown once, expires after 90 days, and can only make `GET` and `HEAD` requests to read APIs. It cannot ingest runs, recall or change memory, administer the service, or manage other tokens.

```bash
export WARDEN_PAT=wds_pat_example

curl --fail --silent \
  -H "Authorization: Bearer $WARDEN_PAT" \
  'https://warden.example.com/api/v1/findings?limit=30&skill=security'

curl --fail --silent \
  -H "Authorization: Bearer $WARDEN_PAT" \
  'https://warden.example.com/api/v1/costs?groupBy=repository'
```

Warden follows Junior's stateless Better Auth setup. Browser sessions are encrypted cookies with an eight-hour lifetime, and only verified accounts in `WARDEN_SERVICE_GOOGLE_DOMAIN` receive read access. The normalized Google email owns personal tokens.

For local or private deployments, `DISABLE_AUTH=true` bypasses browser authentication and maps anonymous requests to the configured tenant with read-only authority. It defaults to `false`. Bearer tokens are still authenticated normally, and the bypass never grants `admin` or `ingest`.
