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
import type { CreditorConfig, MergedRecord } from '../core/types.js';

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

function createBillData(
  record: MergedRecord,
  creditor: CreditorConfig,
  unstructuredMessage: string,
) {
  const cdtrName = `${creditor.firstName} ${creditor.lastName}`.trim();
  const dbtrName = `${record.client.firstName} ${record.client.lastName}`.trim();

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
    name: dbtrName,
    address: record.client.street.trim(),
    zip: record.client.zipCode.trim(),
    city: record.client.city.trim(),
    country: 'CH',
  };
  if (record.client.buildingNumber && record.client.buildingNumber.trim()) {
    debtorData.buildingNumber = record.client.buildingNumber.trim();
  }

  return {
    currency: 'CHF' as const,
    amount: record.invoice.amount,
    creditor: creditorData,
    debtor: debtorData,
    additionalInformation: unstructuredMessage,
  };
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

  const language = options.language ?? 'DE';
  const scissors = options.scissors ?? true;
  const outlines = options.outlines ?? true;
  const unstructuredMessage = options.unstructuredMessage ?? 'Klientenanteil Spitex';

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });

  for (const record of records) {
    doc.addPage({ size: 'A4', margin: 0 });

    const billData = createBillData(record, creditor, unstructuredMessage);
    const bill = new SwissQRBill(billData, {
      language,
      scissors,
      outlines,
    });

    bill.attachTo(doc, 0, PAYMENT_PART_Y_PT);
  }

  return buildPdfBuffer(doc);
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

  const language = options.language ?? 'DE';
  const scissors = options.scissors ?? true;
  const outlines = options.outlines ?? true;
  const unstructuredMessage = options.unstructuredMessage ?? 'Klientenanteil Spitex';

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.addPage({ size: 'A4', margin: 0 });

  const billData = createBillData(record, creditor, unstructuredMessage);
  const bill = new SwissQRBill(billData, {
    language,
    scissors,
    outlines,
  });

  bill.attachTo(doc, 0, PAYMENT_PART_Y_PT);

  return buildPdfBuffer(doc);
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
