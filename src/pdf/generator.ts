import PDFDocument from 'pdfkit';
import * as pdfkitModule from 'pdfkit';
// @ts-ignore
import Helvetica from 'pdfkit/standard-fonts/Helvetica';
// @ts-ignore
import HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold';
// @ts-ignore
import HelveticaOblique from 'pdfkit/standard-fonts/HelveticaOblique';
// @ts-ignore
import HelveticaBoldOblique from 'pdfkit/standard-fonts/HelveticaBoldOblique';
// @ts-ignore
import Courier from 'pdfkit/standard-fonts/Courier';
// @ts-ignore
import CourierBold from 'pdfkit/standard-fonts/CourierBold';
// @ts-ignore
import TimesRoman from 'pdfkit/standard-fonts/TimesRoman';
// @ts-ignore
import TimesBold from 'pdfkit/standard-fonts/TimesBold';
import { SwissQRBill } from 'swissqrbill/pdf';
import { mm2pt } from 'swissqrbill/utils';
import JSZip from 'jszip';
import { validateForPdfGeneration, validateMergedRecord, validateCreditor } from './validate.js';
import type { CreditorConfig, DebtorAddress, MergedRecord } from '../core/types.js';

// Register standard fonts for browser environments (pdfkit >= 0.16 requirement)
const registerFn = (pdfkitModule as Record<string, unknown>).registerStdFonts as
  | ((...fonts: unknown[]) => void)
  | undefined;

if (typeof registerFn === 'function') {
  registerFn(
    Helvetica,
    HelveticaBold,
    HelveticaOblique,
    HelveticaBoldOblique,
    Courier,
    CourierBold,
    TimesRoman,
    TimesBold,
  );
}

export interface QrBillPdfOptions {
  language?: 'DE' | 'FR' | 'IT' | 'EN';
  scissors?: boolean;
  outlines?: boolean;
  unstructuredMessage?: string;
}

/**
 * Height of standard Swiss QR Bill payment part (105 mm).
 * Placed at the bottom of an A4 page (297 mm height).
 */
const PAYMENT_PART_Y_PT = mm2pt(297 - 105);

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.byteLength;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/**
 * Builds a single PDF stream into a Uint8Array.
 */
function buildPdfBuffer(doc: PDFKit.PDFDocument): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array | ArrayBuffer | number[]) => {
      chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    });
    doc.on('end', () => {
      resolve(concatUint8Arrays(chunks));
    });
    doc.on('error', reject);
    doc.end();
  });
}

interface PaymentSlipData {
  amount: number;
  debtor: DebtorAddress;
  additionalInformation: string;
}

function clientSlip(record: MergedRecord, unstructuredMessage: string): PaymentSlipData {
  return {
    amount: record.invoice.amount,
    debtor: {
      name: `${record.client.firstName} ${record.client.lastName}`.trim(),
      street: record.client.street,
      buildingNumber: record.client.buildingNumber,
      zipCode: record.client.zipCode,
      city: record.client.city,
    },
    additionalInformation: unstructuredMessage,
  };
}

function createBillData(slip: PaymentSlipData, creditor: CreditorConfig) {
  const cdtrName = `${creditor.firstName} ${creditor.lastName}`.trim();

  const creditorData: {
    account: string;
    name: string;
    address: string;
    buildingNumber?: string;
    zip: string;
    city: string;
    country: string;
  } = {
    account: creditor.iban.replace(/\s+/g, ''),
    name: cdtrName,
    address: creditor.street.trim(),
    zip: creditor.zipCode.trim(),
    city: creditor.city.trim(),
    country: 'CH',
  };
  if (creditor.buildingNumber && creditor.buildingNumber.trim()) {
    creditorData.buildingNumber = creditor.buildingNumber.trim();
  }

  const debtorData: {
    name: string;
    address: string;
    buildingNumber?: string;
    zip: string;
    city: string;
    country: string;
  } = {
    name: slip.debtor.name.trim(),
    address: slip.debtor.street.trim(),
    zip: slip.debtor.zipCode.trim(),
    city: slip.debtor.city.trim(),
    country: 'CH',
  };
  if (slip.debtor.buildingNumber && slip.debtor.buildingNumber.trim()) {
    debtorData.buildingNumber = slip.debtor.buildingNumber.trim();
  }

  return {
    currency: 'CHF' as const,
    amount: slip.amount,
    creditor: creditorData,
    debtor: debtorData,
    additionalInformation: slip.additionalInformation,
  };
}

/**
 * Renders one A4 page per payment slip with the Swiss QR Bill payment part (105 mm) at the bottom.
 */
function renderSlipsPdf(
  slips: PaymentSlipData[],
  creditor: CreditorConfig,
  options: QrBillPdfOptions,
): Promise<Uint8Array> {
  const language = options.language ?? 'DE';
  const scissors = options.scissors ?? true;
  const outlines = options.outlines ?? true;

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });

  for (const slip of slips) {
    doc.addPage({ size: 'A4', margin: 0 });

    const bill = new SwissQRBill(createBillData(slip, creditor), {
      language,
      scissors,
      outlines,
    });

    bill.attachTo(doc, 0, PAYMENT_PART_Y_PT);
  }

  return buildPdfBuffer(doc);
}

/**
 * Generates a multi-page A4 PDF containing one page per client record in CSV order.
 * Each page has the Swiss QR Bill payment slip (105 mm) attached at the bottom.
 */
export async function generateQrBillPdf(
  records: MergedRecord[],
  creditor: CreditorConfig,
  options: QrBillPdfOptions = {},
): Promise<Uint8Array> {
  validateForPdfGeneration(records, creditor);

  const unstructuredMessage = options.unstructuredMessage ?? 'Klientenanteil Spitex';
  return renderSlipsPdf(records.map((r) => clientSlip(r, unstructuredMessage)), creditor, options);
}

/**
 * Generates a single-page A4 PDF for one client record.
 */
export async function generateSingleQrBillPdf(
  record: MergedRecord,
  creditor: CreditorConfig,
  options: QrBillPdfOptions = {},
): Promise<Uint8Array> {
  validateCreditor(creditor);
  validateMergedRecord(record);

  const unstructuredMessage = options.unstructuredMessage ?? 'Klientenanteil Spitex';
  return renderSlipsPdf([clientSlip(record, unstructuredMessage)], creditor, options);
}

/**
 * Generates individual PDFs for each client (named "{Nachname}_{Vorname}.pdf")
 * plus the combined "QR-Rechnungen.pdf", packaged in a ZIP archive.
 */
export async function generateQrBillZip(
  records: MergedRecord[],
  creditor: CreditorConfig,
  options: QrBillPdfOptions = {},
): Promise<Uint8Array> {
  validateForPdfGeneration(records, creditor);

  const zip = new JSZip();

  // Add individual PDFs
  for (const record of records) {
    const singlePdf = await generateSingleQrBillPdf(record, creditor, options);
    const filename = `${record.client.lastName}_${record.client.firstName}.pdf`;
    zip.file(filename, singlePdf);
  }

  // Add combined PDF
  const combinedPdf = await generateQrBillPdf(records, creditor, options);
  zip.file('QR-Rechnungen.pdf', combinedPdf);

  return zip.generateAsync({ type: 'uint8array' });
}
