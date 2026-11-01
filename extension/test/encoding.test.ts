import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectEncoding,
  decodeAuto,
  decodeCp1252,
  encodeCp1252,
} from '../src/core/encoding.js';

describe('encoding', () => {
  it('detects UTF-8 with BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x61, 0x6c, 0x6c, 0x6f]);
    expect(detectEncoding(bytes)).toBe('utf-8');
  });

  it('detects UTF-8 with umlauts', () => {
    const bytes = new TextEncoder().encode('Zürich & Köln & Knüsel');
    expect(detectEncoding(bytes)).toBe('utf-8');
  });

  it('detects Windows-1252 when invalid UTF-8 bytes occur', () => {
    // 0xe4 is 'ä' in cp1252
    const bytes = new Uint8Array([0x4b, 0xf6, 0x68, 0x6c, 0x65, 0x72]); // "Köhler"
    expect(detectEncoding(bytes)).toBe('windows-1252');
  });

  it('decodes UTF-8 automatically (with and without BOM)', () => {
    const textWithBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Grüezi')]);
    expect(decodeAuto(textWithBom)).toBe('Grüezi');

    const textWithoutBom = new TextEncoder().encode('Detaillierte Rechnungsbeträge');
    expect(decodeAuto(textWithoutBom)).toBe('Detaillierte Rechnungsbeträge');
  });

  it('decodes Windows-1252 automatically and explicitly', () => {
    // "Köhler & Knüsel" in cp1252
    const cp1252Bytes = new Uint8Array([
      0x4b, 0xf6, 0x68, 0x6c, 0x65, 0x72, 0x20, 0x26, 0x20, 0x4b, 0x6e, 0xfc, 0x73, 0x65, 0x6c,
    ]);
    expect(decodeAuto(cp1252Bytes)).toBe('Köhler & Knüsel');
    expect(decodeCp1252(cp1252Bytes)).toBe('Köhler & Knüsel');
  });

  it('encodes cp1252 correctly including umlauts and special characters', () => {
    const text = 'Äöü € – 48.00 CHF';
    const encoded = encodeCp1252(text);
    const decoded = decodeCp1252(encoded);
    expect(decoded).toBe(text);
  });

  it('replaces unmapped characters with question mark', () => {
    const text = 'Test \u0410\u0411\u0412'; // Cyrillic letters
    const encoded = encodeCp1252(text);
    expect(decodeCp1252(encoded)).toBe('Test ???');
  });

  it('preserves exact byte representation for QR-Rechnungen.csv fixture', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'QR-Rechnungen.csv');
    const originalBytes = fs.readFileSync(fixturePath);
    const decoded = decodeCp1252(originalBytes);
    const reEncoded = encodeCp1252(decoded);

    expect(Buffer.from(reEncoded).equals(originalBytes)).toBe(true);
  });
});
