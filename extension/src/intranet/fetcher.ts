import { decodeAuto } from '../core/encoding.js';
import {
  buildClientExportUrl,
  buildInvoiceExportUrl,
  type InvoiceExportParams,
} from './url.js';

export interface FetchOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

export interface IntranetExportData {
  clientsRawBytes: Uint8Array;
  invoicesRawBytes: Uint8Array;
  invoicesText: string;
}

/**
 * Checks if the response content appears to be a login page or authentication error
 * rather than the expected CSV or XLS export data.
 */
export function isLoginPageOrAuthError(text: string): boolean {
  const lower = text.toLowerCase();

  const hasPasswordInput =
    lower.includes('type="password"') ||
    lower.includes("type='password'") ||
    lower.includes('type=password');

  const hasLoginKeywords =
    (lower.includes('anmelden') || lower.includes('anmeldung') || lower.includes('login')) &&
    (lower.includes('passwort') || lower.includes('password') || lower.includes('benutzername'));

  const isHtmlDocument =
    lower.startsWith('<!doctype html') ||
    lower.startsWith('<html') ||
    lower.includes('<html xmlns');

  // If it is an HTML document containing login/password forms or titles
  if (isHtmlDocument && (hasPasswordInput || hasLoginKeywords)) {
    return true;
  }

  return false;
}

/**
 * Validates that the downloaded payload is not empty and not an authentication failure.
 */
export function validateExportResponse(
  bytes: Uint8Array,
  label: 'Stammdaten' | 'Rechnungsdaten',
): string {
  if (!bytes || bytes.byteLength === 0) {
    throw new Error(`${label} konnten nicht geladen werden: Leere Antwort vom Server (0 Bytes).`);
  }

  // Attempt auto-decoding to check for HTML error / login redirect
  const text = decodeAuto(bytes);

  if (isLoginPageOrAuthError(text)) {
    throw new Error(
      `Sitzung abgelaufen oder nicht eingeloggt beim Abrufen der ${label}. Bitte melden Sie sich im Intranet an.`,
    );
  }

  return text;
}

/**
 * Fetches the client master data export (.xls / HTML-Table / CSV) from VeruA.
 * Always reads using arrayBuffer() and credentials: 'include'.
 */
export async function fetchClientsExport(
  options: FetchOptions & { aktiv?: number } = {},
): Promise<Uint8Array> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error('Keine fetch-Funktion verfügbar.');
  }

  const url = buildClientExportUrl(options.baseUrl, options.aktiv ?? 1);

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      credentials: 'include',
    });
  } catch (err) {
    throw new Error(
      `Netzwerkfehler beim Laden der Stammdaten (${url}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP-Fehler beim Abrufen der Stammdaten: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  validateExportResponse(bytes, 'Stammdaten');

  return bytes;
}

/**
 * Fetches the invoice data export (tab-separated CSV) from VeruA for a specified period.
 * Always reads using arrayBuffer() and credentials: 'include'.
 */
export async function fetchInvoicesExport(
  params: InvoiceExportParams,
  options: FetchOptions = {},
): Promise<{ bytes: Uint8Array; text: string }> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error('Keine fetch-Funktion verfügbar.');
  }

  const url = buildInvoiceExportUrl(options.baseUrl, params);

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      credentials: 'include',
    });
  } catch (err) {
    throw new Error(
      `Netzwerkfehler beim Laden der Rechnungsdaten (${url}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP-Fehler beim Abrufen der Rechnungsdaten: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = validateExportResponse(bytes, 'Rechnungsdaten');

  return { bytes, text };
}

/**
 * Fetches both client and invoice data in parallel from the logged-in VeruA session.
 */
export async function fetchIntranetExports(
  params: InvoiceExportParams,
  options: FetchOptions = {},
): Promise<IntranetExportData> {
  const [clientsRawBytes, invoicesResult] = await Promise.all([
    fetchClientsExport(options),
    fetchInvoicesExport(params, options),
  ]);

  return {
    clientsRawBytes,
    invoicesRawBytes: invoicesResult.bytes,
    invoicesText: invoicesResult.text,
  };
}
