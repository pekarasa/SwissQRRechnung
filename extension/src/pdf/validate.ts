import { isIBANValid } from 'swissqrbill/utils';
import type { CreditorConfig, MergedRecord } from '../core/types.js';

/**
 * Validates creditor configuration according to SIX Swiss QR Bill standards.
 * Throws human-readable German error messages on validation failure.
 */
export function validateCreditor(creditor: CreditorConfig): void {
  const cleanIban = creditor.iban.replace(/\s+/g, '');
  if (!cleanIban) {
    throw new Error('IBAN des Rechnungsstellers fehlt.');
  }

  if (!isIBANValid(cleanIban)) {
    throw new Error(`Ungültige IBAN "${creditor.iban}". Bitte eine gültige Schweizer IBAN angeben.`);
  }

  const name = `${creditor.firstName} ${creditor.lastName}`.trim();
  if (!name) {
    throw new Error('Name des Rechnungsstellers (Vorname und/oder Nachname) darf nicht leer sein.');
  }
  if (name.length > 70) {
    throw new Error(`Name des Rechnungsstellers überschreitet die Maximallänge von 70 Zeichen: "${name}"`);
  }

  if (!creditor.street.trim()) {
    throw new Error('Strasse des Rechnungsstellers darf nicht leer sein.');
  }
  if (creditor.street.trim().length > 70) {
    throw new Error(`Strasse des Rechnungsstellers überschreitet 70 Zeichen: "${creditor.street}"`);
  }

  if (creditor.buildingNumber && creditor.buildingNumber.trim().length > 16) {
    throw new Error(`Hausnummer des Rechnungsstellers überschreitet 16 Zeichen: "${creditor.buildingNumber}"`);
  }

  if (!creditor.zipCode.trim()) {
    throw new Error('PLZ des Rechnungsstellers darf nicht leer sein.');
  }
  if (creditor.zipCode.trim().length > 16) {
    throw new Error(`PLZ des Rechnungsstellers überschreitet 16 Zeichen: "${creditor.zipCode}"`);
  }

  if (!creditor.city.trim()) {
    throw new Error('Ort des Rechnungsstellers darf nicht leer sein.');
  }
  if (creditor.city.trim().length > 35) {
    throw new Error(`Ort des Rechnungsstellers überschreitet 35 Zeichen: "${creditor.city}"`);
  }
}

/**
 * Validates a merged invoice/client record according to SIX Swiss QR Bill standards.
 */
export function validateMergedRecord(record: MergedRecord): void {
  const { invoice, client } = record;

  if (invoice.amount <= 0 || Number.isNaN(invoice.amount) || !Number.isFinite(invoice.amount)) {
    throw new Error(
      `Ungültiger Rechnungsbetrag "${invoice.amountFormatted}" für Klient "${client.matchName}". Der Betrag muss grösser als 0 sein.`,
    );
  }

  const debtorName = `${client.firstName} ${client.lastName}`.trim();
  if (!debtorName) {
    throw new Error(`Name für Klient "${client.matchName}" darf nicht leer sein.`);
  }
  if (debtorName.length > 70) {
    throw new Error(`Klientenname überschreitet 70 Zeichen: "${debtorName}"`);
  }

  if (!client.street.trim()) {
    throw new Error(`Strasse für Klient "${client.matchName}" darf nicht leer sein.`);
  }
  if (client.street.trim().length > 70) {
    throw new Error(`Strasse für Klient "${client.matchName}" überschreitet 70 Zeichen: "${client.street}"`);
  }

  if (client.buildingNumber && client.buildingNumber.trim().length > 16) {
    throw new Error(
      `Hausnummer für Klient "${client.matchName}" überschreitet 16 Zeichen: "${client.buildingNumber}"`,
    );
  }

  if (!client.zipCode.trim()) {
    throw new Error(`PLZ für Klient "${client.matchName}" darf nicht leer sein.`);
  }
  if (client.zipCode.trim().length > 16) {
    throw new Error(`PLZ für Klient "${client.matchName}" überschreitet 16 Zeichen: "${client.zipCode}"`);
  }

  if (!client.city.trim()) {
    throw new Error(`Ort für Klient "${client.matchName}" darf nicht leer sein.`);
  }
  if (client.city.trim().length > 35) {
    throw new Error(`Ort für Klient "${client.matchName}" überschreitet 35 Zeichen: "${client.city}"`);
  }
}

/**
 * Validates the full set of records and creditor before PDF generation.
 */
export function validateForPdfGeneration(records: MergedRecord[], creditor: CreditorConfig): void {
  if (records.length === 0) {
    throw new Error('Keine Rechnungsdatensätze für die PDF-Erstellung vorhanden.');
  }

  validateCreditor(creditor);

  for (const record of records) {
    validateMergedRecord(record);
  }
}
