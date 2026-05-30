import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { validateActionLayout } from '../src/action/layout.js';

const scriptPath = process.argv[1];

if (scriptPath && import.meta.url === pathToFileURL(scriptPath).href) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const errors = validateActionLayout({
    repoRoot,
    requireDist: process.argv.includes('--require-dist'),
  });

  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exit(1);
  }
}
