/**
 * GitHub Action Runner
 *
 * main.ts installs action-bundle compatibility hooks before loading this
 * module. Workflow modules own trigger-level error handling.
 */

import { initSentry, flushSentry } from '../sentry.js';
import { ActionFailedError } from './workflow/base.js';
import { runAction } from './runner.js';
import { ActionCancellation, createActionSignalHandler } from './cancellation.js';

const CANCELLATION_TELEMETRY_FLUSH_TIMEOUT_MS = 3_000;

async function flushActionTelemetry(timeoutMs?: number): Promise<void> {
  if (!(await flushSentry(timeoutMs))) {
    console.warn('::warning::Timed out while flushing Sentry telemetry');
  }
}

async function main(): Promise<void> {
  const cancellation = new ActionCancellation();
  const handleSignal = createActionSignalHandler({ cancellation });
  const onSigint = () => handleSignal('SIGINT');
  const onSigterm = () => handleSignal('SIGTERM');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  try {
    await runAction(cancellation);
    await flushActionTelemetry(
      cancellation.requested ? CANCELLATION_TELEMETRY_FLUSH_TIMEOUT_MS : undefined,
    );
    if (cancellation.requested) {
      process.exitCode = cancellation.exitCode;
    }
  } catch (error) {
    if (error instanceof ActionFailedError) {
      console.error(`::error::${error.message}`);
    } else {
      console.error(`::error::Unexpected error: ${error}`);
    }
    await flushActionTelemetry(
      cancellation.requested ? CANCELLATION_TELEMETRY_FLUSH_TIMEOUT_MS : undefined,
    );
    process.exitCode = cancellation.requested ? cancellation.exitCode : 1;
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  }
}

initSentry('action');
void main();
