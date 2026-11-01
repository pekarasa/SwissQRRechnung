import type { Client, Invoice, MergedRecord, MergeResult } from './types.js';

/**
 * Performs an inner join between invoices and clients using their MatchName ("Nachname, Anrede Vorname").
 * Preserves the original order of the invoices (left table).
 *
 * Does not throw on unmatched entries; instead returns both matched and unmatched records
 * so the caller or UI can present clear, actionable error/warning messages.
 */
export function mergeInvoicesWithClients(invoices: Invoice[], clients: Client[]): MergeResult {
  const clientMap = new Map<string, Client>();
  for (const client of clients) {
    if (client.matchName && !clientMap.has(client.matchName)) {
      clientMap.set(client.matchName, client);
    }
  }

  const matched: MergedRecord[] = [];
  const unmatchedInvoices: Invoice[] = [];

  for (const invoice of invoices) {
    const client = clientMap.get(invoice.matchName);
    if (client) {
      matched.push({ invoice, client });
    } else {
      unmatchedInvoices.push(invoice);
    }
  }

  return {
    matched,
    unmatchedInvoices,
  };
}
