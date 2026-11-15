import {
  processInvoicesAndClients,
  processMunicipalityBills,
  type MunicipalityProcessResult,
  type ProcessResult,
} from '../core/pipeline.js';
import { parseMunicipalities } from '../core/parseMunicipalities.js';
import type { CustomUrlsConfig } from '../core/settings.js';
import type { CreditorConfig, Municipality } from '../core/types.js';
import { fetchIntranetExports, fetchMunicipalitiesExport, type FetchOptions } from './fetcher.js';
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

function buildFullExportParams(
  period: BillingPeriod,
  exportParams?: Partial<Omit<InvoiceExportParams, 'period'>>,
): InvoiceExportParams {
  return {
    period,
    owner: exportParams?.owner ?? 1,
    sprache: exportParams?.sprache ?? 'DE',
    kuerzelKanton: exportParams?.kuerzelKanton ?? 'O_K',
    idKanton: exportParams?.idKanton ?? 0,
  };
}

function buildFetchOptions(fetchOptions?: FetchOptions, customUrls?: CustomUrlsConfig): FetchOptions {
  return {
    ...fetchOptions,
    ...(customUrls ? { customUrls } : {}),
  };
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

  const fullExportParams = buildFullExportParams(period, exportParams);
  const effectiveFetchOptions = buildFetchOptions(fetchOptions, customUrls);

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

export interface MunicipalityPipelineOptions {
  period: BillingPeriod;
  creditor: CreditorConfig;
  selectedMunicipalities: string[];
  messageTemplate?: string;
  exportParams?: Partial<Omit<InvoiceExportParams, 'period'>>;
  customUrls?: CustomUrlsConfig;
  fetchOptions?: FetchOptions;
}

/**
 * Fetches and parses the municipality list (used for the municipality selection in the dialog).
 */
export async function loadMunicipalityList(options: {
  exportParams?: Partial<Omit<InvoiceExportParams, 'period'>>;
  customUrls?: CustomUrlsConfig;
  fetchOptions?: FetchOptions;
} = {}): Promise<Municipality[]> {
  const params = buildFullExportParams({ year: 2000, fromMonth: 1, toMonth: 1 }, options.exportParams);
  const bytes = await fetchMunicipalitiesExport(
    { owner: params.owner ?? 1, sprache: params.sprache ?? 'DE' },
    buildFetchOptions(options.fetchOptions, options.customUrls),
  );
  return parseMunicipalities(bytes);
}

/**
 * Runs the municipality pipeline (stage 6): fetches client data, invoice data and the municipality list
 * in parallel and builds one payment slip per client of a selected municipality.
 */
export async function runMunicipalityPipeline(
  options: MunicipalityPipelineOptions,
): Promise<MunicipalityProcessResult> {
  const { period, creditor, exportParams, customUrls, fetchOptions, selectedMunicipalities, messageTemplate } = options;

  const fullExportParams = buildFullExportParams(period, exportParams);
  const effectiveFetchOptions = buildFetchOptions(fetchOptions, customUrls);

  const [exports, municipalitiesBytes] = await Promise.all([
    fetchIntranetExports(fullExportParams, effectiveFetchOptions),
    fetchMunicipalitiesExport(
      { owner: fullExportParams.owner ?? 1, sprache: fullExportParams.sprache ?? 'DE' },
      effectiveFetchOptions,
    ),
  ]);

  return processMunicipalityBills(
    exports.invoicesRawBytes,
    exports.clientsRawBytes,
    municipalitiesBytes,
    creditor,
    selectedMunicipalities,
    messageTemplate,
  );
}
