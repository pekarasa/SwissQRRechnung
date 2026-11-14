import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CREDITOR,
  isCreditorConfigured,
  validateCreditorFields,
  type AppSettings,
} from '../src/core/settings.js';
import { processInvoicesAndClients } from '../src/core/pipeline.js';
import { generateQrBillPdf, generateQrBillZip } from '../src/pdf/generator.js';

describe('Stage 4: End-to-End & Settings Integration', () => {
  const fixturesDir = resolve(import.meta.dirname, 'fixtures');
  const invoicesRaw = readFileSync(
    resolve(fixturesDir, 'Alle_Kantone_07-07_2026_1785683522.csv'),
  );
  const clientsRaw = readFileSync(
    resolve(fixturesDir, 'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls'),
  );

  it('detects unconfigured vs. configured creditor states', () => {
    expect(isCreditorConfigured(null)).toBe(false);
    expect(isCreditorConfigured({ ...DEFAULT_CREDITOR, iban: '' })).toBe(false);
    expect(isCreditorConfigured(DEFAULT_CREDITOR)).toBe(true);

    const validation = validateCreditorFields({
      ...DEFAULT_CREDITOR,
      iban: 'CH00INVALID',
      city: '',
    });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.iban).toBeDefined();
    expect(validation.errors.city).toBeDefined();
  });

  it('runs complete Stage 4 generation pipeline into combined PDF and ZIP archive', async () => {
    const customSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      unstructuredMessage: 'Klientenanteil Spitex Juli 2026',
    };

    const processResult = processInvoicesAndClients(
      new Uint8Array(invoicesRaw),
      new Uint8Array(clientsRaw),
      customSettings.creditor,
      customSettings.unstructuredMessage,
    );

    expect(processResult.matchedCount).toBe(4);
    expect(processResult.unmatchedInvoices.length).toBe(0);

    // 1. Generate Combined PDF
    const pdfBytes = await generateQrBillPdf(
      processResult.matched,
      customSettings.creditor,
      { unstructuredMessage: customSettings.unstructuredMessage },
    );
    expect(pdfBytes.length).toBeGreaterThan(1000);
    const pdfHeader = String.fromCharCode(...pdfBytes.subarray(0, 5));
    expect(pdfHeader).toBe('%PDF-');

    // 2. Generate ZIP with individual PDFs
    const zipBytes = await generateQrBillZip(
      processResult.matched,
      customSettings.creditor,
      { unstructuredMessage: customSettings.unstructuredMessage },
    );
    expect(zipBytes.length).toBeGreaterThan(1000);
    expect(zipBytes[0]).toBe(0x50); // 'P'
    expect(zipBytes[1]).toBe(0x4b); // 'K'

    // Verify ZIP archive entries
    const zip = await JSZip.loadAsync(zipBytes);
    expect(zip.file('QR-Rechnungen.pdf')).not.toBeNull();
    expect(zip.file('Meier_Sandra.pdf')).not.toBeNull();
    expect(zip.file('Steiner_Walter.pdf')).not.toBeNull();
    expect(zip.file('Knüsel_Bruno.pdf')).not.toBeNull();
    expect(zip.file('Wagner_Carmen.pdf')).not.toBeNull();
  });

  it('verifies manifest configuration, options page, and icons', () => {
    const manifestPath = resolve(import.meta.dirname, '../manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    // Check manifest properties
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('SwissQRRechnung');
    expect(manifest.options_ui).toBeDefined();
    expect(manifest.options_ui.page).toBe('options/index.html');

    // Options HTML must exist
    const optionsPath = resolve(import.meta.dirname, '..', manifest.options_ui.page);
    expect(existsSync(optionsPath)).toBe(true);

    // Check all declared icons
    expect(manifest.icons).toBeDefined();
    for (const [size, relPath] of Object.entries(manifest.icons)) {
      const iconPath = resolve(import.meta.dirname, '..', relPath as string);
      expect(existsSync(iconPath), `Icon ${size} at ${iconPath} must exist`).toBe(true);
      const iconBytes = readFileSync(iconPath);
      expect(iconBytes.length).toBeGreaterThan(50);
    }
  });
});
