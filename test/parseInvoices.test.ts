import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseInvoices } from '../src/core/parseInvoices.js';

describe('parseInvoices', () => {
  it('parses invoices from fixture file', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'Alle_Kantone_07-07_2026_1785683522.csv');
    const bytes = fs.readFileSync(fixturePath);
    const invoices = parseInvoices(bytes);

    expect(invoices).toHaveLength(4);
    expect(invoices[0]).toEqual({
      matchName: 'Meier, Frau Sandra',
      amount: 48,
      amountFormatted: '48.00',
      municipalityAmount: 126.55,
      month: '07',
      year: '2026',
    });
    expect(invoices[1]).toEqual({
      matchName: 'Steiner, Herr Walter',
      amount: 13.4,
      amountFormatted: '13.40',
      municipalityAmount: 33.55,
      month: '07',
      year: '2026',
    });
    expect(invoices[2]).toEqual({
      matchName: 'Knüsel, Herr Bruno',
      amount: 30.6,
      amountFormatted: '30.60',
      municipalityAmount: 90.5,
      month: '07',
      year: '2026',
    });
    expect(invoices[3]).toEqual({
      matchName: 'Wagner, Frau Carmen',
      amount: 45.9,
      amountFormatted: '45.90',
      municipalityAmount: 157.7,
      month: '07',
      year: '2026',
    });
  });

  it('handles amounts with Swiss thousands separator', () => {
    const raw = [
      'Line 1',
      'Line 2',
      'Line 3',
      'Line 4',
      `"Muster, Herr Hans"\t01\t2026\t1\t01.01.2026\t0\t0\t0\t"1'450.50"\t`,
    ].join('\n');

    const invoices = parseInvoices(raw);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.amount).toBe(1450.5);
    expect(invoices[0]?.amountFormatted).toBe('1450.50');
  });

  it('throws for invalid numeric amount', () => {
    const raw = [
      'Line 1',
      'Line 2',
      'Line 3',
      'Line 4',
      `"Muster, Herr Hans"\t01\t2026\t1\t01.01.2026\t0\t0\t0\t"nicht-numerisch"\t`,
    ].join('\n');

    expect(() => parseInvoices(raw)).toThrowError(/Ungültiger Betrag "nicht-numerisch"/);
  });

  it('reads municipality amount with thousands separator and defaults to 0 when missing', () => {
    const raw = [
      'Line 1',
      'Line 2',
      'Line 3',
      'Line 4',
      `"Muster, Herr Hans"\t01\t2026\t1\t01.01.2026\t0\t0\t0\t10.00\t0\t0\t0\t0\t0\t"1'200.25"\t0\t0`,
      `"Kurz, Frau Eva"\t02\t2026\t2\t01.02.2026\t0\t0\t0\t20.00\t`,
    ].join('\n');

    const invoices = parseInvoices(raw);
    expect(invoices[0]?.municipalityAmount).toBe(1200.25);
    expect(invoices[0]?.month).toBe('01');
    expect(invoices[0]?.year).toBe('2026');
    expect(invoices[1]?.municipalityAmount).toBe(0);
  });

  it('throws for invalid municipality amount', () => {
    const raw = [
      'Line 1',
      'Line 2',
      'Line 3',
      'Line 4',
      `"Muster, Herr Hans"\t01\t2026\t1\t01.01.2026\t0\t0\t0\t10.00\t0\t0\t0\t0\t0\tabc\t0\t0`,
    ].join('\n');

    expect(() => parseInvoices(raw)).toThrowError(/Ungültiger Gemeindebetrag "abc"/);
  });

  it('returns empty array when content is empty or only header', () => {
    expect(parseInvoices('')).toEqual([]);
    expect(parseInvoices('Line 1\nLine 2\nLine 3\nLine 4')).toEqual([]);
  });
});
