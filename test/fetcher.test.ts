import { describe, expect, it } from 'vitest';
import { encodeCp1252 } from '../src/core/encoding.js';
import {
  fetchClientsExport,
  fetchInvoicesExport,
  fetchIntranetExports,
  isLoginPageOrAuthError,
  validateExportResponse,
} from '../src/intranet/fetcher.js';

describe('Intranet Fetcher', () => {
  describe('isLoginPageOrAuthError', () => {
    it('detects HTML login page by form password input', () => {
      const html = '<!DOCTYPE html><html><body><form action="login.php"><input type="password" name="pwd"></form></body></html>';
      expect(isLoginPageOrAuthError(html)).toBe(true);
    });

    it('detects VeruA login page with keywords', () => {
      const html = '<html><head><title>VeruA - Anmeldung</title></head><body>Bitte geben Sie Ihr Passwort und Benutzername ein.</body></html>';
      expect(isLoginPageOrAuthError(html)).toBe(true);
    });

    it('does not classify standard CSV or TSV data as login error', () => {
      const csv = 'Name\tKanton\tBetrag\nMeier, Frau Sandra\tBL\t48.00\n';
      expect(isLoginPageOrAuthError(csv)).toBe(false);
    });

    it('does not classify valid HTML data tables as login error', () => {
      const htmlTable = '<html><body><table><tr><td>Klienten-Nr.</td><td>Nachname</td></tr><tr><td>181</td><td>Meier</td></tr></table></body></html>';
      expect(isLoginPageOrAuthError(htmlTable)).toBe(false);
    });
  });

  describe('validateExportResponse', () => {
    it('throws when payload is empty', () => {
      expect(() => validateExportResponse(new Uint8Array(0), 'Stammdaten')).toThrow(
        'Stammdaten konnten nicht geladen werden: Leere Antwort vom Server (0 Bytes).',
      );
    });

    it('throws German error when session has expired and login page is returned', () => {
      const loginHtml = '<!DOCTYPE html><html><form><input type="password" name="pw"></form></html>';
      const bytes = new TextEncoder().encode(loginHtml);
      expect(() => validateExportResponse(bytes, 'Rechnungsdaten')).toThrow(
        'Sitzung abgelaufen oder nicht eingeloggt beim Abrufen der Rechnungsdaten. Bitte melden Sie sich im Intranet an.',
      );
    });

    it('returns decoded text for valid payload', () => {
      const sampleText = 'Zeile 1\nZeile 2';
      const bytes = new TextEncoder().encode(sampleText);
      expect(validateExportResponse(bytes, 'Stammdaten')).toBe(sampleText);
    });
  });

  describe('fetchClientsExport and fetchInvoicesExport', () => {
    it('successfully fetches client bytes using mock fetch', async () => {
      const mockBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const mockFetch: typeof fetch = async (input, init) => {
        expect(input.toString()).toContain('listClientsExportEkarus.php?aktiv=1');
        expect(init?.credentials).toBe('include');
        return new Response(mockBytes, { status: 200, statusText: 'OK' });
      };

      const result = await fetchClientsExport({
        baseUrl: 'https://demo.verua.org',
        fetchFn: mockFetch,
      });

      expect(result).toEqual(mockBytes);
    });

    it('handles HTTP error responses gracefully', async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' });
      };

      await expect(
        fetchClientsExport({
          baseUrl: 'https://demo.verua.org',
          fetchFn: mockFetch,
        }),
      ).rejects.toThrow('HTTP-Fehler beim Abrufen der Stammdaten: 404 Not Found');
    });

    it('fetches and decodes invoice data with windows-1252 umlauts', async () => {
      const tsvContent =
        'Header 1\nHeader 2\nHeader 3\nHeader 4\n' +
        'Knüsel, Herr René\t\t\t\t\t\t\t\t30.60\n';
      const encodedBytes = encodeCp1252(tsvContent);

      const mockFetch: typeof fetch = async (input, init) => {
        expect(input.toString()).toContain('betraege_gesamt_detail_ZR_Export.php?');
        expect(init?.credentials).toBe('include');
        return new Response(encodedBytes, { status: 200, statusText: 'OK' });
      };

      const result = await fetchInvoicesExport(
        {
          period: { year: 2026, fromMonth: 7, toMonth: 7 },
        },
        {
          baseUrl: 'https://demo.verua.org',
          fetchFn: mockFetch,
        },
      );

      expect(result.text).toContain('Knüsel, Herr René');
      expect(result.bytes.byteLength).toBe(encodedBytes.byteLength);
    });

    it('fetches both exports in parallel with fetchIntranetExports', async () => {
      const clientData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // dummy binary
      const invoiceTsv = 'H1\nH2\nH3\nH4\nMeier, Frau Sandra\t\t\t\t\t\t\t\t48.00\n';

      const mockFetch: typeof fetch = async (input) => {
        const urlStr = input.toString();
        if (urlStr.includes('listClientsExportEkarus.php')) {
          return new Response(clientData, { status: 200 });
        }
        if (urlStr.includes('betraege_gesamt_detail_ZR_Export.php')) {
          return new Response(encodeCp1252(invoiceTsv), { status: 200 });
        }
        return new Response('Unknown', { status: 404 });
      };

      const exports = await fetchIntranetExports(
        {
          period: { year: 2026, fromMonth: 6, toMonth: 6 },
        },
        {
          baseUrl: 'https://demo.verua.org',
          fetchFn: mockFetch,
        },
      );

      expect(exports.clientsRawBytes).toEqual(clientData);
      expect(exports.invoicesText).toContain('Meier, Frau Sandra');
    });
  });
});
