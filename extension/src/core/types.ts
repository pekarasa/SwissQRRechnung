export interface Client {
  clientNumber: string;
  salutation: string;
  firstName: string;
  lastName: string;
  streetAndNumber: string;
  street: string;
  buildingNumber: string;
  zipCode: string;
  city: string;
  matchName: string;
}

export interface Invoice {
  matchName: string;
  amount: number;
  amountFormatted: string;
}

export interface CreditorConfig {
  iban: string;
  firstName: string;
  lastName: string;
  street: string;
  buildingNumber: string;
  zipCode: string;
  city: string;
}

export interface MergedRecord {
  invoice: Invoice;
  client: Client;
}

export interface MergeResult {
  matched: MergedRecord[];
  unmatchedInvoices: Invoice[];
}

export interface QrBillRow {
  Lang: string;
  IBAN: string;
  Cdtr_AdrTp: string;
  Cdtr_Name: string;
  Cdtr_StrtNmOrAdrLine1: string;
  Cdtr_BldgNbOrAdrLine2: string;
  Cdtr_PstCd: string;
  Cdtr_TwnNm: string;
  Cdtr_Ctry: string;
  Amt: string;
  Ccy: string;
  UltmtDbtr_AdrTp: string;
  UltmtDbtr_Name: string;
  UltmtDbtr_StrtNmOrAdrLine1: string;
  UltmtDbtr_BldgNbOrAdrLine2: string;
  UltmtDbtr_PstCd: string;
  UltmtDbtr_TwnNm: string;
  UltmtDbtr_Ctry: string;
  RefTp: string;
  Ref: string;
  Ustrd: string;
  StrdBkgInf: string;
  AltPmt1: string;
  AltPmt2: string;
  FileName: string;
  Anrede: string;
  Nummer: string;
}
