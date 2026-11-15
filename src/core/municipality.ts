import { normalizeMunicipalityName } from './parseClients.js';
import type {
  CreditorConfig,
  DebtorAddress,
  MergedRecord,
  Municipality,
  MunicipalityBill,
  QrBillRow,
} from './types.js';

export const DEFAULT_MUNICIPALITY_MESSAGE_TEMPLATE =
  'Restfinanzierung Pflege {Vorname} {Nachname} ({Nummer}), {Monat}/{Jahr}';

export interface MunicipalityBillResult {
  bills: MunicipalityBill[];
  /** Selected municipalities used by clients but missing in the municipality list. */
  missingMunicipalities: string[];
  /** Records of selected municipalities skipped because the municipality amount is 0. */
  zeroAmountRecords: MergedRecord[];
}

function nameKey(name: string | undefined): string {
  return normalizeMunicipalityName(name).toLowerCase();
}

/**
 * Builds the structured debtor address of a municipality.
 * The addition ("Zusatz") is appended to the name; the post box replaces an empty street.
 */
export function buildMunicipalityDebtor(municipality: Municipality): DebtorAddress {
  const name = municipality.addition ? `${municipality.name}, ${municipality.addition}` : municipality.name;
  const hasStreet = municipality.street.trim() !== '';
  return {
    name,
    street: hasStreet ? municipality.street : municipality.postBox,
    buildingNumber: hasStreet ? municipality.buildingNumber : '',
    zipCode: municipality.zipCode,
    city: municipality.city,
  };
}

/**
 * Replaces the placeholders {Vorname}, {Nachname}, {Nummer}, {Monat}, {Jahr} and {Gemeinde}.
 */
export function renderMunicipalityMessage(template: string, record: MergedRecord, municipalityName: string): string {
  const values: Record<string, string> = {
    Vorname: record.client.firstName,
    Nachname: record.client.lastName,
    Nummer: record.client.clientNumber,
    Monat: record.invoice.month ?? '',
    Jahr: record.invoice.year ?? '',
    Gemeinde: municipalityName,
  };
  return template
    .replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? (values[key] ?? '') : match))
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim();
}

/**
 * Returns the distinct municipality names of all matched clients in order of appearance.
 */
export function listMunicipalitiesInUse(records: MergedRecord[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const { client } of records) {
    const name = normalizeMunicipalityName(client.municipalityName);
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      result.push(name);
    }
  }
  return result;
}

/**
 * Creates one payment slip per client whose cost-bearing municipality is selected.
 * Order follows the invoice order. Municipality names are compared case-insensitively.
 */
export function buildMunicipalityBills(
  records: MergedRecord[],
  municipalities: Municipality[],
  selectedNames: string[],
  messageTemplate = DEFAULT_MUNICIPALITY_MESSAGE_TEMPLATE,
): MunicipalityBillResult {
  const selected = new Set(selectedNames.map(nameKey).filter(Boolean));
  const byName = new Map<string, Municipality>();
  for (const municipality of municipalities) {
    const key = nameKey(municipality.name);
    if (key && !byName.has(key)) {
      byName.set(key, municipality);
    }
  }

  const bills: MunicipalityBill[] = [];
  const missing: string[] = [];
  const zeroAmountRecords: MergedRecord[] = [];

  for (const record of records) {
    const key = nameKey(record.client.municipalityName);
    if (!key || !selected.has(key)) {
      continue;
    }

    const municipality = byName.get(key);
    if (!municipality) {
      const name = normalizeMunicipalityName(record.client.municipalityName);
      if (!missing.includes(name)) {
        missing.push(name);
      }
      continue;
    }

    const amount = record.invoice.municipalityAmount ?? 0;
    if (!(amount > 0)) {
      zeroAmountRecords.push(record);
      continue;
    }

    const template = messageTemplate.trim() || DEFAULT_MUNICIPALITY_MESSAGE_TEMPLATE;
    bills.push({
      record,
      municipality,
      debtor: buildMunicipalityDebtor(municipality),
      amount,
      amountFormatted: amount.toFixed(2),
      additionalInformation: renderMunicipalityMessage(template, record, municipality.name),
      fileName: `${sanitizeFileNamePart(municipality.name)}_${sanitizeFileNamePart(record.client.lastName)}_${sanitizeFileNamePart(record.client.firstName)}.pdf`,
    });
  }

  return { bills, missingMunicipalities: missing, zeroAmountRecords };
}

/**
 * Maps municipality bills to the 27 QR bill CSV columns (same layout as the client bills).
 */
export function mapMunicipalityBillsToQrBillRows(bills: MunicipalityBill[], creditor: CreditorConfig): QrBillRow[] {
  const cdtrName = `${creditor.firstName} ${creditor.lastName}`.trim();

  return bills.map((bill) => ({
    Lang: 'de',
    IBAN: creditor.iban,
    Cdtr_AdrTp: 'S',
    Cdtr_Name: cdtrName,
    Cdtr_StrtNmOrAdrLine1: creditor.street,
    Cdtr_BldgNbOrAdrLine2: creditor.buildingNumber,
    Cdtr_PstCd: creditor.zipCode,
    Cdtr_TwnNm: creditor.city,
    Cdtr_Ctry: 'CH',
    Amt: bill.amountFormatted,
    Ccy: 'CHF',
    UltmtDbtr_AdrTp: 'S',
    UltmtDbtr_Name: bill.debtor.name,
    UltmtDbtr_StrtNmOrAdrLine1: bill.debtor.street,
    UltmtDbtr_BldgNbOrAdrLine2: bill.debtor.buildingNumber,
    UltmtDbtr_PstCd: bill.debtor.zipCode,
    UltmtDbtr_TwnNm: bill.debtor.city,
    UltmtDbtr_Ctry: 'CH',
    RefTp: 'NON',
    Ref: '',
    Ustrd: bill.additionalInformation,
    StrdBkgInf: '',
    AltPmt1: '',
    AltPmt2: '',
    FileName: bill.fileName,
    Anrede: bill.record.client.salutation,
    Nummer: bill.record.client.clientNumber,
  }));
}
