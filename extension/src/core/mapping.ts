import type { CreditorConfig, MergedRecord, QrBillRow } from './types.js';

/**
 * The 27 target columns in exact order as required by qr-rechnung.net and matching Python output.
 */
export const QR_BILL_COLUMNS: readonly (keyof QrBillRow)[] = [
  'Lang',
  'IBAN',
  'Cdtr_AdrTp',
  'Cdtr_Name',
  'Cdtr_StrtNmOrAdrLine1',
  'Cdtr_BldgNbOrAdrLine2',
  'Cdtr_PstCd',
  'Cdtr_TwnNm',
  'Cdtr_Ctry',
  'Amt',
  'Ccy',
  'UltmtDbtr_AdrTp',
  'UltmtDbtr_Name',
  'UltmtDbtr_StrtNmOrAdrLine1',
  'UltmtDbtr_BldgNbOrAdrLine2',
  'UltmtDbtr_PstCd',
  'UltmtDbtr_TwnNm',
  'UltmtDbtr_Ctry',
  'RefTp',
  'Ref',
  'Ustrd',
  'StrdBkgInf',
  'AltPmt1',
  'AltPmt2',
  'FileName',
  'Anrede',
  'Nummer',
] as const;

/**
 * Maps merged invoice/client records and creditor configuration into target QrBillRow objects.
 */
export function mapToQrBillRows(
  records: MergedRecord[],
  creditor: CreditorConfig,
  unstructuredMessage = 'Klientenanteil Spitex',
): QrBillRow[] {
  const cdtrName = `${creditor.firstName} ${creditor.lastName}`.trim();

  return records.map(({ invoice, client }) => {
    const debtorName = `${client.firstName} ${client.lastName}`.trim();
    const fileName = `${client.lastName}_${client.firstName}.pdf`;

    return {
      Lang: 'de',
      IBAN: creditor.iban,
      Cdtr_AdrTp: 'S',
      Cdtr_Name: cdtrName,
      Cdtr_StrtNmOrAdrLine1: creditor.street,
      Cdtr_BldgNbOrAdrLine2: creditor.buildingNumber,
      Cdtr_PstCd: creditor.zipCode,
      Cdtr_TwnNm: creditor.city,
      Cdtr_Ctry: 'CH',
      Amt: invoice.amountFormatted,
      Ccy: 'CHF',
      UltmtDbtr_AdrTp: 'S',
      UltmtDbtr_Name: debtorName,
      UltmtDbtr_StrtNmOrAdrLine1: client.street,
      UltmtDbtr_BldgNbOrAdrLine2: client.buildingNumber,
      UltmtDbtr_PstCd: client.zipCode,
      UltmtDbtr_TwnNm: client.city,
      UltmtDbtr_Ctry: 'CH',
      RefTp: 'NON',
      Ref: '',
      Ustrd: unstructuredMessage,
      StrdBkgInf: '',
      AltPmt1: '',
      AltPmt2: '',
      FileName: fileName,
      Anrede: client.salutation,
      Nummer: client.clientNumber,
    };
  });
}
