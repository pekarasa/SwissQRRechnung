import { decodeAuto } from './encoding.js';
import type { Invoice } from './types.js';

/**
 * Strips surrounding quotes (single or double) and trims whitespace.
 */
function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Parses tab-separated invoice CSV data according to the Python reference:
 * - Skips first 4 header lines
 * - Reads column 0 (Client name in "Nachname, Anrede Vorname" format)
 * - Reads column 8 (Amount "Klient KLV")
 * - Ignores empty rows and rows starting with "Gesamt"
 * - Cleans thousands separator (single quote) and parses numeric amount
 */
export function parseInvoices(input: string | Uint8Array): Invoice[] {
  const text = typeof input === 'string' ? input : decodeAuto(input);
  const lines = text.split(/\r?\n/);

  // Skip 4 title/header rows (Python: skiprows=4)
  const dataLines = lines.slice(4);
  const invoices: Invoice[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rawLine = dataLines[i];
    if (!rawLine || !rawLine.trim()) {
      continue;
    }

    const columns = rawLine.split('\t');
    const col0 = columns[0];
    if (col0 === undefined) {
      continue;
    }

    const matchName = unquote(col0);
    if (!matchName || matchName.startsWith('Gesamt')) {
      continue;
    }

    const col8 = columns[8];
    if (col8 === undefined) {
      continue;
    }

    const amountStr = unquote(col8).replace(/['’´]/g, '').trim();
    if (!amountStr) {
      continue;
    }

    const amount = Number(amountStr);
    if (Number.isNaN(amount) || !Number.isFinite(amount)) {
      throw new Error(`Ungültiger Betrag "${unquote(col8)}" für Klient "${matchName}" in Zeile ${i + 5}`);
    }

    invoices.push({
      matchName,
      amount,
      amountFormatted: amount.toFixed(2),
    });
  }

  return invoices;
}
