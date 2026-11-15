import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { processMunicipalityBills } from '../src/core/pipeline.js';
import { DEFAULT_CREDITOR } from '../src/core/settings.js';
import {
  generateMunicipalityBillPdf,
  generateMunicipalityBillZip,
  MUNICIPALITY_PDF_FILENAME,
} from '../src/pdf/generator.js';
import { validateMunicipalityBill, validateMunicipalityBillsForPdf } from '../src/pdf/validate.js';
import type { MunicipalityBill } from '../src/core/types.js';

const fixtures = path.join(__dirname, 'fixtures');
const { bills } = processMunicipalityBills(
  fs.readFileSync(path.join(fixtures, 'Alle_Kantone_07-07_2026_1785683522.csv')),
  fs.readFileSync(path.join(fixtures, 'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls')),
  fs.readFileSync(path.join(fixtures, 'Liste-aller-Gemeinden-mit-aktiven-Klienten_15-11-2026.xlsx')),
  DEFAULT_CREDITOR,
  ['Gemeinde Sissach', 'Gemeinde Gelterkinden'],
);

describe('municipality PDF', () => {
  it('generates one page per bill with the municipality as debtor', async () => {
    const pdfBytes = await generateMunicipalityBillPdf(bills, DEFAULT_CREDITOR);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(4);

    const text = (await pdfParse(Buffer.from(pdfBytes))).text;
    expect(text).toContain('Peter Portmann');
    expect(text).toContain('Gemeinde Sissach');
    expect(text).toContain('Bahnhofstrasse 1');
    expect(text).toContain('Gemeinde Gelterkinden');
    expect(text).toContain('Marktgasse 8');
    expect(text).toContain('126.55');
    expect(text).toContain('90.50');
    expect(text).toContain('Restfinanzierung Pflege Bruno Knüsel (184), 07/2026');
  });

  it('generates a ZIP with individual PDFs and the combined PDF', async () => {
    const zip = await JSZip.loadAsync(await generateMunicipalityBillZip(bills, DEFAULT_CREDITOR));
    const names = Object.keys(zip.files);
    expect(names).toContain('Gemeinde Sissach_Meier_Sandra.pdf');
    expect(names).toContain('Gemeinde Gelterkinden_Knüsel_Bruno.pdf');
    expect(names).toContain(MUNICIPALITY_PDF_FILENAME);
    expect(names).toHaveLength(5);
  });

  describe('validation', () => {
    const bill = bills[0]!;
    const withDebtor = (patch: Partial<MunicipalityBill['debtor']>): MunicipalityBill => ({
      ...bill,
      debtor: { ...bill.debtor, ...patch },
    });

    it('accepts the fixture bills', () => {
      expect(() => validateMunicipalityBillsForPdf(bills, DEFAULT_CREDITOR)).not.toThrow();
    });

    it('rejects empty bill lists', () => {
      expect(() => validateMunicipalityBillsForPdf([], DEFAULT_CREDITOR)).toThrow(/Keine Gemeinde-Einzahlungsscheine/);
    });

    it('rejects missing address parts and too long texts', () => {
      expect(() => validateMunicipalityBill(withDebtor({ street: '' }))).toThrow(/Strasse bzw. Postfach fehlt/);
      expect(() => validateMunicipalityBill(withDebtor({ zipCode: '' }))).toThrow(/PLZ fehlt/);
      expect(() => validateMunicipalityBill(withDebtor({ city: 'x'.repeat(36) }))).toThrow(/Ort/);
      expect(() => validateMunicipalityBill({ ...bill, additionalInformation: 'x'.repeat(141) })).toThrow(/140 Zeichen/);
      expect(() => validateMunicipalityBill({ ...bill, amount: 0, amountFormatted: '0.00' })).toThrow(/grösser als 0/);
    });
  });
});
