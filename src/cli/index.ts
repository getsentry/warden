#!/usr/bin/env node
import { main } from './main.js';

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
