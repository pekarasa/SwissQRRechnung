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

function sanitizeBundle(filePath) {
  let code = readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Eliminate setimmediate's Function constructor warning for AMO / web-ext lint
  if (code.includes('Function(``+e)')) {
    code = code.replace(
      /typeof e!=`function`&&\s*\(e=Function\(``\+e\)\)/g,
      'typeof e!=`function`&&(e=()=>e)',
    );
    changed = true;
  }

  // 2. Fix Rollup/Vite IIFE bug where `new URL('data:...', import.meta.url).href`
  // turns into `new URL(`data:...`, ``+{}.url).href` or `new URL(..., {}.url)`,
  // which throws `TypeError: URL constructor: undefined is not a valid URL` in Firefox.
  const urlWithUndefinedBaseRegex = /new\s+URL\s*\(\s*(`data:[^`]+`|"[^"]+"|'[^']+')\s*,\s*(?:[`'"]{0,2}\s*\+?\s*)?\(?\{\}\)?\.url\s*\)\.href/g;
  if (urlWithUndefinedBaseRegex.test(code)) {
    code = code.replace(urlWithUndefinedBaseRegex, '$1');
    changed = true;
  }

  const generalUrlWithUndefinedBaseRegex = /new\s+URL\s*\(\s*(`data:[^`]+`|"[^"]+"|'[^']+')\s*,\s*(?:[`'"]{0,2}\s*\+?\s*)?\(?\{\}\)?\.url\s*\)/g;
  if (generalUrlWithUndefinedBaseRegex.test(code)) {
    code = code.replace(generalUrlWithUndefinedBaseRegex, 'new URL($1)');
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, code, 'utf8');
  }
}

// Sanitize content script
sanitizeBundle(resolve(outDir, 'content.js'));

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
sanitizeBundle(resolve(outDir, 'options.js'));

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
sanitizeBundle(resolve(outDir, 'background.js'));

console.log('[Build] Completed successfully.');
