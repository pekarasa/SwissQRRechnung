import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function sanitizeBundle(filePath: string): void {
  try {
    let code = readFileSync(filePath, 'utf8');
    let changed = false;

    if (code.includes('Function(``+e)')) {
      code = code.replace(
        /typeof e!=`function`&&\s*\(e=Function\(``\+e\)\)/g,
        'typeof e!=`function`&&(e=()=>e)',
      );
      changed = true;
    }

    const urlWithUndefinedBaseRegex =
      /new\s+URL\s*\(\s*(`data:[^`]+`|"[^"]+"|'[^']+')\s*,\s*(?:[`'"]{0,2}\s*\+?\s*)?\(?\{\}\)?\.url\s*\)\.href/g;
    if (urlWithUndefinedBaseRegex.test(code)) {
      code = code.replace(urlWithUndefinedBaseRegex, '$1');
      changed = true;
    }

    const generalUrlWithUndefinedBaseRegex =
      /new\s+URL\s*\(\s*(`data:[^`]+`|"[^"]+"|'[^']+')\s*,\s*(?:[`'"]{0,2}\s*\+?\s*)?\(?\{\}\)?\.url\s*\)/g;
    if (generalUrlWithUndefinedBaseRegex.test(code)) {
      code = code.replace(generalUrlWithUndefinedBaseRegex, 'new URL($1)');
      changed = true;
    }

    if (changed) {
      writeFileSync(filePath, code, 'utf8');
    }
  } catch {
    // Ignore missing files
  }
}

function copyContentCssPlugin(): Plugin {
  return {
    name: 'copy-content-css',
    closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist');
      mkdirSync(outDir, { recursive: true });
      copyFileSync(
        resolve(import.meta.dirname, 'src/content/styles.css'),
        resolve(outDir, 'content.css'),
      );
      sanitizeBundle(resolve(outDir, 'content.js'));
    },
  };
}

export default defineConfig({
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
  plugins: [copyContentCssPlugin()],
});
