import { preloadPiRuntimeForActionBundle } from './pi-ncc-compat.js';

await preloadPiRuntimeForActionBundle();
await import('./run.js');
