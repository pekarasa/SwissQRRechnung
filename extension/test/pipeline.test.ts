import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { processInvoicesAndClients } from '../src/core/pipeline.js';
import type { CreditorConfig } from '../src/core/types.js';

describe('end-to-end pipeline', () => {
  const creditor: CreditorConfig = {
    IBAN: 'CH5691006ZN0KQ3CKLIB8',
    Vorname: 'Peter',
    Nachname: 'Portmann',
    Strasse: 'Silandro',
    StrassenNr: '2',
    PLZ: '4450',
    Ort: 'Sissach',
  } as unknown as CreditorConfig;

  // Normalize creditor field names
  const normalizedCreditor: CreditorConfig = {
    iban: 'CH5691006ZN0KQ3CKLIB8',
    firstName: 'Peter',
    lastName: 'Portmann',
    street: 'Silandro',
    buildingNumber: '2',
    zipCode: '4450',
    city: 'Sissach',
  };

  const invoicesPath = path.join(
    __dirname,
    'fixtures',
    'Alle_Kantone_07-07_2026_1785683522.csv',
  );
  const clientsPath = path.join(
    __dirname,
    'fixtures',
    'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls',
  );
  const referenceCsvPath = path.join(__dirname, 'fixtures', 'QR-Rechnungen.csv');

  it('reproduces QR-Rechnungen.csv byte-for-byte from sample fixtures', () => {
    const invoicesData = fs.readFileSync(invoicesPath);
    const clientsData = fs.readFileSync(clientsPath);
    const expectedCsvBytes = fs.readFileSync(referenceCsvPath);

    const result = processInvoicesAndClients(invoicesData, clientsData, normalizedCreditor);

    expect(result.matchedCount).toBe(4);
    expect(result.unmatchedInvoices).toHaveLength(0);

    // Verify exact byte equality with reference cp1252 CSV
    const generatedBuffer = Buffer.from(result.csvBytes);
    const expectedBuffer = Buffer.from(expectedCsvBytes);

    expect(generatedBuffer.equals(expectedBuffer)).toBe(true);
  });

  describe('error and edge cases', () => {
    it('handles empty clients master data', () => {
      const invoicesData = fs.readFileSync(invoicesPath);
      const emptyClientsData = new Uint8Array(0);

      const result = processInvoicesAndClients(invoicesData, emptyClientsData, normalizedCreditor);
      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedInvoices).toHaveLength(4);
      expect(result.rows).toHaveLength(0);
    });

    it('handles empty invoices data', () => {
      const emptyInvoicesData = '';
      const clientsData = fs.readFileSync(clientsPath);

      const result = processInvoicesAndClients(emptyInvoicesData, clientsData, normalizedCreditor);
      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedInvoices).toHaveLength(0);
      expect(result.rows).toHaveLength(0);
    });

    it('identifies invoices where client is missing in master data', () => {
      const customInvoices = [
        'Line 1',
        'Line 2',
        'Line 3',
        'Line 4',
        `"Meier, Frau Sandra"\t07\t2026\t11\t02.08.2026\t0\t0\t0\t48.00\t`,
        `"Unbekannt, Herr NichtDa"\t07\t2026\t12\t02.08.2026\t0\t0\t0\t25.00\t`,
      ].join('\n');

      const clientsData = fs.readFileSync(clientsPath);
      const result = processInvoicesAndClients(customInvoices, clientsData, normalizedCreditor);

      expect(result.matchedCount).toBe(1);
      expect(result.unmatchedInvoices).toHaveLength(1);
      expect(result.unmatchedInvoices[0]?.matchName).toBe('Unbekannt, Herr NichtDa');
    });

    it('throws error when invoice has invalid amount', () => {
      const invalidInvoice = [
        'Line 1',
        'Line 2',
        'Line 3',
        'Line 4',
        `"Meier, Frau Sandra"\t07\t2026\t11\t02.08.2026\t0\t0\t0\tUNGÜLTIG\t`,
      ].join('\n');

      const clientsData = fs.readFileSync(clientsPath);
      expect(() =>
        processInvoicesAndClients(invalidInvoice, clientsData, normalizedCreditor),
      ).toThrowError(/Ungültiger Betrag/);
    });
  });
});
