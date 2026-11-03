import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Extension packaging and manifest validation', () => {
  const rootDir = resolve(import.meta.dirname, '..');
  const manifestPath = resolve(rootDir, 'manifest.json');
  const packageJsonPath = resolve(rootDir, 'package.json');
  const webExtConfigPath = resolve(rootDir, 'web-ext-config.cjs');

  it('matches version between manifest.json and package.json (SemVer)', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    expect(manifest.version).toBe(pkg.version);
    // SemVer regex
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('references existing icon files in manifest.json', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    for (const [size, iconPath] of Object.entries(manifest.icons as Record<string, string>)) {
      const fullPath = resolve(rootDir, iconPath);
      expect(existsSync(fullPath), `Icon ${size} at ${iconPath} should exist`).toBe(true);
    }
  });

  it('references existing dist and options files in manifest.json', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    expect(existsSync(resolve(rootDir, manifest.options_ui.page))).toBe(true);

    for (const script of manifest.background.scripts) {
      expect(existsSync(resolve(rootDir, script))).toBe(true);
    }

    for (const cs of manifest.content_scripts) {
      for (const js of cs.js) {
        expect(existsSync(resolve(rootDir, js))).toBe(true);
      }
      for (const css of cs.css) {
        expect(existsSync(resolve(rootDir, css))).toBe(true);
      }
    }
  });

  it('defines Gecko ID and data collection permissions for AMO / policy install', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.browser_specific_settings?.gecko?.id).toBe('swissqrrechnung@spitex.local');
    expect(manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required).toEqual(['none']);
  });

  it('has web-ext configuration ignoring development sources and fixtures', () => {
    expect(existsSync(webExtConfigPath)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(webExtConfigPath);
    expect(config.ignoreFiles).toContain('src/**');
    expect(config.ignoreFiles).toContain('test/**');
    expect(config.ignoreFiles).toContain('docs/**');
    expect(config.build?.overwriteDest).toBe(true);
  });
});
