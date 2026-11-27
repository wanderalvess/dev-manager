import { inflateRawSync } from 'zlib';

/**
 * O instalador do WSH (IzPack) guarda o `winthor-integracao-core.jar` como um fluxo de entradas zip sem diretório
 * central válido (os deslocamentos dele não batem), então nem o `jar` do Java nem um leitor zip comum abrem o arquivo.
 * Aqui as entradas são lidas em sequência, cada CRC é conferido e o diretório central é refeito.
 */

const LOCAL_SIG = 0x04034b50;
const DESCRIPTOR_SIG = 0x08074b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface PackEntry {
  name: string;
  offset: number;
  flag: number;
  method: number;
  time: number;
  date: number;
  crc: number;
  compressedSize: number;
  size: number;
}

export interface RebuiltJar {
  jar: Buffer;
  entries: number;
  /** Conteúdo de alguns arquivos úteis, lidos durante a varredura (sem reabrir o jar) */
  files: Record<string, Buffer>;
}

/** Arquivos do jar que a atualização lê para mostrar a versão e o que o WSH exige do WTA. */
export const WSH_JAR_WATCHED_FILES = ['META-INF/MANIFEST.MF', 'BOOT-INF/classes/dependencies.json'];

function readEntry(pack: Buffer, pos: number, keep: (name: string) => boolean): { entry: PackEntry; end: number; data?: Buffer } {
  const flag = pack.readUInt16LE(pos + 6);
  const method = pack.readUInt16LE(pos + 8);
  const time = pack.readUInt16LE(pos + 10);
  const date = pack.readUInt16LE(pos + 12);
  let crc = pack.readUInt32LE(pos + 14);
  let compressedSize = pack.readUInt32LE(pos + 18);
  let size = pack.readUInt32LE(pos + 22);
  const nameLen = pack.readUInt16LE(pos + 26);
  const extraLen = pack.readUInt16LE(pos + 28);
  const name = pack.toString('utf8', pos + 30, pos + 30 + nameLen);
  const start = pos + 30 + nameLen + extraLen;
  let end: number;
  let data: Buffer;

  if (flag & 0x08) {
    // Tamanhos só vêm depois dos dados: a posição do fim é a do fim do fluxo deflate
    if (method !== 8) throw new Error(`Entrada "${name}" sem tamanho e sem compressão não é suportada.`);
    const r = inflateRawSync(pack.subarray(start), { info: true } as never) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    data = r.buffer;
    compressedSize = r.engine.bytesWritten;
    end = start + compressedSize;
    if (pack.readUInt32LE(end) === DESCRIPTOR_SIG) end += 4;
    crc = pack.readUInt32LE(end);
    end += 12;
    size = data.length;
  } else {
    const raw = pack.subarray(start, start + compressedSize);
    data = method === 0 ? raw : inflateRawSync(raw);
    end = start + compressedSize;
  }

  if (data.length !== size) throw new Error(`Entrada "${name}": tamanho diferente do informado.`);
  if (size > 0 && crc32(data) !== crc) throw new Error(`Entrada "${name}": CRC não confere (o instalador pode estar corrompido).`);
  return { entry: { name, offset: pos, flag, method, time, date, crc, compressedSize, size }, end, data: keep(name) ? Buffer.from(data) : undefined };
}

function centralRecord(e: PackEntry): Buffer {
  const name = Buffer.from(e.name, 'utf8');
  const b = Buffer.alloc(46 + name.length);
  b.writeUInt32LE(CENTRAL_SIG, 0);
  b.writeUInt16LE(0x031e, 4); // criado em Unix, zip 3.0
  b.writeUInt16LE(20, 6);
  b.writeUInt16LE(e.flag, 8);
  b.writeUInt16LE(e.method, 10);
  b.writeUInt16LE(e.time, 12);
  b.writeUInt16LE(e.date, 14);
  b.writeUInt32LE(e.crc, 16);
  b.writeUInt32LE(e.compressedSize, 20);
  b.writeUInt32LE(e.size, 24);
  b.writeUInt16LE(name.length, 28);
  b.writeUInt32LE(e.name.endsWith('/') ? 0x10 : 0, 38);
  b.writeUInt32LE(e.offset, 42);
  name.copy(b, 46);
  return b;
}

/** Lê o pack do IzPack e devolve um jar válido, com as entradas originais intactas e o diretório central novo. */
export function rebuildJarFromPack(pack: Buffer, watched: string[] = WSH_JAR_WATCHED_FILES): RebuiltJar {
  const files: Record<string, Buffer> = {};
  const entries: PackEntry[] = [];
  let pos = 0;
  while (pos + 30 <= pack.length && pack.readUInt32LE(pos) === LOCAL_SIG) {
    const { entry, end, data } = readEntry(pack, pos, (n) => watched.includes(n));
    entries.push(entry);
    if (data) files[entry.name] = data;
    pos = end;
  }
  if (!entries.length) throw new Error('O pacote do instalador não tem entradas zip.');
  if (!entries.some((e) => e.name === 'META-INF/MANIFEST.MF')) throw new Error('O pacote não é um jar (sem META-INF/MANIFEST.MF).');

  const central = Buffer.concat(entries.map(centralRecord));
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_SIG, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(pos, 16);
  return { jar: Buffer.concat([pack.subarray(0, pos), central, end]), entries: entries.length, files };
}
