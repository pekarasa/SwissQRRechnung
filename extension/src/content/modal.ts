import { getDefaultBillingPeriod, type BillingPeriod } from '../intranet/url.js';
import { runIntranetPipeline, type IntranetPipelineResult } from '../intranet/orchestrator.js';
import { loadAppSettings, openOptionsPage } from './storage.js';
import { isCreditorConfigured } from '../core/settings.js';
import { generateQrBillPdf, generateQrBillZip } from '../pdf/generator.js';

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(
  data: Uint8Array | string,
  filename: string,
  mimeType = 'application/octet-stream',
): void {
  const blob = typeof data === 'string'
    ? new Blob([data], { type: mimeType })
    : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens PDF preview in a new tab.
 */
export function previewPdf(pdfBytes: Uint8Array): void {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Triggers printing of the PDF in a new tab.
 */
export function printPdf(pdfBytes: Uint8Array): void {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      try {
        win.print();
      } catch {
        // Fallback: user prints from native browser PDF controls
      }
    });
  }
}

const MONTH_NAMES = [
  '01 (Januar)',
  '02 (Februar)',
  '03 (März)',
  '04 (April)',
  '05 (Mai)',
  '06 (Juni)',
  '07 (Juli)',
  '08 (August)',
  '09 (September)',
  '10 (Oktober)',
  '11 (November)',
  '12 (Dezember)',
];

function populateMonthSelect(select: HTMLSelectElement, selectedMonth: number): void {
  select.textContent = '';
  MONTH_NAMES.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i + 1);
    opt.textContent = name;
    if (i + 1 === selectedMonth) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function formatErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('Login') || msg.includes('HTML-Login') || msg.includes('HTML-Seite')) {
    return 'Ihre VeruA-Sitzung ist abgelaufen. Bitte melden Sie sich im Intranet erneut an und versuchen Sie es nochmals.';
  }
  if (msg.includes('Stammdaten') && msg.includes('nicht gefunden')) {
    return 'Stammdaten konnten nicht abgerufen werden. Bitte stellen Sie sicher, dass Sie im VeruA-Intranet eingeloggt sind und der Export "Vollständige Klientendaten nach Excel exportieren" (listClientsExportEkarus.php?aktiv=1) verfügbar ist.';
  }
  if (msg.includes('Rechnungsdaten') && msg.includes('nicht gefunden')) {
    return 'Rechnungsdaten konnten nicht abgerufen werden. Bitte prüfen Sie im VeruA-Intranet den Export "Daten nach Excel // OpenOffice exportieren" (betraege_gesamt_detail_ZR_Export.php).';
  }

  return msg;
}

/**
 * Creates and shows the SwissQRRechnung period & execution modal.
 */
