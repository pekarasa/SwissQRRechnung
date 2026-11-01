import { encodeCp1252 } from './encoding.js';
import { QR_BILL_COLUMNS } from './mapping.js';
import type { QrBillRow } from './types.js';

/**
 * Escapes a single CSV field following RFC 4180 / pandas standards.
 * Wraps values containing commas, quotes, or newlines in double quotes,
 * and doubles any internal double quotes.
 */
export function escapeCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Generates the CSV text content from QrBillRow records.
 * Defaults to LF ('\n') line endings with a trailing newline matching pandas to_csv output.
 */
export function generateQrBillCsvString(rows: QrBillRow[], lineEnding = '\n'): string {
  const header = QR_BILL_COLUMNS.join(',');
  const lines = [header];

  for (const row of rows) {
    const line = QR_BILL_COLUMNS.map((col) => escapeCsvField(row[col])).join(',');
    lines.push(line);
  }

  return lines.join(lineEnding) + lineEnding;
}

/**
 * Generates Windows-1252 / CP1252 encoded CSV bytes from QrBillRow records.
 */
export function generateQrBillCsvBytes(rows: QrBillRow[], lineEnding = '\n'): Uint8Array {
  const csvString = generateQrBillCsvString(rows, lineEnding);
  return encodeCp1252(csvString);
}
