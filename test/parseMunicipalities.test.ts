import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as xlsx from 'xlsx';
import { parseMunicipalities } from '../src/core/parseMunicipalities.js';

function buildWorkbook(rows: unknown[][]): Uint8Array {
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(rows), 'Worksheet');
  return new Uint8Array(xlsx.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('parseMunicipalities', () => {
  it('parses the municipality list fixture', () => {
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'Liste-aller-Gemeinden-mit-aktiven-Klienten_15-11-2026.xlsx',
    );
    const municipalities = parseMunicipalities(fs.readFileSync(fixturePath));

    expect(municipalities.map((m) => m.name)).toEqual([
      'Gemeinde Böckten',
      'Gemeinde Gelterkinden',
      'Gemeinde Kilchberg',
      'Gemeinde Oltingen',
      'Gemeinde Sissach',
    ]);

    expect(municipalities[4]).toEqual({
      name: 'Gemeinde Sissach',
      addition: '',
      streetAndNumber: 'Bahnhofstrasse 1',
      street: 'Bahnhofstrasse',
      buildingNumber: '1',
      postBox: '',
      zipCode: '4450',
      city: 'Sissach',
    });

    const kilchberg = municipalities[2];
    expect(kilchberg?.addition).toBe('Verbund Schafmatt');
    expect(kilchberg?.street).toBe('Wenslingerstrasse');
    expect(kilchberg?.buildingNumber).toBe('2');
    expect(kilchberg?.zipCode).toBe('4495');
    expect(kilchberg?.city).toBe('Zeglingen');
  });

  it('skips empty and duplicate names and reads numeric postal codes', () => {
    const bytes = buildWorkbook([
      ['Titel'],
      [],
      ['Name', 'Zusatz', 'Strasse', 'Postfach', 'PLZ', 'Ort', 'Telefon'],
      ['Gemeinde A', '', '', 'Postfach 12', 4000, 'Basel', ''],
      ['', '', 'Weg 1', '', 4001, 'Basel', ''],
      ['Gemeinde A', '', 'Andere 2', '', 4002, 'Basel', ''],
    ]);

    const municipalities = parseMunicipalities(bytes);
    expect(municipalities).toHaveLength(1);
    expect(municipalities[0]?.postBox).toBe('Postfach 12');
    expect(municipalities[0]?.street).toBe('');
    expect(municipalities[0]?.zipCode).toBe('4000');
  });

  it('returns empty array for empty input or missing header', () => {
    expect(parseMunicipalities(new Uint8Array(0))).toEqual([]);
    expect(parseMunicipalities(buildWorkbook([['Foo', 'Bar'], ['a', 'b']]))).toEqual([]);
  });
});
