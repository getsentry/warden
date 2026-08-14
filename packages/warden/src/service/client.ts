import { createWardenServiceClient } from '@sentry/warden-service-api';
import type { RunEnvelopeV1 } from '@sentry/warden-service-api';
import type {
  MemoryRecallRequest,
  MemoryRecallResponse,
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
