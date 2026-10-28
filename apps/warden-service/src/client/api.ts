import { Context, Data, Effect, Layer, ManagedRuntime } from 'effect';
import { z } from 'zod';
import {
  ApiErrorSchema,
  DashboardSummaryResponseSchema,
  FindingDetailResponseSchema,
  FindingListResponseSchema,
  HistoryDimensionsResponseSchema,
} from '@sentry/warden-service-api';

export class RequestError extends Data.TaggedError('RequestError')<{
  kind: 'network' | 'http' | 'decode';
  message: string;
  status: number | undefined;
}> {}

const AuthContextSchema = z.object({
  canManagePersonalTokens: z.boolean(),
  authDisabled: z.boolean(),
});
const TokenSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(80),
    tokenSuffix: z.string().length(8),
    expiresAt: z.iso.datetime(),
    lastUsedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();
const TokenListSchema = z.object({ tokens: z.array(TokenSchema) }).strict();
const CreatedTokenSchema = TokenSchema.extend({ token: z.string().startsWith('wds_pat_') });
export type PersonalToken = z.infer<typeof TokenSchema>;

interface HttpClient {
  request<A>(
    path: string,
    schema: z.ZodType<A>,
    options?: RequestInit,
  ): Effect.Effect<A, RequestError>;
  signOut: Effect.Effect<void, RequestError>;
  copy(text: string): Effect.Effect<void, RequestError>;
}
export class DashboardHttp extends Context.Tag('warden/DashboardHttp')<
  DashboardHttp,
  HttpClient
>() {}

/** Cancel browser requests with their Effect and validate API responses. */
export function browserHttpLayer(
  fetcher: typeof fetch = globalThis.fetch,
): Layer.Layer<DashboardHttp> {
  function send(path: string, options: RequestInit = {}): Effect.Effect<Response, RequestError> {
    return Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: (signal) =>
          fetcher(path, {
            ...options,
            credentials: 'same-origin',
            headers: { accept: 'application/json', ...options.headers },
            signal,
          }),
        catch: () =>
          new RequestError({
            kind: 'network',
            message: 'Request failed. Try again.',
            status: undefined,
          }),
      });
      if (response.ok) return response;

      const body: unknown = yield* Effect.tryPromise(() => response.json()).pipe(
        Effect.orElseSucceed(() => null),
      );
      const parsed = ApiErrorSchema.safeParse(body);
      let message = 'Request failed. Try again.';
      if (parsed.success) message = parsed.data.error.message;
      else if (response.status === 401) message = 'Authentication required.';
      return yield* Effect.fail(
        new RequestError({ kind: 'http', status: response.status, message }),
      );
    });
  }
  return Layer.succeed(DashboardHttp, {
    request: <A>(path: string, schema: z.ZodType<A>, options?: RequestInit) =>
      Effect.gen(function* () {
        const response = yield* send(path, options);
        const body: unknown = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: () =>
            new RequestError({
              kind: 'decode',
              message: 'The service returned an invalid response.',
              status: response.status,
            }),
        });
        const result = schema.safeParse(body);
        if (result.success) return result.data;
        return yield* Effect.fail(
          new RequestError({
            kind: 'decode',
            message: 'The service returned an invalid response.',
            status: response.status,
          }),
        );
      }),
    signOut: send('/api/auth/sign-out', { method: 'POST' }).pipe(Effect.asVoid),
    copy: (value) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(value),
        catch: () =>
          new RequestError({
            kind: 'network',
            message: 'Could not copy the token. Copy it manually.',
            status: undefined,
          }),
      }),
  });
}

/** Create a runtime that the browser entry point disposes when the page closes. */
export function createDashboardRuntime(
  fetcher: typeof fetch = globalThis.fetch,
): ManagedRuntime.ManagedRuntime<DashboardHttp, never> {
  return ManagedRuntime.make(browserHttpLayer(fetcher));
}
export type DashboardRuntime = ReturnType<typeof createDashboardRuntime>;

export const dashboardApi = {
  account: Effect.flatMap(DashboardHttp, (http) =>
    http.request('/api/v1/auth/context', AuthContextSchema),
  ),
  dimensions: Effect.flatMap(DashboardHttp, (http) =>
    http.request('/api/v1/history/dimensions', HistoryDimensionsResponseSchema),
  ),
  summary: (query: string) =>
    Effect.flatMap(DashboardHttp, (http) =>
      http.request(`/api/v1/dashboard/summary?${query}`, DashboardSummaryResponseSchema),
    ),
  findings: (query: string) =>
    Effect.flatMap(DashboardHttp, (http) =>
      http.request(`/api/v1/findings?${query}`, FindingListResponseSchema),
    ),
  finding: (id: string) =>
    Effect.flatMap(DashboardHttp, (http) =>
      http.request(`/api/v1/findings/${encodeURIComponent(id)}`, FindingDetailResponseSchema),
    ),
  tokens: Effect.flatMap(DashboardHttp, (http) =>
    http.request('/api/v1/personal-tokens', TokenListSchema),
  ),
  createToken: (name: string) =>
    Effect.flatMap(DashboardHttp, (http) =>
      http.request('/api/v1/personal-tokens', CreatedTokenSchema, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    ),
  revokeToken: (id: string) =>
    Effect.flatMap(DashboardHttp, (http) =>
      http.request(
        `/api/v1/personal-tokens/${encodeURIComponent(id)}`,
        z.object({ revoked: z.literal(true) }).strict(),
        { method: 'DELETE' },
      ),
    ),
  signOut: Effect.flatMap(DashboardHttp, (http) => http.signOut),
  copy: (text: string) => Effect.flatMap(DashboardHttp, (http) => http.copy(text)),
};
