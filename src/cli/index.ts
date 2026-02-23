#!/usr/bin/env node
import { initSentry, Sentry, flushSentry } from '../sentry.js';
initSentry('cli');

import { main, abortController, interrupted } from './main.js';
import { UserAbortError } from './input.js';

let interruptCount = 0;

process.on('SIGINT', () => {
  interruptCount++;
  abortController.abort();
  interrupted.value = true;

  if (interruptCount > 1) {
    // Second Ctrl+C: force exit immediately
    process.exit(130);
  }

  // First Ctrl+C: let the main flow collect partial results.
  // The interrupt message is rendered by Ink (TTY) or logPlain (non-TTY)
  // via the abort signal listener -- no direct stderr writes needed here.
});

main().catch(async (error) => {
  if (error instanceof UserAbortError) {
    try {
      await flushSentry();
    } catch {
      // Best-effort flush - don't let Sentry errors prevent clean exit
    }
    process.exit(130);
  }
  Sentry.captureException(error);
  await flushSentry();
  console.error('Fatal error:', error);
  process.exit(1);
});
