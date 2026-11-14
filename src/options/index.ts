import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CREDITOR,
  exportCreditorToJson,
  importCreditorFromJson,
  validateCreditorFields,
  type AppSettings,
} from '../core/settings.js';
import type { CreditorConfig } from '../core/types.js';
import { loadAppSettings, saveAppSettings } from '../content/storage.js';

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element #${id} nicht gefunden.`);
  }
  return el as T;
}

function showAlert(type: 'success' | 'error' | 'info', message: string): void {
  const alertEl = getElement<HTMLDivElement>('status-alert');
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;
  alertEl.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAlert(): void {
  const alertEl = getElement<HTMLDivElement>('status-alert');
  alertEl.classList.add('hidden');
}

function clearFieldErrors(): void {
  const errorElements = document.querySelectorAll('.field-error');
  errorElements.forEach((el) => {
    el.textContent = '';
  });
  const inputs = document.querySelectorAll('input.is-invalid');
  inputs.forEach((input) => {
    input.classList.remove('is-invalid');
  });
}

function setFieldError(fieldId: string, errorText: string): void {
  const errorSpan = document.getElementById(`error-${fieldId}`);
  if (errorSpan) {
    errorSpan.textContent = errorText;
  }
  const input = document.getElementById(fieldId);
  if (input) {
    input.classList.add('is-invalid');
  }
}

function populateForm(settings: AppSettings): void {
  const { creditor, unstructuredMessage, exportParams, customUrls } = settings;

  getElement<HTMLInputElement>('iban').value = creditor.iban || '';
  getElement<HTMLInputElement>('firstName').value = creditor.firstName || '';
  getElement<HTMLInputElement>('lastName').value = creditor.lastName || '';
  getElement<HTMLInputElement>('street').value = creditor.street || '';
  getElement<HTMLInputElement>('buildingNumber').value = creditor.buildingNumber || '';
  getElement<HTMLInputElement>('zipCode').value = creditor.zipCode || '';
  getElement<HTMLInputElement>('city').value = creditor.city || '';

  getElement<HTMLInputElement>('unstructuredMessage').value = unstructuredMessage || '';
  getElement<HTMLInputElement>('kuerzelKanton').value = exportParams.kuerzelKanton || '';
  getElement<HTMLInputElement>('idKanton').value = String(exportParams.idKanton ?? 0);
  getElement<HTMLInputElement>('owner').value = String(exportParams.owner ?? 1);
  getElement<HTMLInputElement>('sprache').value = exportParams.sprache || 'DE';

  getElement<HTMLInputElement>('clientsPath').value = customUrls.clientsPath || '';
  getElement<HTMLInputElement>('invoicesPath').value = customUrls.invoicesPath || '';
}

function readFormCreditor(): CreditorConfig {
  return {
    iban: getElement<HTMLInputElement>('iban').value.replace(/\s+/g, '').toUpperCase(),
    firstName: getElement<HTMLInputElement>('firstName').value.trim(),
    lastName: getElement<HTMLInputElement>('lastName').value.trim(),
    street: getElement<HTMLInputElement>('street').value.trim(),
    buildingNumber: getElement<HTMLInputElement>('buildingNumber').value.trim(),
    zipCode: getElement<HTMLInputElement>('zipCode').value.trim(),
    city: getElement<HTMLInputElement>('city').value.trim(),
  };
}

function readFormSettings(): AppSettings {
  const creditor = readFormCreditor();
  const unstructuredMessage = getElement<HTMLInputElement>('unstructuredMessage').value.trim() || 'Klientenanteil Spitex';
  const kuerzelKanton = getElement<HTMLInputElement>('kuerzelKanton').value.trim() || 'O_K';
  const idKanton = parseInt(getElement<HTMLInputElement>('idKanton').value, 10) || 0;
  const owner = parseInt(getElement<HTMLInputElement>('owner').value, 10) || 1;
  const sprache = getElement<HTMLInputElement>('sprache').value.trim() || 'DE';
  const clientsPath = getElement<HTMLInputElement>('clientsPath').value.trim() || DEFAULT_APP_SETTINGS.customUrls.clientsPath;
  const invoicesPath = getElement<HTMLInputElement>('invoicesPath').value.trim() || DEFAULT_APP_SETTINGS.customUrls.invoicesPath;

  return {
    creditor,
    unstructuredMessage,
    exportParams: {
      owner,
      sprache,
      kuerzelKanton,
      idKanton,
    },
    customUrls: {
      clientsPath,
      invoicesPath,
    },
  };
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function initOptionsPage(): Promise<void> {
  const settings = await loadAppSettings();
  populateForm(settings);

  const form = getElement<HTMLFormElement>('options-form');
  const fileInput = getElement<HTMLInputElement>('file-import');
  const btnImport = getElement<HTMLButtonElement>('btn-import');
  const btnExport = getElement<HTMLButtonElement>('btn-export');
  const btnLoadSample = getElement<HTMLButtonElement>('btn-load-sample');
  const btnReset = getElement<HTMLButtonElement>('btn-reset');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    hideAlert();

    const currentSettings = readFormSettings();
    const validation = validateCreditorFields(currentSettings.creditor);

    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, msg]) => {
        setFieldError(field, msg);
      });
      showAlert('error', 'Bitte korrigieren Sie die markierten Eingabefehler beim Rechnungssteller.');
      return;
    }

    try {
      await saveAppSettings(currentSettings);
      showAlert('success', '✓ Einstellungen erfolgreich gespeichert!');
    } catch (err) {
      showAlert('error', `Fehler beim Speichern: ${String(err)}`);
    }
  });

  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const creditor = importCreditorFromJson(text);

      getElement<HTMLInputElement>('iban').value = creditor.iban;
      getElement<HTMLInputElement>('firstName').value = creditor.firstName;
      getElement<HTMLInputElement>('lastName').value = creditor.lastName;
      getElement<HTMLInputElement>('street').value = creditor.street;
      getElement<HTMLInputElement>('buildingNumber').value = creditor.buildingNumber;
      getElement<HTMLInputElement>('zipCode').value = creditor.zipCode;
      getElement<HTMLInputElement>('city').value = creditor.city;

      clearFieldErrors();
      showAlert('info', `Rechnungssteller aus "${file.name}" importiert. Bitte prüfen und speichern.`);
    } catch (err) {
      showAlert('error', `Import-Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      fileInput.value = '';
    }
  });

  btnExport.addEventListener('click', () => {
    const creditor = readFormCreditor();
    const jsonStr = exportCreditorToJson(creditor);
    downloadFile(jsonStr, 'Rechnungssteller.json', 'application/json;charset=utf-8');
    showAlert('info', 'Rechnungssteller.json wurde heruntergeladen.');
  });

  btnLoadSample.addEventListener('click', () => {
    getElement<HTMLInputElement>('iban').value = DEFAULT_CREDITOR.iban;
    getElement<HTMLInputElement>('firstName').value = DEFAULT_CREDITOR.firstName;
    getElement<HTMLInputElement>('lastName').value = DEFAULT_CREDITOR.lastName;
    getElement<HTMLInputElement>('street').value = DEFAULT_CREDITOR.street;
    getElement<HTMLInputElement>('buildingNumber').value = DEFAULT_CREDITOR.buildingNumber;
    getElement<HTMLInputElement>('zipCode').value = DEFAULT_CREDITOR.zipCode;
    getElement<HTMLInputElement>('city').value = DEFAULT_CREDITOR.city;

    clearFieldErrors();
    showAlert('info', 'Beispieldaten geladen. Bitte prüfen und speichern.');
  });

  btnReset.addEventListener('click', () => {
    if (window.confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
      populateForm(DEFAULT_APP_SETTINGS);
      clearFieldErrors();
      showAlert('info', 'Standardwerte wiederhergestellt. Bitte mit "Einstellungen speichern" bestätigen.');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOptionsPage);
} else {
  initOptionsPage();
}
