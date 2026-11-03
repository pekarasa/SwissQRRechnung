import { getDefaultBillingPeriod, type BillingPeriod } from '../intranet/url.js';
import { runIntranetPipeline, type IntranetPipelineResult } from '../intranet/orchestrator.js';
import { loadCreditorConfig } from './storage.js';

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

/**
 * Creates and shows the SwissQRRechnung period & execution modal.
 */
export async function openQrBillModal(): Promise<void> {
  const existing = document.getElementById('swissqr-modal-overlay');
  if (existing) {
    existing.remove();
  }

  const defaultPeriod = getDefaultBillingPeriod();
  const creditor = await loadCreditorConfig();

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
  badge.textContent = 'QR';

  const titleText = document.createTextNode(' SwissQRRechnung');
  title.appendChild(badge);
  title.appendChild(titleText);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sqr-close-btn';
  closeBtn.id = 'sqr-btn-close';
  closeBtn.setAttribute('aria-label', 'Schliessen');
  closeBtn.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'sqr-body';

  // Creditor info box
  const creditorBox = document.createElement('div');
  creditorBox.className = 'sqr-creditor-info';

  const creditorTitle = document.createElement('strong');
  creditorTitle.textContent = 'Rechnungssteller:';
  creditorBox.appendChild(creditorTitle);

  const creditorAddress = document.createElement('div');
  creditorAddress.textContent = `${creditor.firstName} ${creditor.lastName}, ${creditor.street} ${creditor.buildingNumber}, ${creditor.zipCode} ${creditor.city}`;
  creditorBox.appendChild(creditorAddress);

  const creditorIban = document.createElement('div');
  creditorIban.style.fontFamily = 'monospace';
  creditorIban.style.color = '#555';
  creditorIban.textContent = `IBAN: ${creditor.iban}`;
  creditorBox.appendChild(creditorIban);

  body.appendChild(creditorBox);

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
      showStatus(
        statusBox,
        'error',
        'Der Startmonat darf nicht nach dem Endmonat liegen.',
      );
      return;
    }

    const period: BillingPeriod = { year, fromMonth, toMonth };

    submitBtn.disabled = true;
    showStatus(
      statusBox,
      'loading',
      `Lade Stammdaten und Rechnungsdaten für ${period.fromMonth}/${period.year} bis ${period.toMonth}/${period.year} aus VeruA herunter...`,
    );

    try {
      const result = await runIntranetPipeline({
        period,
        creditor,
      });

      handlePipelineSuccess(result, statusBox, footer, closeModal);
    } catch (err) {
      submitBtn.disabled = false;
      const message = err instanceof Error ? err.message : String(err);
      showStatus(statusBox, 'error', `Fehler: ${message}`);
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

function handlePipelineSuccess(
  result: IntranetPipelineResult,
  statusBox: HTMLElement,
  footer: HTMLElement,
  closeModal: () => void,
): void {
  statusBox.style.display = 'flex';
  statusBox.textContent = '';

  if (result.unmatchedInvoices.length > 0) {
    statusBox.className = 'sqr-status sqr-status-warning';
    const icon = document.createElement('div');
    icon.style.fontWeight = 'bold';
    icon.style.fontSize = '15px';
    icon.textContent = '⚠';

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
    icon.style.fontSize = '15px';
    icon.textContent = '✓';

    const content = document.createElement('div');
    const boldMsg = document.createElement('strong');
    boldMsg.textContent = `${result.matchedCount} QR-Rechnungen erfolgreich erstellt!`;
    content.appendChild(boldMsg);

    statusBox.appendChild(icon);
    statusBox.appendChild(content);
  }

  // Footer buttons
  footer.textContent = '';

  const closeButton = document.createElement('button');
  closeButton.className = 'sqr-btn sqr-btn-secondary';
  closeButton.textContent = 'Schliessen';
  closeButton.addEventListener('click', closeModal);

  const downloadCsvBtn = document.createElement('button');
  downloadCsvBtn.className = 'sqr-btn sqr-btn-primary';
  downloadCsvBtn.textContent = '⬇ QR-Rechnungen.csv';
  downloadCsvBtn.addEventListener('click', () => {
    downloadFile(result.csvBytes, 'QR-Rechnungen.csv', 'text/csv;charset=windows-1252');
  });

  footer.appendChild(closeButton);
  footer.appendChild(downloadCsvBtn);
}
