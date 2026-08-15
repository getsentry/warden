import * as Sentry from '@sentry/node';
import type { NodeOptions } from '@sentry/node';
import type {
  DatabaseClient,
  QueryResult,
  WardenDatabase,
} from '@sentry/warden-service';

type SentryInitOptions = Pick<
  NodeOptions,
  'beforeSend' | 'beforeSendTransaction' | 'transport'
>;

interface RequestLike {
  method?: string;
  url?: string;
  headers: { host?: string | undefined };
}

interface ResponseLike {
  statusCode: number;
}

const UUID_PATH_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const ENTITY_PATH_SEGMENT = /^(\/(?:findings|api\/v1\/(?:findings|runs|memories|personal-tokens)|api\/v1\/admin\/(?:repositories|runs))\/)[^/]+(?=\/|$)/;

let initialized = false;

function compactSql(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function databaseOperation(statement: string): string {
  return statement.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() ?? 'QUERY';
}

function traceQuery<TRow extends Record<string, unknown>>(
  text: string,
  operation: () => Promise<QueryResult<TRow>>,
): Promise<QueryResult<TRow>> {
  const statement = compactSql(text);
  const command = databaseOperation(statement);
  return Sentry.startSpan({
    name: statement.slice(0, 200),
    op: 'db.query',
    attributes: {
      'db.system': 'postgresql',
      'db.system.name': 'postgresql',
      'db.operation.name': command,
      'db.query.text': statement,
      'sentry.origin': 'manual.db.warden-service',
    },
  }, operation);
}

function traceClient(client: DatabaseClient): DatabaseClient {
  return {
    query<TRow extends Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<TRow>> {
      return traceQuery(text, () => client.query<TRow>(text, values));
    },
  };
}

function routePath(request: RequestLike): string {
  const pathname = new URL(request.url ?? '/', 'https://warden-service').pathname;
  return pathname
    .replace(ENTITY_PATH_SEGMENT, '$1:id')
    .replace(UUID_PATH_SEGMENT, '/:id');
}

/** Initialize Warden Service telemetry when its optional DSN is configured. */
export function initServiceTelemetry(
  environment: NodeJS.ProcessEnv,
  options: SentryInitOptions = {},
): void {
  const dsn = environment['WARDEN_SENTRY_DSN'];
  if (!dsn || initialized) return;
  initialized = true;

  const commitSha = environment['VERCEL_GIT_COMMIT_SHA'];
  Sentry.init({
    dsn,
    environment: environment['VERCEL_ENV'] ?? 'development',
    ...(commitSha ? { release: `warden-service@${commitSha}` } : {}),
    tracesSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: false,
    beforeSendSpan(span) {
      if (span.data?.['drizzle.query.params'] === undefined) return span;
      const { ['drizzle.query.params']: _parameters, ...data } = span.data;
      return { ...span, data };
    },
    integrations(defaultIntegrations) {
      return [
        ...defaultIntegrations.filter(({ name }) => !['Hono', 'Http', 'Postgres'].includes(name)),
        Sentry.httpIntegration({ disableIncomingRequestSpans: true }),
        Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      ];
    },
    ...options,
  });
  Sentry.getGlobalScope().setAttributes({
    'service.name': 'warden-service',
    'warden.source': 'service',
  });
}

/** Add query spans to a service database without recording parameter values. */
export function traceDatabase(database: WardenDatabase): WardenDatabase {
  return {
    driver: database.driver,
    maxConnections: database.maxConnections,
    statementTimeoutMs: database.statementTimeoutMs,
    query<TRow extends Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<TRow>> {
      return traceQuery(text, () => database.query<TRow>(text, values));
    },
    withClient<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T> {
      return Sentry.startSpan({
        name: 'database connection',
        op: 'db.connection',
      }, () => database.withClient((client) => operation(traceClient(client))));
    },
    transaction<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T> {
      return Sentry.startSpan({
        name: 'database transaction',
        op: 'db.transaction',
      }, () => database.transaction((client) => operation(traceClient(client))));
    },
    close(): Promise<void> {
      return database.close();
    },
  };
}

/** Trace one Vercel request as a route transaction with bounded cardinality. */
export function traceRequest<
  TRequest extends RequestLike,
  TResponse extends ResponseLike,
>(
  handler: (request: TRequest, response: TResponse) => void | Promise<void>,
): (request: TRequest, response: TResponse) => Promise<void> {
  return async (request, response) => {
    const method = request.method?.toUpperCase() ?? 'GET';
    const route = routePath(request);
    await Sentry.withIsolationScope(() => Sentry.startSpan({
      name: `${method} ${route}`,
      op: 'http.server',
      forceTransaction: true,
      attributes: {
        'http.request.method': method,
        'http.route': route,
        'service.name': 'warden-service',
        'sentry.source': 'route',
      },
    }, async (span) => {
      try {
        await handler(request, response);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      } finally {
        Sentry.setHttpStatus(span, response.statusCode);
      }
    }));
  };
}

/** Capture a handled service exception without allowing telemetry to affect the response. */
export function captureServiceError(error: Error): void {
  try {
    Sentry.captureException(error);
  } catch {
    // Telemetry must never break the service error handler.
  }
}

export { Sentry };
