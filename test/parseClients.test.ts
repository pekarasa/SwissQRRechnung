import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseClients, buildClientMatchName } from '../src/core/parseClients.js';

describe('parseClients', () => {
  it('parses client master data from fixture file', () => {
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls',
    );
    const buffer = fs.readFileSync(fixturePath);
    const clients = parseClients(buffer);

    // Expect 4 clients, excluding non-clients AA_Administration and AA_Auslagen
    expect(clients).toHaveLength(4);

    const meier = clients.find((c) => c.clientNumber === '181');
    expect(meier).toBeDefined();
    expect(meier).toEqual({
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
    });

    const steiner = clients.find((c) => c.clientNumber === '182');
    expect(steiner).toBeDefined();
    expect(steiner).toEqual({
      clientNumber: '182',
      salutation: 'Herr',
      firstName: 'Walter',
      lastName: 'Steiner',
      streetAndNumber: 'Köhlerweg 9',
      street: 'Köhlerweg',
      buildingNumber: '9',
      zipCode: '4450',
      city: 'Sissach',
      matchName: 'Steiner, Herr Walter',
    });

    const knuesel = clients.find((c) => c.clientNumber === '184');
    expect(knuesel).toBeDefined();
    expect(knuesel?.matchName).toBe('Knüsel, Herr Bruno');
    expect(knuesel?.street).toBe('Hauptstrasse');
    expect(knuesel?.buildingNumber).toBe('57');
    expect(knuesel?.zipCode).toBe('4460');

    const wagner = clients.find((c) => c.clientNumber === '183');
    expect(wagner).toBeDefined();
    expect(wagner?.matchName).toBe('Wagner, Frau Carmen');
    expect(wagner?.street).toBe('Himmelrain');
    expect(wagner?.buildingNumber).toBe('34a');
    expect(wagner?.zipCode).toBe('4450');
  });

  it('builds match names correctly', () => {
    expect(buildClientMatchName('Meier', 'Frau', 'Sandra')).toBe('Meier, Frau Sandra');
    expect(buildClientMatchName('Muster', '', 'Hans')).toBe('Muster, Hans');
    expect(buildClientMatchName('Solo', '', '')).toBe('Solo');
  });

  it('returns empty array for empty buffer', () => {
    expect(parseClients(new Uint8Array(0))).toEqual([]);
  });

  it('returns empty array when file has no client data', () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(parseClients(randomBytes)).toEqual([]);
  });
});
