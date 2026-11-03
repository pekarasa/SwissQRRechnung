import { build } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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

// Eliminate setimmediate's Function constructor warning for AMO / web-ext lint
const contentJsPath = resolve(outDir, 'content.js');
let contentCode = readFileSync(contentJsPath, 'utf8');
contentCode = contentCode.replace(
  /typeof e!=`function`&&\s*\(e=Function\(``\+e\)\)/g,
  'typeof e!=`function`&&(e=()=>e)',
);
writeFileSync(contentJsPath, contentCode, 'utf8');

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

console.log('[Build] Building background script...');
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: resolve(import.meta.dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'SwissQRBackground',
      },
    },
  },
});

console.log('[Build] Completed successfully.');
