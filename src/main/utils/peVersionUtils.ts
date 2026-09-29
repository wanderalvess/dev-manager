import fs from 'fs';
import { ExecutableVersionInfo } from '../../shared/types';
import { isSafeLocalPath } from './security';

/**
 * Assinatura canônica do struct VS_FIXEDFILEINFO no Windows (0xFEEF04BD em little-endian).
 */
const VS_FIXEDFILEINFO_SIGNATURE = Buffer.from([0xbd, 0x04, 0xef, 0xfe]);

/**
 * Lê uma string UTF-16LE terminada em nulo ou com comprimento específico a partir de um buffer.
 */
function readUtf16String(buffer: Buffer, offset: number, maxBytes: number = 256): string {
  const end = Math.min(buffer.length, offset + maxBytes);
  let nullPos = -1;
  for (let i = offset; i < end - 1; i += 2) {
    if (buffer[i] === 0x00 && buffer[i + 1] === 0x00) {
      nullPos = i;
      break;
    }
  }
  const sliceEnd = nullPos !== -1 ? nullPos : end;
  return buffer.toString('utf16le', offset, sliceEnd).trim();
}

/**
 * Procura um campo StringFileInfo pelo nome da chave (em UTF-16LE) e extrai seu valor.
 */
function extractStringValue(buffer: Buffer, keyName: string): string | undefined {
  const keyBuf = Buffer.from(`${keyName}\0`, 'utf16le');
  let pos = buffer.indexOf(keyBuf);
  while (pos !== -1) {
    // Logo após a chave nula, os dados do valor começam alinhados em 4 bytes (DWORD boundary)
    const afterKey = pos + keyBuf.length;
    const valueOffset = (afterKey + 3) & ~3;
    if (valueOffset + 2 <= buffer.length) {
      const val = readUtf16String(buffer, valueOffset, 200);
      if (val && !val.includes('\u0000') && val.length > 0) {
        return val;
      }
    }
    pos = buffer.indexOf(keyBuf, pos + 1);
  }
  return undefined;
}

/**
 * Formata os 4 números de versão (major, minor, build, rev) em string.
 * Se revision for 0 e build for 0, pode omitir se minor for simples, mas normalmente em WinThor
 * versões usam "30.0.12.3" ou "30.0.12".
 */
export function formatVersionNumbers(major: number, minor: number, build: number, rev: number): string {
  if (rev > 0) {
    return `${major}.${minor}.${build}.${rev}`;
  }
  if (build > 0) {
    return `${major}.${minor}.${build}`;
  }
  return `${major}.${minor}`;
}

/**
 * Extrai metadados de versão (VS_FIXEDFILEINFO e StringFileInfo) a partir de um Buffer contendo
 * os recursos de um executável Windows PE.
 */
export function parsePeVersionFromBuffer(buffer: Buffer): ExecutableVersionInfo | null {
  if (!buffer || buffer.length < 52) {
    return null;
  }

  let fixedFileVersion: string | undefined;
  let fixedProductVersion: string | undefined;

  // 1. Procurar assinatura do VS_FIXEDFILEINFO (0xFEEF04BD)
  let sigPos = buffer.indexOf(VS_FIXEDFILEINFO_SIGNATURE);
  while (sigPos !== -1) {
    if (sigPos + 52 <= buffer.length) {
      const fileVerMS = buffer.readUInt32LE(sigPos + 8);
      const fileVerLS = buffer.readUInt32LE(sigPos + 12);
      const prodVerMS = buffer.readUInt32LE(sigPos + 16);
      const prodVerLS = buffer.readUInt32LE(sigPos + 20);

      const fMajor = (fileVerMS >> 16) & 0xffff;
      const fMinor = fileVerMS & 0xffff;
      const fBuild = (fileVerLS >> 16) & 0xffff;
      const fRev = fileVerLS & 0xffff;

      const pMajor = (prodVerMS >> 16) & 0xffff;
      const pMinor = prodVerMS & 0xffff;
      const pBuild = (prodVerLS >> 16) & 0xffff;
      const pRev = prodVerLS & 0xffff;

      // Validação de sanidade: versões razoáveis não têm major absurdamente gigantesco
      if (fMajor >= 0 && fMajor < 10000 && (fMajor > 0 || fMinor > 0 || fBuild > 0 || fRev > 0)) {
        fixedFileVersion = formatVersionNumbers(fMajor, fMinor, fBuild, fRev);
      }
      if (pMajor >= 0 && pMajor < 10000 && (pMajor > 0 || pMinor > 0 || pBuild > 0 || pRev > 0)) {
        fixedProductVersion = formatVersionNumbers(pMajor, pMinor, pBuild, pRev);
      }

      if (fixedFileVersion) {
        break;
      }
    }
    sigPos = buffer.indexOf(VS_FIXEDFILEINFO_SIGNATURE, sigPos + 1);
  }

  // 2. Extrair propriedades do StringFileInfo (se presentes em UTF-16LE)
  const strFileVersion = extractStringValue(buffer, 'FileVersion');
  const strProductVersion = extractStringValue(buffer, 'ProductVersion');
  const companyName = extractStringValue(buffer, 'CompanyName');
  const fileDescription = extractStringValue(buffer, 'FileDescription');
  const legalCopyright = extractStringValue(buffer, 'LegalCopyright');
  const originalFilename = extractStringValue(buffer, 'OriginalFilename');
  const internalName = extractStringValue(buffer, 'InternalName');
  const productName = extractStringValue(buffer, 'ProductName');

  const fileVersion = strFileVersion || fixedFileVersion;
  const productVersion = strProductVersion || fixedProductVersion || fileVersion;

  if (!fileVersion && !productVersion && !companyName && !fileDescription) {
    return null;
  }

  return {
    fileVersion,
    productVersion,
    companyName,
    fileDescription,
    legalCopyright,
    originalFilename,
    internalName,
    productName
  };
}

