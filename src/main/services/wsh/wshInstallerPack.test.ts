import { deflateRawSync } from 'zlib';
import { describe, expect, it } from 'vitest';
import { crc32, rebuildJarFromPack } from './wshInstallerPack';

/** Entrada zip no estilo do pack do IzPack: com descritor de dados (deflate) ou guardada (stored). */
function localEntry(name: string, content: string, mode: 'descriptor' | 'stored'): Buffer {
  const data = Buffer.from(content);
  const nameBuf = Buffer.from(name);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4);
  head.writeUInt16LE(mode === 'descriptor' ? 0x08 : 0, 6);
  head.writeUInt16LE(mode === 'descriptor' ? 8 : 0, 8);
  head.writeUInt16LE(nameBuf.length, 26);
  if (mode === 'stored') {
    head.writeUInt32LE(crc32(data), 14);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(data.length, 22);
    return Buffer.concat([head, nameBuf, data]);
  }
  const compressed = deflateRawSync(data);
  const desc = Buffer.alloc(16);
  desc.writeUInt32LE(0x08074b50, 0);
  desc.writeUInt32LE(crc32(data), 4);
  desc.writeUInt32LE(compressed.length, 8);
  desc.writeUInt32LE(data.length, 12);
  return Buffer.concat([head, nameBuf, compressed, desc]);
}

const packOf = (...entries: Buffer[]) => Buffer.concat([...entries, Buffer.from('PK\x01\x02diretorio-central-quebrado'), Buffer.alloc(40, 7)]);

describe('rebuildJarFromPack', () => {
  it('calcula o CRC32 como o zip', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it('lê as entradas em sequência, guarda os arquivos de interesse e refaz o diretório central', () => {
    const manifest = 'Manifest-Version: 1.0\nImplementation-Version: 1.39.22.31\n';
    const pack = packOf(
      localEntry('META-INF/', '', 'stored'),
      localEntry('META-INF/MANIFEST.MF', manifest, 'descriptor'),
      localEntry('BOOT-INF/lib/a.jar', 'conteudo-do-jar-aninhado', 'stored'),
      localEntry('BOOT-INF/classes/dependencies.json', '[{"service":"x","version":"1"}]', 'descriptor')
    );
    const r = rebuildJarFromPack(pack);
    expect(r.entries).toBe(4);
    expect(r.files['META-INF/MANIFEST.MF'].toString()).toBe(manifest);
    expect(r.files['BOOT-INF/classes/dependencies.json'].toString()).toContain('"service"');

    const end = r.jar.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    expect(r.jar.readUInt16LE(end + 10)).toBe(4);
    const centralSize = r.jar.readUInt32LE(end + 12);
    const centralOffset = r.jar.readUInt32LE(end + 16);
    expect(centralOffset + centralSize).toBe(end);
    // Cada registro do diretório central aponta para um cabeçalho local de verdade
    let pos = centralOffset;
    for (let i = 0; i < 4; i++) {
      expect(r.jar.readUInt32LE(pos)).toBe(0x02014b50);
      expect(r.jar.readUInt32LE(r.jar.readUInt32LE(pos + 42))).toBe(0x04034b50);
      pos += 46 + r.jar.readUInt16LE(pos + 28);
    }
    // O lixo depois das entradas (o diretório quebrado e o resto) não entra no jar
    expect(r.jar.includes(Buffer.from('diretorio-central-quebrado'))).toBe(false);
  });

  it('recusa entrada com CRC errado', () => {
    const bad = localEntry('META-INF/MANIFEST.MF', 'Manifest-Version: 1.0\n', 'stored');
    bad.writeUInt32LE(0xdeadbeef, 14);
    expect(() => rebuildJarFromPack(packOf(bad))).toThrow(/CRC/);
  });

  it('recusa pack que não é um jar', () => {
    expect(() => rebuildJarFromPack(packOf(localEntry('a.txt', 'oi', 'stored')))).toThrow(/não é um jar/);
    expect(() => rebuildJarFromPack(Buffer.from('nada de zip aqui, só texto qualquer com mais de trinta bytes'))).toThrow(/não tem entradas/);
  });
});
