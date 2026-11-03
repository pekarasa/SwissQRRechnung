/**
 * URL and period helpers for the VeruA Intranet data exports.
 */

export interface BillingPeriod {
  year: number;
  fromMonth: number;
  toMonth: number;
}

export interface InvoiceExportParams {
  owner?: number;
  sprache?: string;
  kuerzelKanton?: string;
  idKanton?: number;
  period: BillingPeriod;
}

/**
 * Returns the default billing period (previous month).
 * For example, in March 2026, returns { year: 2026, fromMonth: 2, toMonth: 2 }.
 * In January 2026, returns { year: 2025, fromMonth: 12, toMonth: 12 }.
 */
export function getDefaultBillingPeriod(referenceDate: Date = new Date()): BillingPeriod {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-indexed

  if (currentMonth === 1) {
    return {
      year: currentYear - 1,
      fromMonth: 12,
      toMonth: 12,
    };
  }

  return {
    year: currentYear,
    fromMonth: currentMonth - 1,
    toMonth: currentMonth - 1,
  };
}

/**
 * Formats a month number (1-12) as a 2-digit string ("01" - "12").
 */
export function formatMonthTwoDigits(month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Ungültiger Monat: ${month}. Erwartet wird eine Ganzzahl zwischen 1 und 12.`);
  }
  return month.toString().padStart(2, '0');
}

/**
 * Ensures a base URL has no trailing slash.
 */
function cleanBaseUrl(baseUrl?: string): string {
  if (!baseUrl) {
    return '';
  }
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Constructs the URL for the client master data export.
 * VeruA endpoint: listen/listClientsExportEkarus.php?aktiv=1
 */
export function buildClientExportUrl(baseUrl?: string, aktiv = 1, customPath?: string): string {
  const clean = cleanBaseUrl(baseUrl);
  const basePath = (customPath ? customPath.replace(/\?.*$/, '') : 'listen/listClientsExportEkarus.php').replace(/^\/+/, '');
  const path = `${basePath}?aktiv=${aktiv}`;
  return clean ? `${clean}/${path}` : path;
}

/**
 * Constructs the URL for the invoice data export.
 * VeruA endpoint:
 * Rechnung/betraege_gesamt_detail_ZR_Export.php?owner=1&sprache=DE&kuerzel_kanton=O_K&id_kanton=0&v_jahr=2026&v_monat=07&b_monat=07
 * Note: Never append trailing quotes (%27) which were observed as copy artifacts in JavaScript links.
 */
export function buildInvoiceExportUrl(
  baseUrl: string | undefined,
  params: InvoiceExportParams,
  customPath?: string,
): string {
  const {
    owner = 1,
    sprache = 'DE',
    kuerzelKanton = 'O_K',
    idKanton = 0,
    period,
  } = params;

  if (!Number.isInteger(period.year) || period.year < 2000 || period.year > 2100) {
    throw new Error(`Ungültiges Rechnungsjahr: ${period.year}`);
  }

  const vMonat = formatMonthTwoDigits(period.fromMonth);
  const bMonat = formatMonthTwoDigits(period.toMonth);

  if (period.fromMonth > period.toMonth) {
    throw new Error(`Startmonat (${vMonat}) darf nicht nach dem Endmonat (${bMonat}) liegen.`);
  }

  const query = new URLSearchParams({
    owner: String(owner),
    sprache,
    kuerzel_kanton: kuerzelKanton,
    id_kanton: String(idKanton),
    v_jahr: String(period.year),
    v_monat: vMonat,
    b_monat: bMonat,
  });

  const clean = cleanBaseUrl(baseUrl);
  const basePath = (customPath ? customPath.replace(/\?.*$/, '') : 'Rechnung/betraege_gesamt_detail_ZR_Export.php').replace(/^\/+/, '');
  const path = `${basePath}?${query.toString()}`;
  return clean ? `${clean}/${path}` : path;
}

/**
 * Checks whether a given URL or pathname corresponds to the VeruA Rechnungsverwaltung page (start_abrechnung.php).
 */
export function isRechnungsverwaltungUrl(urlOrPath: string): boolean {
  if (!urlOrPath) {
    return false;
  }
  try {
    const parsed = new URL(urlOrPath, 'https://dummy.local');
    const pathname = parsed.pathname.toLowerCase();
    return pathname.endsWith('/start_abrechnung.php') || pathname.includes('start_abrechnung.php');
  } catch {
    const lower = urlOrPath.toLowerCase();
    return lower.endsWith('/start_abrechnung.php') || lower.includes('start_abrechnung.php');
  }
}
