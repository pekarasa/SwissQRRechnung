import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([lenBuf, crcData, crcBuf]);
}

function renderIconPng(size) {
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);

  const red = [213, 43, 30, 255]; // Swiss Red #d52b1e
  const white = [255, 255, 255, 255]; // White #ffffff
  const cornerRadius = Math.max(2, Math.round(size * 0.18));

  const center = size / 2;
  const armLen = size * 0.32;
  const armThickness = size * 0.12;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = Math.max(0, Math.max(cornerRadius - x, x - (size - 1 - cornerRadius)));
      const dy = Math.max(0, Math.max(cornerRadius - y, y - (size - 1 - cornerRadius)));
      const isInsideCard = dx * dx + dy * dy <= cornerRadius * cornerRadius;

      if (!isInsideCard) {
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
        continue;
      }

      const distFromCenterX = Math.abs(x + 0.5 - center);
      const distFromCenterY = Math.abs(y + 0.5 - center);

      const inHorizBar = distFromCenterX <= armLen && distFromCenterY <= armThickness;
      const inVertBar = distFromCenterY <= armLen && distFromCenterX <= armThickness;

      const color = inHorizBar || inVertBar ? white : red;

      raw[pxOffset] = color[0];
      raw[pxOffset + 1] = color[1];
      raw[pxOffset + 2] = color[2];
      raw[pxOffset + 3] = color[3];
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createPngChunk('IHDR', ihdr);

  const compressedData = deflateSync(raw);
  const idatChunk = createPngChunk('IDAT', compressedData);

  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = resolve(import.meta.dirname, '../icons');
mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 96, 128];
for (const s of sizes) {
  const buf = renderIconPng(s);
  const outPath = resolve(iconsDir, `icon-${s}.png`);
  writeFileSync(outPath, buf);
  console.log(`Generated icon: ${outPath} (${buf.length} bytes)`);
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="24" fill="#d52b1e"/>
  <!-- Swiss Cross -->
  <rect x="44" y="24" width="40" height="80" rx="4" fill="#ffffff"/>
  <rect x="24" y="44" width="80" height="40" rx="4" fill="#ffffff"/>
</svg>`;
writeFileSync(resolve(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('Generated icon.svg');
