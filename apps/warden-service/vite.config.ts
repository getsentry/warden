import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithOxc } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./src/client', import.meta.url)),
  publicDir: false,
  plugins: [
    {
      name: 'prepaint-theme',
      async transformIndexHtml() {
        const source = await readFile(
          new URL('./src/client/theme-bootstrap.ts', import.meta.url),
          'utf8',
        );
        const compiled = await transformWithOxc(source, 'theme-bootstrap.ts');
        return [{ tag: 'script', children: compiled.code, injectTo: 'head-prepend' }];
      },
    },
  ],
  build: {
    outDir: fileURLToPath(new URL('./dist/dashboard', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/styles.css',
      },
    },
  },
});
