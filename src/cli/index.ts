#!/usr/bin/env node
import { main, abortController } from './main.js';

process.on('SIGINT', () => {
  // Abort any running SDK queries
  abortController.abort();
  process.stderr.write('\n');
  process.exit(130);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
