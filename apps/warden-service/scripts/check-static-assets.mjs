import { access } from 'node:fs/promises';

await Promise.all([
  access(new URL('../public/index.html', import.meta.url)),
  access(new URL('../public/assets/app.js', import.meta.url)),
  access(new URL('../public/assets/styles.css', import.meta.url)),
]);
