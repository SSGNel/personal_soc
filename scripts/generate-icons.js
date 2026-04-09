#!/usr/bin/env node
// Generates minimal valid PNG and ICO icon files for Tauri
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 'ascii');
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return buf;
}

function createPNG(w, h, r, g, b, alpha) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0); ihdrData.writeUInt32BE(h, 4);
  ihdrData.writeUInt8(8, 8);
  const useAlpha = alpha !== undefined;
  ihdrData.writeUInt8(useAlpha ? 6 : 2, 9); // 6=RGBA, 2=RGB
  const channels = useAlpha ? 4 : 3;
  const rowSize = 1 + w * channels;
  const raw = Buffer.alloc(h * rowSize);
  for (let y = 0; y < h; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * rowSize + 1 + x * channels;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
      if (useAlpha) raw[o + 3] = alpha;
    }
  }
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createICO(size, r, g, b) {
  // BMP-based ICO (compatible with winresource/rc.exe)
  const rowBytes = size * 4;
  const xorSize = rowBytes * size;
  const andRowBytes = Math.ceil(size / 8 / 4) * 4; // AND mask rows padded to DWORD
  const andSize = andRowBytes * size;
  const infoSize = 40;
  const totalImage = infoSize + xorSize + andSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2); entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(totalImage, 8); entry.writeUInt32LE(22, 12);

  const bmpInfo = Buffer.alloc(infoSize);
  bmpInfo.writeUInt32LE(40, 0);
  bmpInfo.writeInt32LE(size, 4);
  bmpInfo.writeInt32LE(size * 2, 8); // height * 2 for ICO
  bmpInfo.writeUInt16LE(1, 12); bmpInfo.writeUInt16LE(32, 14);
  bmpInfo.writeUInt32LE(0, 16); bmpInfo.writeUInt32LE(xorSize, 20);

  // XOR data: BGRA pixels, bottom-to-top
  const xor = Buffer.alloc(xorSize);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = y * rowBytes + x * 4;
      xor[o] = b; xor[o + 1] = g; xor[o + 2] = r; xor[o + 3] = 255;
    }
  }

  const andMask = Buffer.alloc(andSize, 0); // all opaque

  return Buffer.concat([header, entry, bmpInfo, xor, andMask]);
}

const OUT = 'apps/tauri-shell/src-tauri/icons';
fs.mkdirSync(OUT, { recursive: true });

const R = 0x3b, G = 0x82, B = 0xf6; // #3b82f6 blue

fs.writeFileSync(`${OUT}/32x32.png`, createPNG(32, 32, R, G, B, 255));
fs.writeFileSync(`${OUT}/128x128.png`, createPNG(128, 128, R, G, B, 255));
fs.writeFileSync(`${OUT}/128x128@2x.png`, createPNG(256, 256, R, G, B, 255));
fs.writeFileSync(`${OUT}/tray-icon.png`, createPNG(32, 32, R, G, B, 255));
fs.writeFileSync(`${OUT}/icon.ico`, createICO(32, R, G, B));
fs.writeFileSync(`${OUT}/icon.icns`, Buffer.alloc(0)); // placeholder, not needed on Windows

console.log('Icons generated successfully.');
