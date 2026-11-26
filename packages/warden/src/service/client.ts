import { createWardenServiceClient } from '@sentry/warden-service-api';
import type { RunEnvelopeV1 } from '@sentry/warden-service-api';
import type {
  MemoryRecallRequest,
  MemoryRecallResponse,
  RepositoryIdentity,
} from '@sentry/warden-service-api';
import type { HunkReviewCache } from '../sdk/hunk-review-cache.js';
import type { ToolEvidence } from '../sdk/runtimes/types.js';
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

const RECALL_BATCH = 1_000;
const RECORD_BATCH = 500;

function batches<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/**
 * Hunk review cache backed by the Warden service. Every failure falls back to a full review: recall
 * returns nothing and record drops the reviews.
 */
export function createServiceHunkReviewCache(
  service: ResolvedServiceOptions,
  repository: RepositoryIdentity,
  reviewedSha?: string,
  onWarning?: (message: string) => void,
): HunkReviewCache {
  const client = createWardenServiceClient({ baseUrl: service.url, token: service.token, timeoutMs: service.timeoutMs });
  return {
    async recall(keys) {
      const recalled = new Map<string, ToolEvidence[]>();
      try {
        for (const batch of batches(keys, RECALL_BATCH)) {
          const response = await client.recallHunkReviews({ protocolVersion: 1, repository, keys: batch });
          for (const review of response.reviews) recalled.set(review.key, review.evidence);
        }
      } catch {
        return new Map();
      }
      return recalled;
    },
    async record(reviews) {
      try {
        for (const batch of batches(reviews, RECORD_BATCH)) {
          await client.recordHunkReviews({
            protocolVersion: 1,
            repository,
            reviews: batch.map((review) => ({ ...review, ...(reviewedSha ? { reviewedSha } : {}) })),
          });
        }
      } catch {
        onWarning?.('Warden service could not store hunk reviews. Later runs will review these hunks again.');
      }
    },
  };
}
