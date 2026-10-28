# Self-hosted Warden Service

Use standard Postgres and Node 20 or newer.

1. Export the variables from `apps/warden-service/.env.example` through your shell or process supervisor and set `WARDEN_SERVICE_DATABASE_DRIVER=postgres`. The CLI does not load `.env` files itself.
2. Build the workspace and run `warden-service db migrate`.
3. Create a tenant with `warden-service tenant create`, then create an ingest token with `warden-service token create`.
4. Configure Google OAuth for browser access, or set `DISABLE_AUTH=true` only when the service is private.
5. Run `server.ts` with `tsx` during development or compile it for production.
6. Call `GET /api/internal/jobs/tick` on a schedule with `Authorization: Bearer <CRON_SECRET>`, or run `warden-service worker` as a separate long-running process.

The signed Cron route and the worker use the same Postgres job state. Run one or both. Postgres remains the authority if a process stops.
