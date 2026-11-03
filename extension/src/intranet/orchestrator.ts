import { processInvoicesAndClients, type ProcessResult } from '../core/pipeline.js';
import type { CustomUrlsConfig } from '../core/settings.js';
import type { CreditorConfig, Invoice } from '../core/types.js';
import { fetchIntranetExports, type FetchOptions } from './fetcher.js';
import type { BillingPeriod, InvoiceExportParams } from './url.js';

export interface IntranetPipelineOptions {
  period: BillingPeriod;
  creditor: CreditorConfig;
  exportParams?: Partial<Omit<InvoiceExportParams, 'period'>>;
  customUrls?: CustomUrlsConfig;
  fetchOptions?: FetchOptions;
  unstructuredMessage?: string;
}

export interface IntranetPipelineResult extends ProcessResult {
  clientsRawBytes: Uint8Array;
  invoicesRawBytes: Uint8Array;
  invoicesText: string;
}

/**
 * Runs the end-to-end data retrieval and processing pipeline:
 * 1. Fetches both client and invoice data from VeruA.
 * 2. Parses, joins, and maps the records using the Stage 1 pipeline.
 * 3. Generates the Windows-1252 CSV output.
 */
export async function runIntranetPipeline(
  options: IntranetPipelineOptions,
): Promise<IntranetPipelineResult> {
  const { period, creditor, exportParams, customUrls, fetchOptions, unstructuredMessage } = options;

  const fullExportParams: InvoiceExportParams = {
    period,
    owner: exportParams?.owner ?? 1,
    sprache: exportParams?.sprache ?? 'DE',
    kuerzelKanton: exportParams?.kuerzelKanton ?? 'O_K',
    idKanton: exportParams?.idKanton ?? 0,
  };

  const effectiveFetchOptions: FetchOptions = {
    ...fetchOptions,
    ...(customUrls ? { customUrls } : {}),
  };

  const exports = await fetchIntranetExports(fullExportParams, effectiveFetchOptions);

  const pipelineResult = processInvoicesAndClients(
    exports.invoicesRawBytes,
    exports.clientsRawBytes,
    creditor,
    unstructuredMessage,
  );

  return {
    ...pipelineResult,
    clientsRawBytes: exports.clientsRawBytes,
    invoicesRawBytes: exports.invoicesRawBytes,
    invoicesText: exports.invoicesText,
  };
}
