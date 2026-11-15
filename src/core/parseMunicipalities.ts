import * as xlsx from 'xlsx';
import { splitStreetAndNumber } from './address.js';
import { normalizeMunicipalityName } from './parseClients.js';
import type { Municipality } from './types.js';

const REQUIRED_HEADERS = ['Name', 'PLZ', 'Ort'] as const;

function cellText(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val).replace(/\.0+$/, '').trim();
}

/**
 * Parses the VeruA municipality list ("Liste aller Gemeinden mit aktiven Klienten").
 * Title rows before the header row ("Name", "Zusatz", "Strasse", "Postfach", "PLZ", "Ort", ...) are skipped.
 * Duplicate names keep the first occurrence; rows without a name are ignored.
 */
export function parseMunicipalities(input: Uint8Array | ArrayBuffer): Municipality[] {
  if (!input || input.byteLength === 0) {
    return [];
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(bytes, { type: 'array' });
  } catch (err) {
    throw new Error(`Fehler beim Lesen der Gemeindeliste: ${err instanceof Error ? err.message : String(err)}`);
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!worksheet) {
    return [];
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', blankrows: false });

  const headerIndex = rows.findIndex((row) => {
    const cells = row.map(cellText);
    return REQUIRED_HEADERS.every((h) => cells.includes(h));
  });
  if (headerIndex < 0) {
    return [];
  }

  const header = (rows[headerIndex] ?? []).map(cellText);
  const col = (name: string): number => header.indexOf(name);
  const idx = {
    name: col('Name'),
    addition: col('Zusatz'),
    street: col('Strasse'),
    postBox: col('Postfach'),
    zipCode: col('PLZ'),
    city: col('Ort'),
  };
  const get = (row: unknown[], i: number): string => (i < 0 ? '' : cellText(row[i]));

  const result: Municipality[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerIndex + 1)) {
    const name = normalizeMunicipalityName(get(row, idx.name));
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);

    const streetAndNumber = get(row, idx.street);
    const { street, buildingNumber } = splitStreetAndNumber(streetAndNumber);

    result.push({
      name,
      addition: get(row, idx.addition),
      streetAndNumber,
      street,
      buildingNumber,
      postBox: get(row, idx.postBox),
      zipCode: get(row, idx.zipCode),
      city: get(row, idx.city),
    });
  }

  return result;
}
