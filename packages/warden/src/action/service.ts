import type { MemoryRecallResponse } from '@sentry/warden-service-api';
import type { FindingsOutput } from '../reporting/output.js';
import type { ActionInputs } from './inputs.js';
import type { ServiceConfig } from '../config/schema.js';
import type { EventContext } from '../types/index.js';
import { warnAction } from '../cli/output/tty.js';
import {
  buildFindingsServiceRunEnvelope,
  publishRunFailOpen,
  createServiceReviewMemory,
  resolveServiceOptions,
} from '../service/index.js';
import type { ResolvedServiceOptions } from '../service/index.js';
import type { ReviewMemoryAccess } from '../sdk/memory.js';

export interface ActionReviewMemory {
  memories: MemoryRecallResponse['memories'];
  clientRecallId?: string;
  memory?: ReviewMemoryAccess;
}

/** Configure on-demand memory and expose recall accounting only after a tool search. */
export function createActionReviewMemory(
  service: ResolvedServiceOptions | undefined,
  context: EventContext,
): ActionReviewMemory {
  const memory = createServiceReviewMemory(service, {
    provider: 'github', owner: context.repository.owner, name: context.repository.name, fullName: context.repository.fullName,
  }, context.repoPath);
  return {
    memory,
    get memories() { return memory?.recall?.memories ?? []; },
    get clientRecallId() { return memory?.recall?.clientRecallId; },
  };
}

/** Resolve Action options without trusting repository configuration to choose the authenticated endpoint. */
export function resolveActionServiceOptions(
  inputs: ActionInputs,
  config?: ServiceConfig,
): ResolvedServiceOptions | undefined {
  return resolveServiceOptions({
    explicit: {
      url: inputs.serviceUrl,
      token: inputs.serviceToken,
      data: inputs.serviceData,
      memory: inputs.serviceMemory,
      timeoutMs: inputs.serviceTimeoutMs,
    },
    config: config ? {
      data: config.data,
      memory: config.memory,
      timeoutMs: config.timeoutMs,
    } : undefined,
    onWarning: warnAction,
  });
}

/** Publish the final in-memory Action result after GitHub and artifact writes have completed. */
export async function publishActionFindingsFailOpen(
  service: ResolvedServiceOptions | undefined,
  output: FindingsOutput,
): Promise<void> {
  if (!service) return;
  try {
    const envelope = buildFindingsServiceRunEnvelope(output, service, 'action');
    const published = await publishRunFailOpen(service, envelope);
    if (!published) {
      warnAction(`Warden service could not publish run ${output.runId}. Action results are unchanged.`);
    }
  } catch {
    warnAction(`Warden service could not publish run ${output.runId}. Action results are unchanged.`);
  }
}

/** Build and publish an Action result while isolating projection failures from workflow behavior. */
export async function publishActionRunFailOpen(
  service: ResolvedServiceOptions | undefined,
  buildOutput: () => FindingsOutput,
): Promise<void> {
  if (!service) return;
  try {
    await publishActionFindingsFailOpen(service, buildOutput());
  } catch {
    warnAction('Warden service could not build the Action run envelope. Action results are unchanged.');
  }
}

/** Publish an early Action failure using the metrics-only profile. */
export async function publishActionEarlyFailureFailOpen(
  service: ResolvedServiceOptions | undefined,
  buildOutput: () => FindingsOutput,
): Promise<void> {
  if (!service) return;
  await publishActionRunFailOpen({
    ...service,
    data: 'metrics',
    memory: false,
  }, buildOutput);
}
