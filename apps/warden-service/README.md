# Warden Service on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgetsentry%2Fwarden&project-name=warden-service&repository-name=warden-service&root-directory=apps%2Fwarden-service&env=WARDEN_SERVICE_SESSION_SECRET%2CCRON_SECRET%2CWARDEN_SERVICE_TENANT_ID%2CGOOGLE_CLIENT_ID%2CGOOGLE_CLIENT_SECRET)

This is the reference deployment for the optional Warden backing service. It uses Vercel Node functions, static dashboard assets, Vercel Cron, and a Marketplace Postgres database such as Neon. Redis and an always-on worker are not required.

## Deploy

1. Use the deploy button or import `getsentry/warden` into Vercel with `apps/warden-service` as the root directory.
2. Add Neon from the Vercel Storage or Marketplace screen and connect it to the project. Confirm that Vercel created `DATABASE_URL`.
3. Add independent random values for `WARDEN_SERVICE_SESSION_SECRET` and `CRON_SECRET`. The session secret must contain at least 32 characters. The Cron secret must contain at least 16.
4. Keep `WARDEN_SERVICE_DATABASE_DRIVER=neon` and the default connection limit of 3 unless the database operator gives you a different limit.
5. Run migrations before directing clients to the deployment. Either use the pooled `DATABASE_URL` from the database provider locally, or call the signed migration endpoint so the command uses the database attached to the Vercel function:

   ```bash
   export DATABASE_URL='postgresql://...'
   pnpm --filter @sentry/warden-service... build
   pnpm --filter @sentry/warden-service cli db migrate
   pnpm --filter @sentry/warden-service cli db status

   curl --fail --request POST \
     --header "Authorization: Bearer $CRON_SECRET" \
     https://warden.example.com/api/internal/db/migrate
   ```

6. Create the first tenant and write-only ingest token. Save the token when it is printed. The service stores only its hash.

   ```bash
   TENANT_ID=$(pnpm --silent --filter @sentry/warden-service cli tenant create --slug acme --name "Acme" | tail -1)
   pnpm --filter @sentry/warden-service cli token create \
     --tenant "$TENANT_ID" --name ingest --role ingest
   ```

   The `ingest` role can submit runs and request server-side memory extraction, but cannot read findings, history, or memory. Memory recall requires `read`; only combine `ingest` and `read` on a repository-scoped token.

7. In Google Auth Platform, create a Web application OAuth client. Add the stable production origin as an authorized JavaScript origin and `<origin>/api/auth/callback/google` as an authorized redirect URI.
8. Set `WARDEN_SERVICE_TENANT_ID=$TENANT_ID` and add the OAuth client as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Warden uses Vercel's stable production URL automatically; set `WARDEN_SERVICE_BASE_URL` only to override it with a custom origin. `WARDEN_SERVICE_GOOGLE_DOMAIN` defaults to `sentry.io`.
9. Vercel functions use the project OIDC token for AI Gateway. For local or non-Vercel deployments, set `AI_GATEWAY_API_KEY` instead. The hosted defaults use `openai/gpt-5.6-luna` for bounded extraction and relevance, `openai/text-embedding-3-small` for vectors, and promote only after three supporting independent runs with no contradictions. Set `WARDEN_SERVICE_MEMORY_AUTO_PROMOTE=false` to require manual approval.
10. Deploy, open `/health` and `/ready`, then verify that Google sign-in and the Cron request to `/api/internal/jobs/tick` work.

At current AI Gateway rates, the defaults cost $0.20 per million extraction input tokens, $1.20 per million extraction output tokens, and $0.02 per million embedding tokens. The service records model, token, cost, and cost-basis metadata for extraction, embedding, and relevance operations. Provider work is bounded and retried through durable jobs; run ingestion remains independent from model availability.

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
