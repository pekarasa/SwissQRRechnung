import { describe, it, expect } from 'vitest';
import { mergeInvoicesWithClients } from '../src/core/merge.js';
import type { Client, Invoice } from '../src/core/types.js';

describe('mergeInvoicesWithClients', () => {
  const dummyClients: Client[] = [
    {
      clientNumber: '1',
      salutation: 'Frau',
      firstName: 'Sandra',
      lastName: 'Meier',
      streetAndNumber: 'Hauptstrasse 43',
      street: 'Hauptstrasse',
      buildingNumber: '43',
      zipCode: '4450',
      city: 'Sissach',
      matchName: 'Meier, Frau Sandra',
    },
    {
      clientNumber: '2',
      salutation: 'Herr',
      firstName: 'Walter',
      lastName: 'Steiner',
      streetAndNumber: 'Köhlerweg 9',
      street: 'Köhlerweg',
      buildingNumber: '9',
      zipCode: '4450',
      city: 'Sissach',
      matchName: 'Steiner, Herr Walter',
    },
  ];

  it('matches all invoices and preserves invoice order', () => {
    const invoices: Invoice[] = [
      { matchName: 'Steiner, Herr Walter', amount: 13.4, amountFormatted: '13.40' },
      { matchName: 'Meier, Frau Sandra', amount: 48, amountFormatted: '48.00' },
    ];

    const result = mergeInvoicesWithClients(invoices, dummyClients);
    expect(result.matched).toHaveLength(2);
    expect(result.unmatchedInvoices).toHaveLength(0);

    expect(result.matched[0]?.invoice.matchName).toBe('Steiner, Herr Walter');
    expect(result.matched[0]?.client.clientNumber).toBe('2');

    expect(result.matched[1]?.invoice.matchName).toBe('Meier, Frau Sandra');
    expect(result.matched[1]?.client.clientNumber).toBe('1');
  });

  it('reports unmatched invoices when client master data is missing', () => {
    const invoices: Invoice[] = [
      { matchName: 'Meier, Frau Sandra', amount: 48, amountFormatted: '48.00' },
      { matchName: 'Unbekannt, Herr Hans', amount: 99, amountFormatted: '99.00' },
    ];

    const result = mergeInvoicesWithClients(invoices, dummyClients);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.client.firstName).toBe('Sandra');

    expect(result.unmatchedInvoices).toHaveLength(1);
    expect(result.unmatchedInvoices[0]?.matchName).toBe('Unbekannt, Herr Hans');
  });

  it('handles empty inputs gracefully', () => {
    expect(mergeInvoicesWithClients([], dummyClients)).toEqual({
      matched: [],
      unmatchedInvoices: [],
    });

    const invoices: Invoice[] = [
      { matchName: 'Meier, Frau Sandra', amount: 48, amountFormatted: '48.00' },
    ];
    expect(mergeInvoicesWithClients(invoices, [])).toEqual({
      matched: [],
      unmatchedInvoices: invoices,
    });
  });
});
