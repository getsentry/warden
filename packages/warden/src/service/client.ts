import { createWardenServiceClient, ServiceClientError } from '@sentry/warden-service-api';
import type {
  MemoryRecallRequest,
  MemoryRecallResponse,
  PublishReviewsRequest,
  RunEnvelopeV1,
} from '@sentry/warden-service-api';
import type { ResolvedServiceOptions } from './options.js';

export interface DeferredRunEnvelope {
  clientRunId: string;
  build(): RunEnvelopeV1;
}

/** Publish after local finalization and isolate every service failure from review behavior. */
export async function publishRunFailOpen(
  service: ResolvedServiceOptions,
  input: RunEnvelopeV1 | DeferredRunEnvelope,
  onWarning?: (message: string) => void,
): Promise<boolean> {
  const clientRunId = input.clientRunId;
  try {
    const envelope = 'build' in input ? input.build() : input;
    await createWardenServiceClient({
      baseUrl: service.url,
      token: service.token,
      timeoutMs: service.timeoutMs,
    }).publishRun(envelope);
    return true;
  } catch {
    onWarning?.(`Warden service could not publish run ${clientRunId}. Local results are unchanged.`);
    return false;
  }
}

/** Publish inspect reviews and isolate every service failure from local sidecar writes. */
export async function publishReviewsFailOpen(
  service: ResolvedServiceOptions,
  clientRunId: string,
  body: PublishReviewsRequest,
  onWarning?: (message: string) => void,
): Promise<boolean> {
  try {
    await createWardenServiceClient({
      baseUrl: service.url,
      token: service.token,
      timeoutMs: service.timeoutMs,
    }).publishReviews(clientRunId, body);
    return true;
  } catch (error) {
    if (error instanceof ServiceClientError && error.kind === 'http' && error.status === 404) {
      onWarning?.(
        `Warden service has not published run ${clientRunId} yet. Publish the run first, then save or replay to retry.`,
      );
      return false;
    }
    onWarning?.(`Warden service could not publish reviews for run ${clientRunId}. Local results are unchanged.`);
    return false;
  }
}

/** Recall once within the service deadline and return no memory on any failure. */
export async function recallMemoryFailOpen(
  service: ResolvedServiceOptions,
  request: MemoryRecallRequest,
): Promise<MemoryRecallResponse | undefined> {
  if (!service.memory) return undefined;
  try {
    const response = await createWardenServiceClient({
      baseUrl: service.url,
      token: service.token,
      timeoutMs: service.timeoutMs,
    }).recallMemory(request);
    return response;
  } catch {
    return undefined;
  }
}
