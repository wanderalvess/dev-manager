import { describe, it, expect } from 'vitest';
import { parsePeVersionFromBuffer, formatVersionNumbers } from './peVersionUtils';

describe('peVersionUtils', () => {
  it('formata números de versão adequadamente', () => {
    expect(formatVersionNumbers(30, 0, 12, 3)).toBe('30.0.12.3');
    expect(formatVersionNumbers(30, 0, 12, 0)).toBe('30.0.12');
    expect(formatVersionNumbers(30, 0, 0, 0)).toBe('30.0');
  });

  it('retorna null para buffer vazio ou muito curto', () => {
    expect(parsePeVersionFromBuffer(Buffer.alloc(0))).toBeNull();
    expect(parsePeVersionFromBuffer(Buffer.alloc(20))).toBeNull();
  });

  it('extrai versão numérica de um struct VS_FIXEDFILEINFO sintético', () => {
    // Monta um buffer com cabeçalho contendo a assinatura 0xFEEF04BD
    const buf = Buffer.alloc(128);
    const sigPos = 32;

    // Assinatura: 0xBD, 0x04, 0xEF, 0xFE
    buf[sigPos] = 0xbd;
    buf[sigPos + 1] = 0x04;
    buf[sigPos + 2] = 0xef;
    buf[sigPos + 3] = 0xfe;

    // dwFileVersionMS: Major 30, Minor 1 (0x001E0001)
    const fileVerMS = (30 << 16) | 1;
    buf.writeUInt32LE(fileVerMS, sigPos + 8);

    // dwFileVersionLS: Build 15, Rev 4 (0x000F0004)
    const fileVerLS = (15 << 16) | 4;
    buf.writeUInt32LE(fileVerLS, sigPos + 12);

    // dwProductVersionMS: Major 30, Minor 0
    const prodVerMS = (30 << 16) | 0;
    buf.writeUInt32LE(prodVerMS, sigPos + 16);

    // dwProductVersionLS: Build 0, Rev 0
    buf.writeUInt32LE(0, sigPos + 20);

    const res = parsePeVersionFromBuffer(buf);
    expect(res).not.toBeNull();
    expect(res?.fileVersion).toBe('30.1.15.4');
    expect(res?.productVersion).toBe('30.0');
  });

  it('extrai propriedades de StringFileInfo em UTF-16LE', () => {
    const key = Buffer.from('FileVersion\0', 'utf16le');
    const val = Buffer.from('30.0.22.100\0', 'utf16le');

    const totalLen = 64 + key.length + val.length + 32;
    const buf = Buffer.alloc(totalLen);

    const startPos = 16;
    key.copy(buf, startPos);

    const afterKey = startPos + key.length;
    const valPos = (afterKey + 3) & ~3;
    val.copy(buf, valPos);

    const res = parsePeVersionFromBuffer(buf);
    expect(res).not.toBeNull();
    expect(res?.fileVersion).toBe('30.0.22.100');
  });
});
