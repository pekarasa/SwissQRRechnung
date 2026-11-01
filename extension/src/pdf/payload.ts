import type { Client, CreditorConfig } from '../core/types.js';

/**
 * Builds the standard SIX Swiss QR Bill payload text according to the
 * Swiss Implementation Guidelines for the QR-bill (v2.2 / v2.3).
 *
 * Uses CRLF ("\r\n") line endings as mandated by the SIX specification.
 */
export function buildSwissQrPayload(
  creditor: CreditorConfig,
  client: Client,
  amount: number,
  currency = 'CHF',
  unstructuredMessage = 'Klientenanteil Spitex',
): string {
  const lines: string[] = [
    'SPC', // Swiss Payments Code
    '0200', // Version 2.0
    '1', // Coding Type 1 (UTF-8)
    creditor.iban.replace(/\s+/g, ''), // Creditor Account (IBAN)
    'S', // Creditor Address Type (Structured)
    `${creditor.firstName} ${creditor.lastName}`.trim(), // Creditor Name
    creditor.street.trim(), // Creditor Street
    creditor.buildingNumber ? creditor.buildingNumber.trim() : '', // Creditor Building Number
    creditor.zipCode.trim(), // Creditor Postal Code
    creditor.city.trim(), // Creditor City
    'CH', // Creditor Country
    '', // Ultimate Creditor: Address Type
    '', // Ultimate Creditor: Name
    '', // Ultimate Creditor: Street
    '', // Ultimate Creditor: Building Number
    '', // Ultimate Creditor: Postal Code
    '', // Ultimate Creditor: City
    '', // Ultimate Creditor: Country
    amount.toFixed(2), // Payment Amount
    currency, // Currency (CHF)
    'S', // Ultimate Debtor: Address Type (Structured)
    `${client.firstName} ${client.lastName}`.trim(), // Debtor Name
    client.street.trim(), // Debtor Street
    client.buildingNumber ? client.buildingNumber.trim() : '', // Debtor Building Number
    client.zipCode.trim(), // Debtor Postal Code
    client.city.trim(), // Debtor City
    'CH', // Debtor Country
    'NON', // Reference Type: Without reference
    '', // Reference
    '', // Unstructured Message (empty when provided after EPD as bill info)
    'EPD', // Trailer: End of Payment Data
    unstructuredMessage, // Bill Information / Additional Information
  ];

  return lines.join('\r\n');
}
