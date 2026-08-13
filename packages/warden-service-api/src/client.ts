import type { z } from 'zod';
import {
  IngestRunResponseSchema,
  MemoryRecallResponseSchema,
} from './api.js';
import type {
  IngestRunResponse,
  MemoryRecallRequest,
  MemoryRecallResponse,
} from './api.js';
import {
  MemoryRecallRequestSchema,
} from './api.js';
import {
  RunEnvelopeV1Schema,
  SERVICE_PROTOCOL_VERSION,
} from './protocol.js';
import type { RunEnvelopeV1 } from './protocol.js';
import { sha256Checksum } from './checksum.js';

export type ServiceClientOperation = 'publish_run' | 'recall_memory';
export type ServiceClientErrorKind = 'network' | 'timeout' | 'http' | 'invalid_response';

export class ServiceClientError extends Error {
  readonly operation: ServiceClientOperation;
  readonly kind: ServiceClientErrorKind;
  readonly status?: number;
  readonly protocolVersion = SERVICE_PROTOCOL_VERSION;
  readonly runId?: string;

  constructor(args: {
    operation: ServiceClientOperation;
    kind: ServiceClientErrorKind;
    status?: number;
    runId?: string;
  }) {
    const statusSuffix = args.status === undefined ? '' : ` (${args.status})`;
    super(`Warden service ${args.operation} failed: ${args.kind}${statusSuffix}`);
    this.name = 'ServiceClientError';
    this.operation = args.operation;
    this.kind = args.kind;
    this.status = args.status;
    this.runId = args.runId;
  }
}

export interface WardenServiceClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function serviceUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Create the lightweight HTTP client used by Warden and replay tools. */
export function createWardenServiceClient(options: WardenServiceClientOptions) {
  const baseUrl = new URL(options.baseUrl).toString();
  const token = options.token.trim();
  if (!token) throw new TypeError('Warden service token is required');
  const timeoutMs = options.timeoutMs ?? 2_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('Warden service timeout must be a positive integer');
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;

  async function request<TSchema extends z.ZodType>(args: {
    operation: ServiceClientOperation;
    path: string;
    body: unknown;
    responseSchema: TSchema;
    runId?: string;
    checksum?: string;
  }): Promise<z.output<TSchema>> {
    const deadline = Date.now() + timeoutMs;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new ServiceClientError({
          operation: args.operation,
          kind: 'timeout',
          runId: args.runId,
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remainingMs);
      try {
        const response = await fetchImpl(serviceUrl(baseUrl, args.path), {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${token}`,
            'cache-control': 'no-store',
            'content-type': 'application/json',
            'warden-protocol-version': String(SERVICE_PROTOCOL_VERSION),
            ...(args.runId ? { 'idempotency-key': args.runId } : {}),
            ...(args.checksum ? { 'warden-envelope-checksum': args.checksum } : {}),
          },
          body: JSON.stringify(args.body),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (attempt === 0 && RETRYABLE_STATUSES.has(response.status)) continue;
          throw new ServiceClientError({
            operation: args.operation,
            kind: 'http',
            status: response.status,
            runId: args.runId,
          });
        }

        try {
          return args.responseSchema.parse(await response.json());
        } catch {
          throw new ServiceClientError({
            operation: args.operation,
            kind: 'invalid_response',
            status: response.status,
            runId: args.runId,
          });
        }
      } catch (error) {
        if (error instanceof ServiceClientError) throw error;
        if (isAbortError(error)) {
          throw new ServiceClientError({
            operation: args.operation,
            kind: 'timeout',
            runId: args.runId,
          });
        }
        if (attempt === 0) continue;
        throw new ServiceClientError({
          operation: args.operation,
          kind: 'network',
          runId: args.runId,
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceClientError({
      operation: args.operation,
      kind: 'network',
      runId: args.runId,
    });
  }

  return {
    async publishRun(envelopeInput: RunEnvelopeV1): Promise<IngestRunResponse> {
      const envelope = RunEnvelopeV1Schema.parse(envelopeInput);
      const checksum = await sha256Checksum(envelope);
      return request({
        operation: 'publish_run',
        path: 'api/v1/runs',
        body: envelope,
        responseSchema: IngestRunResponseSchema,
        runId: envelope.clientRunId,
        checksum,
      });
    },

    async recallMemory(input: MemoryRecallRequest): Promise<MemoryRecallResponse> {
      const requestBody = MemoryRecallRequestSchema.parse(input);
      const response = await request({
        operation: 'recall_memory',
        path: 'api/v1/memory/recall',
        body: requestBody,
        responseSchema: MemoryRecallResponseSchema,
      });
      if (response.clientRecallId !== requestBody.clientRecallId) {
        throw new ServiceClientError({ operation: 'recall_memory', kind: 'invalid_response' });
      }
      return response;
    },
  };
}

export type WardenServiceClient = ReturnType<typeof createWardenServiceClient>;
