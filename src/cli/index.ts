#!/usr/bin/env node
import { main } from './main.js';

process.on('SIGINT', () => {
  process.stderr.write('\n');
  process.exit(130);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