/**
 * Lê a versão de um executável (.EXE ou .DLL ou .BAK) local no disco de forma de alto desempenho,
 * lendo apenas o cabeçalho PE e a seção .rsrc sem carregar o binário completo na memória.
 */
export function readExecutableVersion(filePath: string): ExecutableVersionInfo | null {
  try {
    if (!filePath || !isSafeLocalPath(filePath) || !fs.existsSync(filePath)) {
      return null;
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 64) {
      return null;
    }

    const fd = fs.openSync(filePath, 'r');
    try {
      // 1. Ler os primeiros 4096 bytes para inspecionar DOS Header e PE Header
      const headerSize = Math.min(stat.size, 4096);
      const headerBuf = Buffer.alloc(headerSize);
      fs.readSync(fd, headerBuf, 0, headerSize, 0);

      // Deve começar com 'MZ' (0x4D, 0x5A)
      if (headerBuf[0] !== 0x4d || headerBuf[1] !== 0x5a) {
        return null;
      }

      const peOffset = headerBuf.readUInt32LE(0x3c);
      if (peOffset + 24 > stat.size) {
        return null;
      }

      let workingBuf = headerBuf;
      if (peOffset + 1024 > headerSize) {
        // PE header fora dos primeiros 4KB, lê bloco maior
        const needed = Math.min(stat.size, peOffset + 4096);
        workingBuf = Buffer.alloc(needed);
        fs.readSync(fd, workingBuf, 0, needed, 0);
      }

      // Valida assinatura PE\0\0
      if (
        workingBuf[peOffset] !== 0x50 ||
        workingBuf[peOffset + 1] !== 0x45 ||
        workingBuf[peOffset + 2] !== 0x00 ||
        workingBuf[peOffset + 3] !== 0x00
      ) {
        return null;
      }

      const numSections = workingBuf.readUInt16LE(peOffset + 6);
      const optHeaderSize = workingBuf.readUInt16LE(peOffset + 20);
      const sectionTableOffset = peOffset + 24 + optHeaderSize;

      let rsrcRawOffset = -1;
      let rsrcRawSize = -1;

      for (let i = 0; i < numSections; i++) {
        const secOffset = sectionTableOffset + i * 40;
        if (secOffset + 40 > workingBuf.length) break;
        const secName = workingBuf.toString('ascii', secOffset, secOffset + 8).replace(/\0+$/, '');
        if (secName === '.rsrc') {
          rsrcRawSize = workingBuf.readUInt32LE(secOffset + 16);
          rsrcRawOffset = workingBuf.readUInt32LE(secOffset + 20);
          break;
        }
      }

      // Se encontrou a seção de recursos (.rsrc)
      if (rsrcRawOffset > 0 && rsrcRawSize > 0 && rsrcRawOffset + rsrcRawSize <= stat.size) {
        // Lê a seção .rsrc (limitada a 2MB para preservar memória)
        const readSize = Math.min(rsrcRawSize, 2 * 1024 * 1024);
        const rsrcBuf = Buffer.alloc(readSize);
        fs.readSync(fd, rsrcBuf, 0, readSize, rsrcRawOffset);
        const info = parsePeVersionFromBuffer(rsrcBuf);
        if (info) return info;
      }

      // Fallback: varre até 512KB do final do arquivo ou do início caso a tabela de seções seja não padrão
      const scanSize = Math.min(stat.size, 512 * 1024);
      const scanBuf = Buffer.alloc(scanSize);
      const tailOffset = Math.max(0, stat.size - scanSize);
      fs.readSync(fd, scanBuf, 0, scanSize, tailOffset);
      const tailInfo = parsePeVersionFromBuffer(scanBuf);
      if (tailInfo) return tailInfo;

      if (tailOffset > 0) {
        fs.readSync(fd, scanBuf, 0, scanSize, 0);
        return parsePeVersionFromBuffer(scanBuf);
      }

      return null;
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    console.warn(`[peVersionUtils] Falha ao ler versão do executável ${filePath}:`, err);
    return null;
  }
}
