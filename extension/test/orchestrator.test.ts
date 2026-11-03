import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CreditorConfig } from '../src/core/types.js';
import { runIntranetPipeline } from '../src/intranet/orchestrator.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

const CREDITOR: CreditorConfig = {
  iban: 'CH5691006ZN0KQ3CKLIB8',
  firstName: 'Peter',
  lastName: 'Portmann',
  street: 'Silandro',
  buildingNumber: '2',
  zipCode: '4450',
  city: 'Sissach',
};

describe('Intranet Orchestrator Pipeline', () => {
  it('fetches mock exports and executes Stage 1 pipeline to produce valid CSV', async () => {
    const clientsXlsBytes = new Uint8Array(
      readFileSync(resolve(FIXTURES_DIR, 'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls')),
    );
    const invoiceCsvBytes = new Uint8Array(
      readFileSync(resolve(FIXTURES_DIR, 'Alle_Kantone_07-07_2026_1785683522.csv')),
    );
    const referenceCsvBytes = new Uint8Array(
      readFileSync(resolve(FIXTURES_DIR, 'QR-Rechnungen.csv')),
    );

    const mockFetch: typeof fetch = async (input) => {
      const url = input.toString();
      if (url.includes('listClientsExportEkarus.php')) {
        return new Response(clientsXlsBytes, { status: 200 });
      }
      if (url.includes('betraege_gesamt_detail_ZR_Export.php')) {
        return new Response(invoiceCsvBytes, { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    };

    const result = await runIntranetPipeline({
      period: { year: 2026, fromMonth: 7, toMonth: 7 },
      creditor: CREDITOR,
      fetchOptions: {
        baseUrl: 'https://oetterli.verua.org',
        fetchFn: mockFetch,
      },
    });

    expect(result.matchedCount).toBe(4);
    expect(result.unmatchedInvoices).toHaveLength(0);
    expect(result.rows).toHaveLength(4);

    // Verify CSV matches reference output byte-for-byte
    expect(result.csvBytes).toEqual(referenceCsvBytes);
    expect(result.csvString).toContain('Sandra Meier');
    expect(result.csvString).toContain('Frau,181');
  });

  it('reports unmatched invoices when an invoice client is missing from master data', async () => {
    const clientsXlsBytes = new Uint8Array(
      readFileSync(resolve(FIXTURES_DIR, 'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls')),
    );
    // Invoice with an unknown client
    const customInvoiceTsv =
      'H1\nH2\nH3\nH4\n' +
      'Unbekannt, Herr Max\t\t\t\t\t\t\t\t99.50\n' +
      'Meier, Frau Sandra\t\t\t\t\t\t\t\t48.00\n';

    const mockFetch: typeof fetch = async (input) => {
      const url = input.toString();
      if (url.includes('listClientsExportEkarus.php')) {
        return new Response(clientsXlsBytes, { status: 200 });
      }
      return new Response(new TextEncoder().encode(customInvoiceTsv), { status: 200 });
    };

    const result = await runIntranetPipeline({
      period: { year: 2026, fromMonth: 7, toMonth: 7 },
      creditor: CREDITOR,
      fetchOptions: {
        baseUrl: 'https://oetterli.verua.org',
        fetchFn: mockFetch,
      },
    });

    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedInvoices).toHaveLength(1);
    expect(result.unmatchedInvoices[0]?.matchName).toBe('Unbekannt, Herr Max');
    expect(result.rows).toHaveLength(1);
  });
});
