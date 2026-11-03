import { describe, expect, it } from 'vitest';
import {
  buildClientExportUrl,
  buildInvoiceExportUrl,
  formatMonthTwoDigits,
  getDefaultBillingPeriod,
} from '../src/intranet/url.js';

describe('Intranet URL and Period helpers', () => {
  describe('getDefaultBillingPeriod', () => {
    it('returns previous month for mid-year date', () => {
      const midYear = new Date('2026-07-15T12:00:00Z');
      const period = getDefaultBillingPeriod(midYear);
      expect(period).toEqual({
        year: 2026,
        fromMonth: 6,
        toMonth: 6,
      });
    });

    it('rolls back to December of previous year for January date', () => {
      const jan = new Date('2026-01-05T12:00:00Z');
      const period = getDefaultBillingPeriod(jan);
      expect(period).toEqual({
        year: 2025,
        fromMonth: 12,
        toMonth: 12,
      });
    });
  });

  describe('formatMonthTwoDigits', () => {
    it('formats single digit month with leading zero', () => {
      expect(formatMonthTwoDigits(1)).toBe('01');
      expect(formatMonthTwoDigits(9)).toBe('09');
    });

    it('formats double digit month as is', () => {
      expect(formatMonthTwoDigits(10)).toBe('10');
      expect(formatMonthTwoDigits(12)).toBe('12');
    });

    it('throws on invalid month numbers', () => {
      expect(() => formatMonthTwoDigits(0)).toThrow('Ungültiger Monat');
      expect(() => formatMonthTwoDigits(13)).toThrow('Ungültiger Monat');
      expect(() => formatMonthTwoDigits(5.5)).toThrow('Ungültiger Monat');
    });
  });

  describe('buildClientExportUrl', () => {
    it('builds relative URL without baseUrl', () => {
      expect(buildClientExportUrl()).toBe('listen/listClientsExportEkarus.php?aktiv=1');
      expect(buildClientExportUrl(undefined, 0)).toBe('listen/listClientsExportEkarus.php?aktiv=0');
    });

    it('builds absolute URL with baseUrl and handles trailing slashes', () => {
      expect(buildClientExportUrl('https://oetterli.verua.org')).toBe(
        'https://oetterli.verua.org/listen/listClientsExportEkarus.php?aktiv=1',
      );
      expect(buildClientExportUrl('https://oetterli.verua.org/')).toBe(
        'https://oetterli.verua.org/listen/listClientsExportEkarus.php?aktiv=1',
      );
    });

    it('supports custom paths', () => {
      expect(
        buildClientExportUrl('https://oetterli.verua.org', 1, 'custom/export.php'),
      ).toBe('https://oetterli.verua.org/custom/export.php?aktiv=1');
    });
  });

  describe('buildInvoiceExportUrl', () => {
    it('builds expected invoice export URL with default parameters', () => {
      const url = buildInvoiceExportUrl('https://oetterli.verua.org', {
        period: {
          year: 2026,
          fromMonth: 7,
          toMonth: 7,
        },
      });

      expect(url).toBe(
        'https://oetterli.verua.org/Rechnung/betraege_gesamt_detail_ZR_Export.php?owner=1&sprache=DE&kuerzel_kanton=O_K&id_kanton=0&v_jahr=2026&v_monat=07&b_monat=07',
      );
      // Ensure no trailing quote or %27 artifact
      expect(url).not.toContain('%27');
      expect(url.endsWith("'")).toBe(false);
    });

    it('supports custom range across multiple months', () => {
      const url = buildInvoiceExportUrl('https://oetterli.verua.org', {
        period: {
          year: 2026,
          fromMonth: 9,
          toMonth: 10,
        },
      });

      expect(url).toBe(
        'https://oetterli.verua.org/Rechnung/betraege_gesamt_detail_ZR_Export.php?owner=1&sprache=DE&kuerzel_kanton=O_K&id_kanton=0&v_jahr=2026&v_monat=09&b_monat=10',
      );
    });

    it('allows customizing owner, language, and kanton parameters', () => {
      const url = buildInvoiceExportUrl('https://demo.verua.org', {
        owner: 2,
        sprache: 'FR',
        kuerzelKanton: 'ZH',
        idKanton: 1,
        period: {
          year: 2025,
          fromMonth: 3,
          toMonth: 5,
        },
      });

      expect(url).toBe(
        'https://demo.verua.org/Rechnung/betraege_gesamt_detail_ZR_Export.php?owner=2&sprache=FR&kuerzel_kanton=ZH&id_kanton=1&v_jahr=2025&v_monat=03&b_monat=05',
      );
    });

    it('supports custom invoice paths', () => {
      const url = buildInvoiceExportUrl(
        'https://oetterli.verua.org',
        {
          period: { year: 2026, fromMonth: 1, toMonth: 1 },
        },
        'custom/invoice_export.php',
      );
      expect(url).toContain('https://oetterli.verua.org/custom/invoice_export.php?owner=1');
    });

    it('throws error when fromMonth is after toMonth', () => {
      expect(() =>
        buildInvoiceExportUrl('https://oetterli.verua.org', {
          period: {
            year: 2026,
            fromMonth: 8,
            toMonth: 7,
          },
        }),
      ).toThrow('Startmonat (08) darf nicht nach dem Endmonat (07) liegen.');
    });

    it('throws error on invalid year', () => {
      expect(() =>
        buildInvoiceExportUrl('https://oetterli.verua.org', {
          period: {
            year: 1990,
            fromMonth: 1,
            toMonth: 1,
          },
        }),
      ).toThrow('Ungültiges Rechnungsjahr: 1990');
    });
  });
});
