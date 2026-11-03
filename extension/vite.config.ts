import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';

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
