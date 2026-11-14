/**
 * Mapping of Windows-1252 specific byte values (0x80 to 0x9F) to Unicode code points.
 */
const CP1252_EXTRA_MAP: ReadonlyMap<number, number> = new Map([
  [0x20ac, 0x80], // €
  [0x201a, 0x82], // ‚
  [0x0192, 0x83], // ƒ
  [0x201e, 0x84], // „
  [0x2026, 0x85], // …
  [0x2020, 0x86], // †
  [0x2021, 0x87], // ‡
  [0x02c6, 0x88], // ˆ
  [0x2030, 0x89], // ‰
  [0x0160, 0x8a], // Š
  [0x2039, 0x8b], // ‹
  [0x0152, 0x8c], // Œ
  [0x017d, 0x8e], // Ž
  [0x2018, 0x91], // ‘
  [0x2019, 0x92], // ’
  [0x201c, 0x93], // “
  [0x201d, 0x94], // ”
  [0x2022, 0x95], // •
  [0x2013, 0x96], // –
  [0x2014, 0x97], // —
  [0x02dc, 0x98], // ˜
  [0x2122, 0x99], // ™
  [0x0161, 0x9a], // š
  [0x203a, 0x9b], // ›
  [0x0153, 0x9c], // œ
  [0x017e, 0x9e], // ž
  [0x0178, 0x9f], // Ÿ
]);

/**
 * Detects whether the input bytes are UTF-8 or Windows-1252.
 */
export function detectEncoding(bytes: Uint8Array): 'utf-8' | 'windows-1252' {
  // UTF-8 BOM check
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    return 'windows-1252';
  }
}

/**
 * Decodes bytes automatically by detecting UTF-8 vs Windows-1252.
 */
export function decodeAuto(bytes: Uint8Array): string {
  // If UTF-8 BOM is present, skip it and decode UTF-8
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return decodeCp1252(bytes);
  }
}

/**
 * Decodes bytes explicitly as Windows-1252.
 */
export function decodeCp1252(bytes: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(bytes);
}

/**
 * Encodes a JavaScript string to Windows-1252 / CP1252 bytes.
 * Characters outside the CP1252 character set are replaced with '?' (0x3F).
 */
export function encodeCp1252(text: string): Uint8Array {
  const result = new Uint8Array(text.length);

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code <= 0x7f) {
      result[i] = code;
    } else if (code >= 0xa0 && code <= 0xff) {
      result[i] = code;
    } else {
      const mapped = CP1252_EXTRA_MAP.get(code);
      result[i] = mapped !== undefined ? mapped : 0x3f;
    }
  }

  return result;
}
