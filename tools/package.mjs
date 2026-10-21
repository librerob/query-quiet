// Small, deterministic ZIP writer using only Node's standard library.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const RUNTIME_FILES = ['manifest.json', 'background.js', 'rules.js', 'options.html', 'options.js', 'options.css', 'LICENSE'];
export const ROOT = new URL('../', import.meta.url);
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

export async function buildPackage() {
  const local = [], central = [];
  let offset = 0, unpacked = 0;
  for (const file of RUNTIME_FILES) {
    const name = Buffer.from(file), data = await readFile(new URL(file, ROOT));
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8); // Deflate.
    header.writeUInt16LE(33, 12); // 1980-01-01; deterministic ZIP timestamp.
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + compressed.length;
    unpacked += data.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(RUNTIME_FILES.length, 8);
  end.writeUInt16LE(RUNTIME_FILES.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...local, directory, end]);
  if (unpacked >= 100000 || zip.length >= 100000) throw new Error('Package exceeds the 100 KB limit.');
  await mkdir(new URL('dist/', ROOT), { recursive: true });
  const target = new URL('dist/query-quiet-1.0.0.zip', ROOT);
  await writeFile(target, zip);
  return { file: fileURLToPath(target), files: RUNTIME_FILES.length, unpackedBytes: unpacked, zipBytes: zip.length };
}

if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await buildPackage(), null, 2));
}