export async function openQrBillModal(): Promise<void> {
  const existing = document.getElementById('swissqr-modal-overlay');
  if (existing) {
    existing.remove();
  }

  const defaultPeriod = getDefaultBillingPeriod();
  const settings = await loadAppSettings();
  const hasConfiguredCreditor = isCreditorConfigured(settings.creditor);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'swissqr-modal-overlay';
  overlay.className = 'sqr-overlay';

  // Modal
  const modal = document.createElement('div');
  modal.className = 'sqr-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'sqr-dialog-title');

  // Header
  const header = document.createElement('div');
  header.className = 'sqr-header';

  const title = document.createElement('h2');
  title.id = 'sqr-dialog-title';
  title.className = 'sqr-title';

  const badge = document.createElement('span');
  badge.className = 'sqr-badge';
  badge.textContent = '🇨🇭 QR';

  const titleText = document.createTextNode(' SwissQRRechnung');
  title.appendChild(badge);
  title.appendChild(titleText);

  const headerActions = document.createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.alignItems = 'center';
  headerActions.style.gap = '8px';

  const optionsBtn = document.createElement('button');
  optionsBtn.type = 'button';
  optionsBtn.className = 'sqr-btn sqr-btn-secondary';
  optionsBtn.style.padding = '4px 10px';
  optionsBtn.style.fontSize = '12px';
  optionsBtn.title = 'Einstellungen & Rechnungssteller öffnen';
  optionsBtn.textContent = '⚙️ Einstellungen';
  optionsBtn.addEventListener('click', () => {
    openOptionsPage();
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sqr-close-btn';
  closeBtn.id = 'sqr-btn-close';
  closeBtn.setAttribute('aria-label', 'Schliessen');
  closeBtn.textContent = '×';

  headerActions.appendChild(optionsBtn);
  headerActions.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(headerActions);
  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'sqr-body';

  // First-run / Missing Creditor check
  if (!hasConfiguredCreditor) {
    const alertBox = document.createElement('div');
    alertBox.className = 'sqr-status sqr-status-warning';

    const icon = document.createElement('div');
    icon.style.fontSize = '18px';
    icon.textContent = '⚠️';

    const textWrap = document.createElement('div');
    const boldMsg = document.createElement('strong');
    boldMsg.textContent = 'Rechnungssteller noch nicht eingerichtet!';
    const desc = document.createElement('p');
    desc.style.margin = '4px 0 8px 0';
    desc.textContent =
      'Bevor Rechnungen erstellt werden können, müssen IBAN und Adresse des Rechnungsstellers hinterlegt werden.';

    const setupBtn = document.createElement('button');
    setupBtn.type = 'button';
    setupBtn.className = 'sqr-btn sqr-btn-primary';
    setupBtn.textContent = '⚙️ Jetzt Einstellungen öffnen';
    setupBtn.addEventListener('click', () => {
      openOptionsPage();
    });

    textWrap.appendChild(boldMsg);
    textWrap.appendChild(desc);
    textWrap.appendChild(setupBtn);

    alertBox.appendChild(icon);
    alertBox.appendChild(textWrap);
    body.appendChild(alertBox);
  } else {
    // Creditor info box
    const creditorBox = document.createElement('div');
    creditorBox.className = 'sqr-creditor-info';

    const credHeader = document.createElement('div');
    credHeader.style.display = 'flex';
    credHeader.style.justifyContent = 'space-between';
    credHeader.style.alignItems = 'center';

    const creditorTitle = document.createElement('strong');
    creditorTitle.textContent = 'Rechnungssteller:';
    credHeader.appendChild(creditorTitle);

    const editBtn = document.createElement('a');
    editBtn.href = '#';
    editBtn.style.fontSize = '12px';
    editBtn.style.color = '#e62020';
    editBtn.textContent = 'Bearbeiten';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openOptionsPage();
    });
    credHeader.appendChild(editBtn);

    creditorBox.appendChild(credHeader);

    const creditorAddress = document.createElement('div');
    creditorAddress.textContent = `${settings.creditor.firstName} ${settings.creditor.lastName}, ${settings.creditor.street} ${settings.creditor.buildingNumber}, ${settings.creditor.zipCode} ${settings.creditor.city}`;
    creditorBox.appendChild(creditorAddress);

    const creditorIban = document.createElement('div');
    creditorIban.style.fontFamily = 'monospace';
    creditorIban.style.color = '#555';
    creditorIban.textContent = `IBAN: ${settings.creditor.iban}`;
    creditorBox.appendChild(creditorIban);

    body.appendChild(creditorBox);
  }

  // Period Section
  const periodSection = document.createElement('div');
  const periodTitle = document.createElement('div');
  periodTitle.className = 'sqr-section-title';
  periodTitle.textContent = 'Rechnungsperiode auswählen';
  periodSection.appendChild(periodTitle);

  const grid = document.createElement('div');
  grid.className = 'sqr-grid';

  // Year input
  const yearGroup = document.createElement('div');
  yearGroup.className = 'sqr-form-group';
  const yearLabel = document.createElement('label');
  yearLabel.htmlFor = 'sqr-input-year';
  yearLabel.textContent = 'Jahr';
  const yearInput = document.createElement('input');
  yearInput.type = 'number';
  yearInput.id = 'sqr-input-year';
  yearInput.min = '2020';
  yearInput.max = '2099';
  yearInput.value = String(defaultPeriod.year);
  yearGroup.appendChild(yearLabel);
  yearGroup.appendChild(yearInput);
  grid.appendChild(yearGroup);

  // From Month
  const fromGroup = document.createElement('div');
  fromGroup.className = 'sqr-form-group';
  const fromLabel = document.createElement('label');
  fromLabel.htmlFor = 'sqr-select-from-month';
  fromLabel.textContent = 'Von Monat';
  const fromSelect = document.createElement('select');
  fromSelect.id = 'sqr-select-from-month';
  populateMonthSelect(fromSelect, defaultPeriod.fromMonth);
  fromGroup.appendChild(fromLabel);
  fromGroup.appendChild(fromSelect);
  grid.appendChild(fromGroup);

  // To Month
  const toGroup = document.createElement('div');
  toGroup.className = 'sqr-form-group';
  const toLabel = document.createElement('label');
  toLabel.htmlFor = 'sqr-select-to-month';
  toLabel.textContent = 'Bis Monat';
  const toSelect = document.createElement('select');
  toSelect.id = 'sqr-select-to-month';
  populateMonthSelect(toSelect, defaultPeriod.toMonth);
  toGroup.appendChild(toLabel);
  toGroup.appendChild(toSelect);
  grid.appendChild(toGroup);

  periodSection.appendChild(grid);
  body.appendChild(periodSection);

  // Status Box
  const statusBox = document.createElement('div');
  statusBox.id = 'sqr-status-box';
  statusBox.style.display = 'none';
  body.appendChild(statusBox);

  modal.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'sqr-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'sqr-btn sqr-btn-secondary';
  cancelBtn.id = 'sqr-btn-cancel';
  cancelBtn.textContent = 'Abbrechen';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'sqr-btn sqr-btn-primary';
  submitBtn.id = 'sqr-btn-submit';
  submitBtn.textContent = 'QR-Rechnungen erstellen';
  if (!hasConfiguredCreditor) {
    submitBtn.disabled = true;
    submitBtn.title = 'Bitte zuerst Rechnungssteller einrichten';
  }

  footer.appendChild(cancelBtn);
  footer.appendChild(submitBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  submitBtn.addEventListener('click', async () => {
    const year = parseInt(yearInput.value, 10);
    const fromMonth = parseInt(fromSelect.value, 10);
    const toMonth = parseInt(toSelect.value, 10);

    if (isNaN(year) || year < 2000 || year > 2100) {
      showStatus(statusBox, 'error', 'Bitte geben Sie ein gültiges Jahr ein (z. B. 2026).');
      return;
    }

    if (fromMonth > toMonth) {
      showStatus(statusBox, 'error', 'Der Startmonat darf nicht nach dem Endmonat liegen.');
      return;
    }

    const period: BillingPeriod = { year, fromMonth, toMonth };

    submitBtn.disabled = true;
    showStatus(
      statusBox,
      'loading',
      `Lade Stammdaten und Rechnungsdaten für ${period.fromMonth}/${period.year} bis ${period.toMonth}/${period.year} aus VeruA...`,
    );

    try {
      const pipelineResult = await runIntranetPipeline({
        period,
        creditor: settings.creditor,
        exportParams: settings.exportParams,
        unstructuredMessage: settings.unstructuredMessage,
      });

      if (pipelineResult.matchedCount === 0) {
        submitBtn.disabled = false;
        showStatus(
          statusBox,
          'warning',
          'Für die gewählte Rechnungsperiode wurden keine passenden Rechnungsdaten gefunden.',
        );
        return;
      }

      showStatus(
        statusBox,
        'loading',
        `Erzeuge Schweizer QR-Rechnungen (PDF) für ${pipelineResult.matchedCount} Klienten...`,
      );

      const pdfBytes = await generateQrBillPdf(pipelineResult.matched, settings.creditor, {
        unstructuredMessage: settings.unstructuredMessage,
      });

      handleExecutionSuccess(
        pipelineResult,
        pdfBytes,
        settings,
        statusBox,
        footer,
        closeModal,
        periodSection,
      );
    } catch (err) {
      submitBtn.disabled = false;
      const formattedMsg = formatErrorMessage(err);
      showStatus(statusBox, 'error', `Fehler: ${formattedMsg}`);
    }
  });
}

function showStatus(
  container: HTMLElement,
  type: 'loading' | 'success' | 'warning' | 'error',
  message: string,
): void {
  container.style.display = 'flex';
  container.className = `sqr-status sqr-status-${type}`;
  container.textContent = '';

  if (type === 'loading') {
    const spinner = document.createElement('div');
    spinner.className = 'sqr-spinner';
    const textNode = document.createElement('div');
    textNode.textContent = message;
    container.appendChild(spinner);
    container.appendChild(textNode);
  } else {
    const icon = document.createElement('div');
    icon.style.fontWeight = 'bold';
    icon.style.fontSize = '15px';
    icon.textContent = type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✖';
    const textNode = document.createElement('div');
    textNode.textContent = message;
    container.appendChild(icon);
    container.appendChild(textNode);
  }
}

function handleExecutionSuccess(
  result: IntranetPipelineResult,
  pdfBytes: Uint8Array,
  settings: Awaited<ReturnType<typeof loadAppSettings>>,
  statusBox: HTMLElement,
  footer: HTMLElement,
  closeModal: () => void,
  periodSection: HTMLElement,
): void {
  statusBox.style.display = 'flex';
  statusBox.textContent = '';

  // Collapse period picker to save vertical space
  periodSection.style.display = 'none';

  if (result.unmatchedInvoices.length > 0) {
    statusBox.className = 'sqr-status sqr-status-warning';
    const icon = document.createElement('div');
    icon.style.fontWeight = 'bold';
    icon.style.fontSize = '16px';
    icon.textContent = '⚠️';

    const content = document.createElement('div');
    const boldMsg = document.createElement('strong');
    boldMsg.textContent = `${result.matchedCount} QR-Rechnungen erfolgreich erstellt!`;
    content.appendChild(boldMsg);

    const warnMsg = document.createElement('div');
    warnMsg.style.marginTop = '6px';
    const names = result.unmatchedInvoices.map((inv) => inv.matchName).join(', ');
    warnMsg.textContent = `Achtung: ${result.unmatchedInvoices.length} Rechnungen konnten keinem Klienten in den Stammdaten zugeordnet werden: ${names}`;
    content.appendChild(warnMsg);

    statusBox.appendChild(icon);
    statusBox.appendChild(content);
  } else {
    statusBox.className = 'sqr-status sqr-status-success';
    const icon = document.createElement('div');
    icon.style.fontWeight = 'bold';
    icon.style.fontSize = '16px';
    icon.textContent = '✓';

    const content = document.createElement('div');
    const boldMsg = document.createElement('strong');
    boldMsg.textContent = `${result.matchedCount} QR-Rechnungen erfolgreich erstellt!`;
    content.appendChild(boldMsg);

    const subMsg = document.createElement('div');
    subMsg.style.marginTop = '4px';
    subMsg.style.fontSize = '12px';
    subMsg.textContent = 'Die PDF-Rechnungen sind druckbereit mit Standard-Zahlteil (105 mm).';
    content.appendChild(subMsg);

    statusBox.appendChild(icon);
    statusBox.appendChild(content);
  }

  // Footer Actions: PDF, Vorschau, Drucken, ZIP, CSV, Schliessen
  footer.textContent = '';

  const downloadPdfBtn = document.createElement('button');
  downloadPdfBtn.className = 'sqr-btn sqr-btn-primary';
  downloadPdfBtn.textContent = '📄 PDF herunterladen';
  downloadPdfBtn.title = 'Sammel-PDF mit allen QR-Rechnungen herunterladen';
  downloadPdfBtn.addEventListener('click', () => {
    downloadFile(pdfBytes, 'QR-Rechnungen.pdf', 'application/pdf');
  });

  const previewBtn = document.createElement('button');
  previewBtn.className = 'sqr-btn sqr-btn-secondary';
  previewBtn.textContent = '👁 Vorschau';
  previewBtn.title = 'PDF in neuem Tab ansehen';
  previewBtn.addEventListener('click', () => {
    previewPdf(pdfBytes);
  });

  const printBtn = document.createElement('button');
  printBtn.className = 'sqr-btn sqr-btn-secondary';
  printBtn.textContent = '🖨 Drucken';
  printBtn.title = 'PDF direkt drucken';
  printBtn.addEventListener('click', () => {
    printPdf(pdfBytes);
  });

  const downloadZipBtn = document.createElement('button');
  downloadZipBtn.className = 'sqr-btn sqr-btn-secondary';
  downloadZipBtn.textContent = '📦 Einzel-PDFs (ZIP)';
  downloadZipBtn.title = 'ZIP-Archiv mit Einzel-PDFs pro Klient herunterladen';
  downloadZipBtn.addEventListener('click', async () => {
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = '📦 ZIP wird erstellt...';
    try {
      const zipBytes = await generateQrBillZip(result.matched, settings.creditor, {
        unstructuredMessage: settings.unstructuredMessage,
      });
      downloadFile(zipBytes, 'QR-Rechnungen.zip', 'application/zip');
    } catch (err) {
      alert(`Fehler beim Erstellen des ZIP-Archivs: ${String(err)}`);
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = '📦 Einzel-PDFs (ZIP)';
    }
  });

  const downloadCsvBtn = document.createElement('button');
  downloadCsvBtn.className = 'sqr-btn sqr-btn-secondary';
  downloadCsvBtn.textContent = '📊 CSV';
  downloadCsvBtn.title = 'QR-Rechnungen.csv (Windows-1252) herunterladen';
  downloadCsvBtn.addEventListener('click', () => {
    downloadFile(result.csvBytes, 'QR-Rechnungen.csv', 'text/csv;charset=windows-1252');
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'sqr-btn sqr-btn-secondary';
  closeButton.textContent = 'Schliessen';
  closeButton.addEventListener('click', closeModal);

  footer.appendChild(downloadPdfBtn);
  footer.appendChild(previewBtn);
  footer.appendChild(printBtn);
  footer.appendChild(downloadZipBtn);
  footer.appendChild(downloadCsvBtn);
  footer.appendChild(closeButton);
}
