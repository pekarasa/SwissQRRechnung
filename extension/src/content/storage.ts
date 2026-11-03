import type { CreditorConfig } from '../core/types.js';
import {
  DEFAULT_CREDITOR,
  DEFAULT_APP_SETTINGS,
  isCreditorConfigured,
  type AppSettings,
  type CustomUrlsConfig,
} from '../core/settings.js';

export { DEFAULT_CREDITOR };

function sanitizeCustomUrls(urls?: Partial<CustomUrlsConfig>): CustomUrlsConfig {
  let clientsPath = urls?.clientsPath || DEFAULT_APP_SETTINGS.customUrls.clientsPath;
  let invoicesPath = urls?.invoicesPath || DEFAULT_APP_SETTINGS.customUrls.invoicesPath;

  // Migrate old defaults without subdirectory prefix
  if (
    clientsPath === 'listClientsExportEkarus.php?aktiv=1' ||
    clientsPath === 'listClientsExportEkarus.php'
  ) {
    clientsPath = DEFAULT_APP_SETTINGS.customUrls.clientsPath;
  }
  if (invoicesPath === 'betraege_gesamt_detail_ZR_Export.php') {
    invoicesPath = DEFAULT_APP_SETTINGS.customUrls.invoicesPath;
  }

  return { clientsPath, invoicesPath };
}

declare const browser: {
  storage?: {
    local?: {
      get: (keys: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
  runtime?: {
    openOptionsPage?: () => Promise<void>;
  };
} | undefined;

declare const chrome: {
  storage?: {
    local?: {
      get: (keys: string | string[] | null, callback?: (items: Record<string, unknown>) => void) => Promise<Record<string, unknown>> | void;
      set: (items: Record<string, unknown>, callback?: () => void) => Promise<void> | void;
    };
  };
  runtime?: {
    openOptionsPage?: (callback?: () => void) => void;
  };
} | undefined;

/**
 * Loads the complete application settings from extension storage.
 */
export async function loadAppSettings(): Promise<AppSettings> {
  try {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      const res = await browser.storage.local.get(['settings', 'creditor']);
      if (res.settings && typeof res.settings === 'object') {
        const loaded = res.settings as Partial<AppSettings>;
        return {
          ...DEFAULT_APP_SETTINGS,
          ...loaded,
          customUrls: sanitizeCustomUrls(loaded.customUrls),
        };
      }
      if (res.creditor && typeof res.creditor === 'object') {
        return {
          ...DEFAULT_APP_SETTINGS,
          creditor: res.creditor as CreditorConfig,
        };
      }
    } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage?.local?.get(['settings', 'creditor'], (result) => {
          resolve(result || {});
        });
      });
      if (res.settings && typeof res.settings === 'object') {
        const loaded = res.settings as Partial<AppSettings>;
        return {
          ...DEFAULT_APP_SETTINGS,
          ...loaded,
          customUrls: sanitizeCustomUrls(loaded.customUrls),
        };
      }
      if (res.creditor && typeof res.creditor === 'object') {
        return {
          ...DEFAULT_APP_SETTINGS,
          creditor: res.creditor as CreditorConfig,
        };
      }
    }
  } catch (err) {
    console.warn('[SwissQRRechnung] Konnte Einstellungen nicht aus Storage laden:', err);
  }

  return DEFAULT_APP_SETTINGS;
}

/**
 * Saves complete application settings to extension storage.
 */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      await browser.storage.local.set({
        settings,
        creditor: settings.creditor,
      });
      return;
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.set(
          {
            settings,
            creditor: settings.creditor,
          },
          () => resolve(),
        );
      });
    }
  } catch (err) {
    console.warn('[SwissQRRechnung] Konnte Einstellungen nicht speichern:', err);
  }
}

/**
 * Loads creditor configuration from browser extension storage,
 * falling back to default creditor if not yet configured.
 */
export async function loadCreditorConfig(): Promise<CreditorConfig> {
  const settings = await loadAppSettings();
  return settings.creditor;
}

/**
 * Saves creditor configuration to browser extension storage.
 */
export async function saveCreditorConfig(creditor: CreditorConfig): Promise<void> {
  const current = await loadAppSettings();
  await saveAppSettings({
    ...current,
    creditor,
  });
}

/**
 * Checks whether the creditor is fully configured in storage.
 */
export async function isCreditorConfiguredInStorage(): Promise<boolean> {
  const creditor = await loadCreditorConfig();
  return isCreditorConfigured(creditor);
}

/**
 * Opens the extension's options page.
 */
export async function openOptionsPage(): Promise<void> {
  try {
    if (typeof browser !== 'undefined' && browser.runtime?.openOptionsPage) {
      await browser.runtime.openOptionsPage();
      return;
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }
  } catch (err) {
    console.warn('[SwissQRRechnung] Konnte Optionsseite nicht über runtime öffnen:', err);
  }

  // Fallback: window.open if running in browser context
  if (typeof window !== 'undefined') {
    const optionsUrl = typeof browser !== 'undefined' && (browser as unknown as { runtime?: { getURL?: (p: string) => string } }).runtime?.getURL
      ? (browser as unknown as { runtime: { getURL: (p: string) => string } }).runtime.getURL('options/index.html')
      : typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? (chrome as unknown as { runtime: { getURL: (p: string) => string } }).runtime.getURL('options/index.html')
      : 'options/index.html';
    window.open(optionsUrl, '_blank');
  }
}
