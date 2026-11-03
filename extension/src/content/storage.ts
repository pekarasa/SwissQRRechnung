import type { CreditorConfig } from '../core/types.js';

export const DEFAULT_CREDITOR: CreditorConfig = {
  iban: 'CH5691006ZN0KQ3CKLIB8',
  firstName: 'Peter',
  lastName: 'Portmann',
  street: 'Silandro',
  buildingNumber: '2',
  zipCode: '4450',
  city: 'Sissach',
};

declare const browser: {
  storage?: {
    local?: {
      get: (keys: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
} | undefined;

declare const chrome: {
  storage?: {
    local?: {
      get: (keys: string | string[] | null, callback?: (items: Record<string, unknown>) => void) => Promise<Record<string, unknown>> | void;
      set: (items: Record<string, unknown>, callback?: () => void) => Promise<void> | void;
    };
  };
} | undefined;

/**
 * Loads creditor configuration from browser extension storage,
 * falling back to default creditor if not yet configured.
 */
export async function loadCreditorConfig(): Promise<CreditorConfig> {
  try {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      const res = await browser.storage.local.get('creditor');
      if (res && res.creditor && typeof res.creditor === 'object') {
        return res.creditor as CreditorConfig;
      }
    } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage?.local?.get('creditor', (result) => {
          resolve(result || {});
        });
      });
      if (res && res.creditor && typeof res.creditor === 'object') {
        return res.creditor as CreditorConfig;
      }
    }
  } catch (err) {
    console.warn('[SwissQRRechnung] Konnte Rechnungssteller nicht aus Storage laden:', err);
  }

  return DEFAULT_CREDITOR;
}

/**
 * Saves creditor configuration to browser extension storage.
 */
export async function saveCreditorConfig(creditor: CreditorConfig): Promise<void> {
  try {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      await browser.storage.local.set({ creditor });
      return;
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.set({ creditor }, () => resolve());
      });
    }
  } catch (err) {
    console.warn('[SwissQRRechnung] Konnte Rechnungssteller nicht speichern:', err);
  }
}
