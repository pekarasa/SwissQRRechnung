import { describe, it, expect } from 'vitest';
import {
  validateCreditor,
  validateMergedRecord,
  validateForPdfGeneration,
} from '../src/pdf/validate.js';
import type { CreditorConfig, MergedRecord } from '../src/core/types.js';

describe('pdf validation', () => {
  const validCreditor: CreditorConfig = {
    iban: 'CH5691006ZN0KQ3CKLIB8',
    firstName: 'Peter',
    lastName: 'Portmann',
    street: 'Silandro',
    buildingNumber: '2',
    zipCode: '4450',
    city: 'Sissach',
  };

  const validRecord: MergedRecord = {
    invoice: {
      matchName: 'Meier, Frau Sandra',
      amount: 48,
      amountFormatted: '48.00',
    },
    client: {
      clientNumber: '181',
      salutation: 'Frau',
      firstName: 'Sandra',
      lastName: 'Meier',
      streetAndNumber: 'Hauptstrasse 43',
      street: 'Hauptstrasse',
      buildingNumber: '43',
      zipCode: '4450',
      city: 'Sissach',
      matchName: 'Meier, Frau Sandra',
    },
  };

  it('accepts valid creditor config', () => {
    expect(() => validateCreditor(validCreditor)).not.toThrow();
  });

  it('rejects invalid or missing IBAN', () => {
    expect(() =>
      validateCreditor({ ...validCreditor, iban: '' }),
    ).toThrowError(/IBAN des Rechnungsstellers fehlt/);

    expect(() =>
      validateCreditor({ ...validCreditor, iban: 'CH00INVALID' }),
    ).toThrowError(/Ungültige IBAN/);
  });

  it('rejects creditor with missing required fields', () => {
    expect(() =>
      validateCreditor({ ...validCreditor, firstName: '', lastName: '' }),
    ).toThrowError(/Name des Rechnungsstellers/);

    expect(() =>
      validateCreditor({ ...validCreditor, street: '' }),
    ).toThrowError(/Strasse des Rechnungsstellers/);

    expect(() =>
      validateCreditor({ ...validCreditor, zipCode: '' }),
    ).toThrowError(/PLZ des Rechnungsstellers/);

    expect(() =>
      validateCreditor({ ...validCreditor, city: '' }),
    ).toThrowError(/Ort des Rechnungsstellers/);
  });

  it('accepts valid merged record', () => {
    expect(() => validateMergedRecord(validRecord)).not.toThrow();
  });

  it('rejects invoice with zero or negative amount', () => {
    expect(() =>
      validateMergedRecord({
        ...validRecord,
        invoice: { ...validRecord.invoice, amount: 0, amountFormatted: '0.00' },
      }),
    ).toThrowError(/Ungültiger Rechnungsbetrag/);

    expect(() =>
      validateMergedRecord({
        ...validRecord,
        invoice: { ...validRecord.invoice, amount: -10, amountFormatted: '-10.00' },
      }),
    ).toThrowError(/Ungültiger Rechnungsbetrag/);
  });

  it('rejects client with missing address fields', () => {
    expect(() =>
      validateMergedRecord({
        ...validRecord,
        client: { ...validRecord.client, street: '' },
      }),
    ).toThrowError(/Strasse für Klient/);

    expect(() =>
      validateMergedRecord({
        ...validRecord,
        client: { ...validRecord.client, zipCode: '' },
      }),
    ).toThrowError(/PLZ für Klient/);

    expect(() =>
      validateMergedRecord({
        ...validRecord,
        client: { ...validRecord.client, city: '' },
      }),
    ).toThrowError(/Ort für Klient/);
  });

  it('rejects empty records list for PDF generation', () => {
    expect(() => validateForPdfGeneration([], validCreditor)).toThrowError(
      /Keine Rechnungsdatensätze/,
    );
  });
});
