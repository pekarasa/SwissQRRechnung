import { parseClients } from './parseClients.js';
import { parseInvoices } from './parseInvoices.js';
import { mergeInvoicesWithClients } from './merge.js';
import { mapToQrBillRows } from './mapping.js';
import { generateQrBillCsvBytes, generateQrBillCsvString } from './csv.js';
import type { CreditorConfig, Invoice, MergedRecord, QrBillRow } from './types.js';

export interface ProcessResult {
  matchedCount: number;
  matched: MergedRecord[];
  unmatchedInvoices: Invoice[];
  rows: QrBillRow[];
  csvString: string;
  csvBytes: Uint8Array;
}

/**
 * Executes the complete Stage 1 data pipeline:
 * 1. Parses invoice CSV input
 * 2. Parses client Excel input
 * 3. Merges records via MatchName
 * 4. Maps matched records to QR-Bill rows
 * 5. Generates Windows-1252 CSV bytes and string
 */
export function processInvoicesAndClients(
  invoicesData: string | Uint8Array,
  clientsData: Uint8Array | ArrayBuffer,
  creditor: CreditorConfig,
  unstructuredMessage = 'Klientenanteil Spitex',
): ProcessResult {
  const invoices = parseInvoices(invoicesData);
  const clients = parseClients(clientsData);

  const { matched, unmatchedInvoices } = mergeInvoicesWithClients(invoices, clients);
  const rows = mapToQrBillRows(matched, creditor, unstructuredMessage);
  const csvString = generateQrBillCsvString(rows);
  const csvBytes = generateQrBillCsvBytes(rows);

  return {
    matchedCount: matched.length,
    matched,
    unmatchedInvoices,
    rows,
    csvString,
    csvBytes,
  };
}
