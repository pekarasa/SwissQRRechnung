import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CREDITOR,
  DEFAULT_APP_SETTINGS,
  validateCreditorFields,
  isCreditorConfigured,
  importCreditorFromJson,
  exportCreditorToJson,
} from '../src/core/settings.js';

describe('settings', () => {
  describe('DEFAULT_APP_SETTINGS', () => {
    it('provides valid default creditor and settings', () => {
      expect(isCreditorConfigured(DEFAULT_APP_SETTINGS.creditor)).toBe(true);
      expect(DEFAULT_APP_SETTINGS.unstructuredMessage).toBe('Klientenanteil Spitex');
      expect(DEFAULT_APP_SETTINGS.exportParams.kuerzelKanton).toBe('O_K');
      expect(DEFAULT_APP_SETTINGS.exportParams.idKanton).toBe(0);
    });
  });

  describe('validateCreditorFields', () => {
    it('accepts valid creditor without errors', () => {
      const result = validateCreditorFields(DEFAULT_CREDITOR);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('detects invalid IBAN', () => {
      const result = validateCreditorFields({
        ...DEFAULT_CREDITOR,
        iban: 'CH00INVALID',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.iban).toContain('Ungültige IBAN');
    });

    it('detects missing name', () => {
      const result = validateCreditorFields({
        ...DEFAULT_CREDITOR,
        firstName: '',
        lastName: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.lastName).toBeDefined();
    });

    it('detects missing street, zip and city', () => {
      const result = validateCreditorFields({
        iban: DEFAULT_CREDITOR.iban,
        firstName: 'Hans',
        lastName: 'Muster',
        street: '   ',
        zipCode: '',
        city: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.street).toBeDefined();
      expect(result.errors.zipCode).toBeDefined();
      expect(result.errors.city).toBeDefined();
    });

    it('handles null and undefined', () => {
      expect(validateCreditorFields(null).isValid).toBe(false);
      expect(validateCreditorFields(undefined).isValid).toBe(false);
      expect(isCreditorConfigured(null)).toBe(false);
    });
  });

  describe('importCreditorFromJson and exportCreditorToJson', () => {
    it('imports from German Rechnungssteller.json format', () => {
      const jsonStr = JSON.stringify({
        IBAN: 'CH5691006ZN0KQ3CKLIB8',
        Vorname: 'Peter',
        Nachname: 'Portmann',
        Strasse: 'Silandro',
        StrassenNr: '2',
        PLZ: 4450,
        Ort: 'Sissach',
      });

      const imported = importCreditorFromJson(jsonStr);
      expect(imported.iban).toBe('CH5691006ZN0KQ3CKLIB8');
      expect(imported.firstName).toBe('Peter');
      expect(imported.lastName).toBe('Portmann');
      expect(imported.street).toBe('Silandro');
      expect(imported.buildingNumber).toBe('2');
      expect(imported.zipCode).toBe('4450');
      expect(imported.city).toBe('Sissach');
    });

    it('imports from English key format', () => {
      const parsed = importCreditorFromJson({
        iban: 'CH56 9100 6ZN0 KQ3C KLIB 8',
        firstName: 'Anna',
        lastName: 'Meier',
        street: 'Bahnhofstrasse',
        buildingNumber: '10a',
        zipCode: '8001',
        city: 'Zürich',
      });

      expect(parsed.iban).toBe('CH5691006ZN0KQ3CKLIB8');
      expect(parsed.firstName).toBe('Anna');
      expect(parsed.lastName).toBe('Meier');
      expect(parsed.buildingNumber).toBe('10a');
    });

    it('throws error for malformed JSON string', () => {
      expect(() => importCreditorFromJson('not-json')).toThrow(
        'Ungültiges JSON-Format',
      );
    });

    it('exports and re-imports roundtrip', () => {
      const jsonStr = exportCreditorToJson(DEFAULT_CREDITOR);
      const parsedObj = JSON.parse(jsonStr);

      expect(parsedObj.IBAN).toBe('CH5691006ZN0KQ3CKLIB8');
      expect(parsedObj.Vorname).toBe('Peter');
      expect(parsedObj.Nachname).toBe('Portmann');
      expect(parsedObj.Strasse).toBe('Silandro');
      expect(parsedObj.StrassenNr).toBe('2');
      expect(parsedObj.PLZ).toBe('4450');
      expect(parsedObj.Ort).toBe('Sissach');

      const reimported = importCreditorFromJson(jsonStr);
      expect(reimported).toEqual(DEFAULT_CREDITOR);
    });
  });
});
