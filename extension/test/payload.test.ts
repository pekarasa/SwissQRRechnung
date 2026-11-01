import { describe, it, expect } from 'vitest';
import { buildSwissQrPayload } from '../src/pdf/payload.js';
import type { Client, CreditorConfig } from '../src/core/types.js';

describe('swiss qr payload', () => {
  const creditor: CreditorConfig = {
    iban: 'CH5691006ZN0KQ3CKLIB8',
    firstName: 'Peter',
    lastName: 'Portmann',
    street: 'Silandro',
    buildingNumber: '2',
    zipCode: '4450',
    city: 'Sissach',
  };

  const client: Client = {
    clientNumber: '181',
    salutation: 'Frau',
    firstName: 'Sandra',
    lastName: 'Meier',
    streetAndNumber: 'Hauptstrasse 43',
    street: 'Hauptstrasse',
    buildingNumber: '43',
    zipCode: '4450',
    city: 'Sissach',
    matchName: 'Meier, Frau Sandra',
  };

  it('builds standard SIX QR payload with 32 CRLF lines', () => {
    const payload = buildSwissQrPayload(creditor, client, 48.0);
    const lines = payload.split('\r\n');

    expect(lines).toHaveLength(32);

    // Header
    expect(lines[0]).toBe('SPC');
    expect(lines[1]).toBe('0200');
    expect(lines[2]).toBe('1');

    // Creditor
    expect(lines[3]).toBe('CH5691006ZN0KQ3CKLIB8');
    expect(lines[4]).toBe('S');
    expect(lines[5]).toBe('Peter Portmann');
    expect(lines[6]).toBe('Silandro');
    expect(lines[7]).toBe('2');
    expect(lines[8]).toBe('4450');
    expect(lines[9]).toBe('Sissach');
    expect(lines[10]).toBe('CH');

    // Payment
    expect(lines[18]).toBe('48.00');
    expect(lines[19]).toBe('CHF');

    // Debtor
    expect(lines[20]).toBe('S');
    expect(lines[21]).toBe('Sandra Meier');
    expect(lines[22]).toBe('Hauptstrasse');
    expect(lines[23]).toBe('43');
    expect(lines[24]).toBe('4450');
    expect(lines[25]).toBe('Sissach');
    expect(lines[26]).toBe('CH');

    // Reference & Message & Trailer
    expect(lines[27]).toBe('NON');
    expect(lines[28]).toBe('');
    expect(lines[29]).toBe('');
    expect(lines[30]).toBe('EPD');
    expect(lines[31]).toBe('Klientenanteil Spitex');
  });
});
