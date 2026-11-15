import { parseClients } from './parseClients.js';
import { parseInvoices } from './parseInvoices.js';
import { parseMunicipalities } from './parseMunicipalities.js';
import { mergeInvoicesWithClients } from './merge.js';
import { mapToQrBillRows } from './mapping.js';
import { generateQrBillCsvBytes, generateQrBillCsvString } from './csv.js';
import {
  buildMunicipalityBills,
  DEFAULT_MUNICIPALITY_MESSAGE_TEMPLATE,
  listMunicipalitiesInUse,
  mapMunicipalityBillsToQrBillRows,
  type MunicipalityBillResult,
} from './municipality.js';
import type { CreditorConfig, Invoice, MergedRecord, Municipality, QrBillRow } from './types.js';

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

export interface MunicipalityProcessResult extends MunicipalityBillResult {
  matched: MergedRecord[];
  unmatchedInvoices: Invoice[];
  municipalities: Municipality[];
  /** Distinct municipality names of all matched clients. */
  municipalitiesInUse: string[];
  rows: QrBillRow[];
  csvString: string;
  csvBytes: Uint8Array;
}

/**
 * Executes the municipality pipeline (stage 6): parses all three exports, merges clients and invoices,
 * builds one payment slip per client of a selected municipality and generates the Windows-1252 CSV.
 */
export function processMunicipalityBills(
  invoicesData: string | Uint8Array,
  clientsData: Uint8Array | ArrayBuffer,
  municipalitiesData: Uint8Array | ArrayBuffer,
  creditor: CreditorConfig,
  selectedMunicipalities: string[],
  messageTemplate = DEFAULT_MUNICIPALITY_MESSAGE_TEMPLATE,
): MunicipalityProcessResult {
  const invoices = parseInvoices(invoicesData);
  const clients = parseClients(clientsData);
  const municipalities = parseMunicipalities(municipalitiesData);

  const { matched, unmatchedInvoices } = mergeInvoicesWithClients(invoices, clients);
  const billResult = buildMunicipalityBills(matched, municipalities, selectedMunicipalities, messageTemplate);
  const rows = mapMunicipalityBillsToQrBillRows(billResult.bills, creditor);

  return {
    ...billResult,
    matched,
    unmatchedInvoices,
    municipalities,
    municipalitiesInUse: listMunicipalitiesInUse(matched),
    rows,
    csvString: generateQrBillCsvString(rows),
    csvBytes: generateQrBillCsvBytes(rows),
  };
}
