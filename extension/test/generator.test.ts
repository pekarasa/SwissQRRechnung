import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { parseClients } from '../src/core/parseClients.js';
import { parseInvoices } from '../src/core/parseInvoices.js';
import { mergeInvoicesWithClients } from '../src/core/merge.js';
import {
  generateQrBillPdf,
  generateSingleQrBillPdf,
  generateQrBillZip,
} from '../src/pdf/generator.js';
import type { CreditorConfig } from '../src/core/types.js';

describe('pdf generator', () => {
  const creditor: CreditorConfig = {
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

  const invoices = parseInvoices(fs.readFileSync(invoicesPath));
  const clients = parseClients(fs.readFileSync(clientsPath));
  const { matched } = mergeInvoicesWithClients(invoices, clients);

  it('generates multi-page A4 PDF matching reference structure', async () => {
    expect(matched).toHaveLength(4);

    const pdfBytes = await generateQrBillPdf(matched, creditor);
    expect(pdfBytes.byteLength).toBeGreaterThan(5000);

    // Inspect pages with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(4);

    for (let i = 0; i < 4; i++) {
      const page = pdfDoc.getPage(i)!;
      const size = page.getSize();
      // Standard A4: 595.28 x 841.89 pt (210 x 297 mm)
      expect(Math.round(size.width)).toBe(595);
      expect(Math.round(size.height)).toBe(842);
    }

    // Inspect text content with pdf-parse
    const parsed = await pdfParse(Buffer.from(pdfBytes));
    const fullText = parsed.text;

    // Verify Creditor
    expect(fullText).toContain('CH56 9100 6ZN0 KQ3C KLIB 8');
    expect(fullText).toContain('Peter Portmann');
    expect(fullText).toContain('Silandro 2');
    expect(fullText).toContain('4450 Sissach');
    expect(fullText).toContain('Klientenanteil Spitex');

    // Verify Debtor 1: Sandra Meier
    expect(fullText).toContain('Sandra Meier');
    expect(fullText).toContain('Hauptstrasse 43');
    expect(fullText).toContain('48.00');

    // Verify Debtor 2: Walter Steiner (with umlaut Köhlerweg)
    expect(fullText).toContain('Walter Steiner');
    expect(fullText).toContain('Köhlerweg 9');
    expect(fullText).toContain('13.40');

    // Verify Debtor 3: Bruno Knüsel (with umlaut Knüsel)
    expect(fullText).toContain('Bruno Knüsel');
    expect(fullText).toContain('Hauptstrasse 57');
    expect(fullText).toContain('4460 Gelterkinden');
    expect(fullText).toContain('30.60');

    // Verify Debtor 4: Carmen Wagner
    expect(fullText).toContain('Carmen Wagner');
    expect(fullText).toContain('Himmelrain 34a');
    expect(fullText).toContain('45.90');
  });

  it('generates single-page PDF for one client', async () => {
    const singleRecord = matched[0]!;
    const singlePdfBytes = await generateSingleQrBillPdf(singleRecord, creditor);

    const pdfDoc = await PDFDocument.load(singlePdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0)!;
    expect(Math.round(page.getSize().width)).toBe(595);
    expect(Math.round(page.getSize().height)).toBe(842);
  });

  it('generates ZIP archive with individual PDFs and combined PDF', async () => {
    const zipBytes = await generateQrBillZip(matched, creditor);
    expect(zipBytes.byteLength).toBeGreaterThan(10000);

    const zip = await JSZip.loadAsync(zipBytes);
    const filenames = Object.keys(zip.files);

    expect(filenames).toContain('Meier_Sandra.pdf');
    expect(filenames).toContain('Steiner_Walter.pdf');
    expect(filenames).toContain('Knüsel_Bruno.pdf');
    expect(filenames).toContain('Wagner_Carmen.pdf');
    expect(filenames).toContain('QR-Rechnungen.pdf');
  });
});
