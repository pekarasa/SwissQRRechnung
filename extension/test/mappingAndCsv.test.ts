import { describe, it, expect } from 'vitest';
import { QR_BILL_COLUMNS, mapToQrBillRows } from '../src/core/mapping.js';
import { escapeCsvField, generateQrBillCsvString } from '../src/core/csv.js';
import type { CreditorConfig, MergedRecord } from '../src/core/types.js';

describe('mapping and csv generation', () => {
  const dummyCreditor: CreditorConfig = {
    iban: 'CH5691006ZN0KQ3CKLIB8',
    firstName: 'Peter',
    lastName: 'Portmann',
    street: 'Silandro',
    buildingNumber: '2',
    zipCode: '4450',
    city: 'Sissach',
  };

  const dummyRecords: MergedRecord[] = [
    {
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
    },
  ];

  it('maps merged record into 27 QR-Bill columns', () => {
    expect(QR_BILL_COLUMNS).toHaveLength(27);

    const rows = mapToQrBillRows(dummyRecords, dummyCreditor);
    expect(rows).toHaveLength(1);

    const row = rows[0]!;
    expect(row.Lang).toBe('de');
    expect(row.IBAN).toBe('CH5691006ZN0KQ3CKLIB8');
    expect(row.Cdtr_AdrTp).toBe('S');
    expect(row.Cdtr_Name).toBe('Peter Portmann');
    expect(row.Cdtr_StrtNmOrAdrLine1).toBe('Silandro');
    expect(row.Cdtr_BldgNbOrAdrLine2).toBe('2');
    expect(row.Cdtr_PstCd).toBe('4450');
    expect(row.Cdtr_TwnNm).toBe('Sissach');
    expect(row.Cdtr_Ctry).toBe('CH');
    expect(row.Amt).toBe('48.00');
    expect(row.Ccy).toBe('CHF');
    expect(row.UltmtDbtr_AdrTp).toBe('S');
    expect(row.UltmtDbtr_Name).toBe('Sandra Meier');
    expect(row.UltmtDbtr_StrtNmOrAdrLine1).toBe('Hauptstrasse');
    expect(row.UltmtDbtr_BldgNbOrAdrLine2).toBe('43');
    expect(row.UltmtDbtr_PstCd).toBe('4450');
    expect(row.UltmtDbtr_TwnNm).toBe('Sissach');
    expect(row.UltmtDbtr_Ctry).toBe('CH');
    expect(row.RefTp).toBe('NON');
    expect(row.Ref).toBe('');
    expect(row.Ustrd).toBe('Klientenanteil Spitex');
    expect(row.FileName).toBe('Meier_Sandra.pdf');
    expect(row.Anrede).toBe('Frau');
    expect(row.Nummer).toBe('181');
  });

  it('escapes CSV fields with commas or quotes properly', () => {
    expect(escapeCsvField('Simple')).toBe('Simple');
    expect(escapeCsvField('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsvField('He said "Hi"')).toBe('"He said ""Hi"""');
    expect(escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
  });

  it('generates valid CSV string with header and trailing newline', () => {
    const rows = mapToQrBillRows(dummyRecords, dummyCreditor);
    const csv = generateQrBillCsvString(rows);

    const lines = csv.split('\n');
    expect(lines[0]).toBe(QR_BILL_COLUMNS.join(','));
    expect(lines[1]).toBe(
      'de,CH5691006ZN0KQ3CKLIB8,S,Peter Portmann,Silandro,2,4450,Sissach,CH,48.00,CHF,S,Sandra Meier,Hauptstrasse,43,4450,Sissach,CH,NON,,Klientenanteil Spitex,,,,Meier_Sandra.pdf,Frau,181',
    );
    expect(lines[2]).toBe(''); // Trailing newline
  });
});
