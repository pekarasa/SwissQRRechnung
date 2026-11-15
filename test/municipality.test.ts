import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseClients } from '../src/core/parseClients.js';
import { parseInvoices } from '../src/core/parseInvoices.js';
import { parseMunicipalities } from '../src/core/parseMunicipalities.js';
import { mergeInvoicesWithClients } from '../src/core/merge.js';
import { DEFAULT_CREDITOR } from '../src/core/settings.js';
import {
  buildMunicipalityBills,
  buildMunicipalityDebtor,
  listMunicipalitiesInUse,
  mapMunicipalityBillsToQrBillRows,
  renderMunicipalityMessage,
} from '../src/core/municipality.js';
import type { Municipality } from '../src/core/types.js';

const fixtures = path.join(__dirname, 'fixtures');
const invoices = parseInvoices(fs.readFileSync(path.join(fixtures, 'Alle_Kantone_07-07_2026_1785683522.csv')));
const clients = parseClients(
  fs.readFileSync(path.join(fixtures, 'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls')),
);
const municipalities = parseMunicipalities(
  fs.readFileSync(path.join(fixtures, 'Liste-aller-Gemeinden-mit-aktiven-Klienten_15-11-2026.xlsx')),
);
const { matched } = mergeInvoicesWithClients(invoices, clients);

const baseMunicipality: Municipality = {
  name: 'Gemeinde X',
  addition: '',
  streetAndNumber: '',
  street: '',
  buildingNumber: '',
  postBox: '',
  zipCode: '4000',
  city: 'Basel',
};

describe('municipality bills', () => {
  it('creates one bill per client for all selected municipalities', () => {
    const result = buildMunicipalityBills(matched, municipalities, ['Gemeinde Sissach', 'Gemeinde Gelterkinden']);

    expect(result.missingMunicipalities).toEqual([]);
    expect(result.zeroAmountRecords).toEqual([]);
    expect(result.bills.map((b) => [b.record.client.lastName, b.amountFormatted, b.debtor.name])).toEqual([
      ['Meier', '126.55', 'Gemeinde Sissach'],
      ['Steiner', '33.55', 'Gemeinde Sissach'],
      ['Knüsel', '90.50', 'Gemeinde Gelterkinden'],
      ['Wagner', '157.70', 'Gemeinde Sissach'],
    ]);

    const meier = result.bills[0];
    expect(meier?.debtor).toEqual({
      name: 'Gemeinde Sissach',
      street: 'Bahnhofstrasse',
      buildingNumber: '1',
      zipCode: '4450',
      city: 'Sissach',
    });
    expect(meier?.additionalInformation).toBe('Restfinanzierung Pflege Sandra Meier (181), 07/2026');
    expect(meier?.fileName).toBe('Gemeinde Sissach_Meier_Sandra.pdf');
  });

  it('filters by selection case-insensitively', () => {
    const result = buildMunicipalityBills(matched, municipalities, ['gemeinde sissach']);
    expect(result.bills).toHaveLength(3);
    expect(result.bills.some((b) => b.record.client.lastName === 'Knüsel')).toBe(false);
  });

  it('returns nothing when no municipality is selected', () => {
    expect(buildMunicipalityBills(matched, municipalities, []).bills).toEqual([]);
  });

  it('reports selected municipalities missing in the list', () => {
    const onlySissach = municipalities.filter((m) => m.name === 'Gemeinde Sissach');
    const result = buildMunicipalityBills(matched, onlySissach, ['Gemeinde Sissach', 'Gemeinde Gelterkinden']);
    expect(result.bills).toHaveLength(3);
    expect(result.missingMunicipalities).toEqual(['Gemeinde Gelterkinden']);
  });

  it('skips records with a municipality amount of 0', () => {
    const records = matched.map((r, i) =>
      i === 0 ? { ...r, invoice: { ...r.invoice, municipalityAmount: 0 } } : r,
    );
    const result = buildMunicipalityBills(records, municipalities, ['Gemeinde Sissach']);
    expect(result.bills).toHaveLength(2);
    expect(result.zeroAmountRecords.map((r) => r.client.lastName)).toEqual(['Meier']);
  });

  it('uses a custom message template', () => {
    const result = buildMunicipalityBills(matched, municipalities, ['Gemeinde Gelterkinden'], '{Gemeinde}: {Nachname} {Unbekannt}');
    expect(result.bills[0]?.additionalInformation).toBe('Gemeinde Gelterkinden: Knüsel {Unbekannt}');
  });

  it('lists municipalities in use', () => {
    expect(listMunicipalitiesInUse(matched)).toEqual(['Gemeinde Sissach', 'Gemeinde Gelterkinden']);
  });

  it('builds debtor with addition and post box fallback', () => {
    expect(buildMunicipalityDebtor({ ...baseMunicipality, addition: 'Verbund Y', street: 'Weg', buildingNumber: '2' })).toEqual({
      name: 'Gemeinde X, Verbund Y',
      street: 'Weg',
      buildingNumber: '2',
      zipCode: '4000',
      city: 'Basel',
    });
    expect(buildMunicipalityDebtor({ ...baseMunicipality, postBox: 'Postfach 5', buildingNumber: '9' })).toMatchObject({
      street: 'Postfach 5',
      buildingNumber: '',
    });
  });

  it('renders message with empty month and year when missing', () => {
    const record = matched[0]!;
    const { month: _month, ...invoiceWithoutMonth } = record.invoice;
    const msg = renderMunicipalityMessage('{Nachname} {Monat}', { ...record, invoice: invoiceWithoutMonth }, 'G');
    expect(msg).toBe('Meier');
  });

  it('maps bills to QR bill CSV rows', () => {
    const { bills } = buildMunicipalityBills(matched, municipalities, ['Gemeinde Gelterkinden']);
    const rows = mapMunicipalityBillsToQrBillRows(bills, DEFAULT_CREDITOR);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Amt: '90.50',
      Cdtr_Name: 'Peter Portmann',
      UltmtDbtr_Name: 'Gemeinde Gelterkinden',
      UltmtDbtr_StrtNmOrAdrLine1: 'Marktgasse',
      UltmtDbtr_BldgNbOrAdrLine2: '8',
      UltmtDbtr_PstCd: '4460',
      UltmtDbtr_TwnNm: 'Gelterkinden',
      RefTp: 'NON',
      Ustrd: 'Restfinanzierung Pflege Bruno Knüsel (184), 07/2026',
      FileName: 'Gemeinde Gelterkinden_Knüsel_Bruno.pdf',
      Anrede: 'Herr',
      Nummer: '184',
    });
  });
});
