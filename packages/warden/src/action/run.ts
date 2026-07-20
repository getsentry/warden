/**
 * GitHub Action Runner
 *
 * main.ts installs action-bundle compatibility hooks before loading this
 * module. Workflow modules own trigger-level error handling.
 */

import { initSentry, flushSentry } from '../sentry.js';
import { ActionFailedError } from './workflow/base.js';
import { runAction } from './runner.js';

initSentry('action');
runAction()
  .then(() => flushSentry())
  .catch(async (error) => {
    if (error instanceof ActionFailedError) {
      console.error(`::error::${error.message}`);
    } else {
      console.error(`::error::Unexpected error: ${error}`);
    }
    await flushSentry();
    process.exit(1);
  });
