import * as xlsx from 'xlsx';
import { splitStreetAndNumber } from './address.js';
import type { Client } from './types.js';

/**
 * Builds the MatchName key in the format: "{Nachname}, {Anrede} {Vorname}".
 */
export function buildClientMatchName(lastName: string, salutation: string, firstName: string): string {
  const parts = [salutation.trim(), firstName.trim()].filter(Boolean).join(' ').trim();
  if (!parts) {
    return lastName.trim();
  }
  return `${lastName.trim()}, ${parts}`.trim();
}

/**
 * Formats a postal code or client number to an integer string (removing .0 if present).
 */
function formatIntegerString(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val).replace(/\.0+$/, '').trim();
}

/**
 * Parses client master data from an Excel workbook (.xls or .xlsx).
 * Tolerant of corrupted workbook structures, ignores non-clients without names/salutations,
 * and formats postal codes as integer strings.
 */
export function parseClients(input: Uint8Array | ArrayBuffer): Client[] {
  if (!input || input.byteLength === 0) {
    return [];
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(bytes, { type: 'array' });
  } catch (err) {
    throw new Error(`Fehler beim Lesen der Stammdaten-Arbeitsmappe: ${err instanceof Error ? err.message : String(err)}`);
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    return [];
  }

  const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  const clients: Client[] = [];

  for (const row of rawRows) {
    const lastName = String(row['Nachname'] ?? '').trim();
    const firstName = String(row['Vorname'] ?? '').trim();
    const salutation = String(row['Anrede'] ?? '').trim();

    // Ignore non-clients (e.g. AA_Administration, AA_Auslagen without salutation or first name)
    if (!lastName || (!firstName && !salutation)) {
      continue;
    }

    const streetAndNumber = String(row['Strasse Nr.'] ?? '').trim();
    const { street, buildingNumber } = splitStreetAndNumber(streetAndNumber);
    const clientNumber = formatIntegerString(row['Klienten-Nr.']);
    const zipCode = formatIntegerString(row['PLZ']);
    const city = String(row['Ort'] ?? '').trim();
    const matchName = buildClientMatchName(lastName, salutation, firstName);

    clients.push({
      clientNumber,
      salutation,
      firstName,
      lastName,
      streetAndNumber,
      street,
      buildingNumber,
      zipCode,
      city,
      matchName,
    });
  }

  return clients;
}
