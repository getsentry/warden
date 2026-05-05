#!/usr/bin/env node
import { initSentry, Sentry, flushSentry } from '../sentry.js';
initSentry('cli');

import { main, abortController, interrupted } from './main.js';
import { UserAbortError } from './input.js';
import { createSigintHandler } from './signals.js';

process.on('SIGINT', createSigintHandler({ abortController, interrupted }));

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
