import { access } from 'node:fs/promises';

await Promise.all([
  access(new URL('../dist/dashboard/index.html', import.meta.url)),
  access(new URL('../dist/dashboard/assets/app.js', import.meta.url)),
  access(new URL('../dist/dashboard/assets/styles.css', import.meta.url)),
]);
