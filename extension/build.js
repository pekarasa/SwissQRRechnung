import { build } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';

const outDir = resolve(import.meta.dirname, 'dist');
mkdirSync(outDir, { recursive: true });

console.log('[Build] Building content script...');
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(import.meta.dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'SwissQRContent',
      },
    },
  },
});

copyFileSync(
  resolve(import.meta.dirname, 'src/content/styles.css'),
  resolve(outDir, 'content.css'),
);

console.log('[Build] Building options script...');
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: resolve(import.meta.dirname, 'src/options/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'SwissQROptions',
      },
    },
  },
});

copyFileSync(
  resolve(import.meta.dirname, 'src/options/styles.css'),
  resolve(outDir, 'options.css'),
);

console.log('[Build] Completed successfully.');
