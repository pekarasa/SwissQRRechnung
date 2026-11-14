import { isIBANValid } from 'swissqrbill/utils';
import type { CreditorConfig } from './types.js';

export interface ExportParametersConfig {
  owner: number;
  sprache: string;
  kuerzelKanton: string;
  idKanton: number;
}

export interface CustomUrlsConfig {
  clientsPath: string;
  invoicesPath: string;
}

export interface AppSettings {
  creditor: CreditorConfig;
  unstructuredMessage: string;
  exportParams: ExportParametersConfig;
  customUrls: CustomUrlsConfig;
}

export const DEFAULT_CREDITOR: CreditorConfig = {
  iban: 'CH5691006ZN0KQ3CKLIB8',
  firstName: 'Peter',
  lastName: 'Portmann',
  street: 'Silandro',
  buildingNumber: '2',
  zipCode: '4450',
  city: 'Sissach',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  creditor: DEFAULT_CREDITOR,
  unstructuredMessage: 'Klientenanteil Spitex',
  exportParams: {
    owner: 1,
    sprache: 'DE',
    kuerzelKanton: 'O_K',
    idKanton: 0,
  },
  customUrls: {
    clientsPath: 'listen/listClientsExportEkarus.php?aktiv=1',
    invoicesPath: 'Rechnung/betraege_gesamt_detail_ZR_Export.php',
  },
};

/**
 * Validates individual fields of a creditor configuration.
 * Returns an errors map keyed by field name.
 */
export function validateCreditorFields(creditor: Partial<CreditorConfig> | null | undefined): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!creditor) {
    errors.creditor = 'Rechnungssteller-Konfiguration fehlt.';
    return { isValid: false, errors };
  }

  const iban = (creditor.iban ?? '').replace(/\s+/g, '').toUpperCase();
  if (!iban) {
    errors.iban = 'Bitte geben Sie eine IBAN ein.';
  } else if (!isIBANValid(iban)) {
    errors.iban = 'Ungültige IBAN. Bitte eine gültige Schweizer IBAN eingeben (z. B. CH...).';
  }

  const firstName = (creditor.firstName ?? '').trim();
  const lastName = (creditor.lastName ?? '').trim();
  if (!firstName && !lastName) {
    errors.lastName = 'Bitte geben Sie mindestens einen Vor- oder Nachnamen an.';
  } else if (`${firstName} ${lastName}`.trim().length > 70) {
    errors.lastName = 'Der vollständige Name darf maximal 70 Zeichen lang sein.';
  }

  const street = (creditor.street ?? '').trim();
  if (!street) {
    errors.street = 'Bitte geben Sie eine Strasse an.';
  } else if (street.length > 70) {
    errors.street = 'Die Strasse darf maximal 70 Zeichen lang sein.';
  }

  const buildingNumber = (creditor.buildingNumber ?? '').trim();
  if (buildingNumber.length > 16) {
    errors.buildingNumber = 'Die Hausnummer darf maximal 16 Zeichen lang sein.';
  }

  const zipCode = (creditor.zipCode ?? '').trim();
  if (!zipCode) {
    errors.zipCode = 'Bitte geben Sie eine Postleitzahl an.';
  } else if (zipCode.length > 16) {
    errors.zipCode = 'Die PLZ darf maximal 16 Zeichen lang sein.';
  }

  const city = (creditor.city ?? '').trim();
  if (!city) {
    errors.city = 'Bitte geben Sie einen Ort an.';
  } else if (city.length > 35) {
    errors.city = 'Der Ort darf maximal 35 Zeichen lang sein.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Checks whether creditor configuration is fully set up and valid.
 */
export function isCreditorConfigured(creditor: CreditorConfig | null | undefined): boolean {
  if (!creditor) {
    return false;
  }
  const { isValid } = validateCreditorFields(creditor);
  return isValid;
}

/**
 * Imports creditor details from a JSON string or object (matching Rechnungssteller.json format).
 * Supports German and English property names.
 */
export function importCreditorFromJson(raw: string | Record<string, unknown>): CreditorConfig {
  let data: Record<string, unknown>;

  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Ungültiges JSON-Format beim Importieren der Rechnungssteller-Datei.');
    }
  } else if (raw && typeof raw === 'object') {
    data = raw;
  } else {
    throw new Error('Die Rechnungssteller-Daten müssen ein JSON-Objekt sein.');
  }

  const getString = (keys: string[]): string => {
    for (const key of keys) {
      if (key in data && data[key] !== null && data[key] !== undefined) {
        return String(data[key]).trim();
      }
    }
    return '';
  };

  const iban = getString(['IBAN', 'iban']).replace(/\s+/g, '').toUpperCase();
  const firstName = getString(['Vorname', 'firstName', 'firstname']);
  const lastName = getString(['Nachname', 'lastName', 'lastname', 'Name', 'name']);
  const street = getString(['Strasse', 'street', 'StrasseNr']);
  const buildingNumber = getString(['StrassenNr', 'Strassennummer', 'Hausnummer', 'buildingNumber', 'houseNumber', 'nr']);
  const zipCode = getString(['PLZ', 'zipCode', 'zip', 'Postleitzahl']);
  const city = getString(['Ort', 'city', 'Wohnort']);

  const creditor: CreditorConfig = {
    iban,
    firstName,
    lastName,
    street,
    buildingNumber,
    zipCode,
    city,
  };

  return creditor;
}

/**
 * Exports creditor configuration to the canonical Rechnungssteller.json format.
 */
export function exportCreditorToJson(creditor: CreditorConfig): string {
  const exportObject = {
    IBAN: creditor.iban.replace(/\s+/g, '').toUpperCase(),
    Vorname: creditor.firstName.trim(),
    Nachname: creditor.lastName.trim(),
    Strasse: creditor.street.trim(),
    StrassenNr: creditor.buildingNumber ? creditor.buildingNumber.trim() : '',
    PLZ: creditor.zipCode.trim(),
    Ort: creditor.city.trim(),
  };

  return JSON.stringify(exportObject, null, 4);
}
