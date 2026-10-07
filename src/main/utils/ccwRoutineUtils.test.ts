import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import path from 'path';
import {
  normalizeRoutineTarget,
  buildCcwDownloadUrl,
  deduceModuleNumber,
  formatModuleFolderName,
  isExeBuffer,
  isZipBuffer,
  createBackupFilePath,
  extractZipBuffer,
  processRoutineDownloadBuffer
} from './ccwRoutineUtils';

describe('ccwRoutineUtils', () => {
  describe('normalizeRoutineTarget', () => {
    it('normaliza código numérico simples prefixando com PCSIS', () => {
      const res = normalizeRoutineTarget('132');
      expect(res.code).toBe('132');
      expect(res.baseName).toBe('PCSIS132');
      expect(res.fileName).toBe('PCSIS132.EXE');
    });

    it('mantém e padroniza PCSIS com números', () => {
      const res = normalizeRoutineTarget('pcsis529.exe');
      expect(res.code).toBe('529');
      expect(res.baseName).toBe('PCSIS529');
      expect(res.fileName).toBe('PCSIS529.EXE');
    });

    it('trata rotinas no formato PCxxxx', () => {
      const res = normalizeRoutineTarget('pc1406');
      expect(res.code).toBe('1406');
      expect(res.baseName).toBe('PC1406');
      expect(res.fileName).toBe('PC1406.EXE');
    });

    it('trata PCINFTAB como código especial 560', () => {
      const res = normalizeRoutineTarget('PCINFTAB.EXE');
      expect(res.code).toBe('560');
      expect(res.baseName).toBe('PCINFTAB');
      expect(res.fileName).toBe('PCINFTAB.EXE');
    });

    it('trata prefixos genéricos como ROTINA, ROT, SIS', () => {
      const res1 = normalizeRoutineTarget('ROTINA132');
      expect(res1.code).toBe('132');
      expect(res1.baseName).toBe('PCSIS132');

      const res2 = normalizeRoutineTarget('ROT_529');
      expect(res2.code).toBe('529');
      expect(res2.baseName).toBe('PCSIS529');
    });

    it('retorna vazio quando o input for vazio', () => {
      const res = normalizeRoutineTarget('');
      expect(res.code).toBeNull();
      expect(res.baseName).toBe('');
      expect(res.fileName).toBe('');
    });
  });

  describe('buildCcwDownloadUrl', () => {
    it('constrói a URL correta com valores padrão', () => {
      const url = buildCcwDownloadUrl(undefined, 'PCSIS132', '30');
      expect(url).toBe('https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/PCSIS132/30/');
    });

    it('extrai major version quando versão vier completa com pontos', () => {
      const url = buildCcwDownloadUrl('https://centraldecontrole.pcinformatica.com.br/', 'PCSIS529', '30.0.14.2');
      expect(url).toBe('https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/PCSIS529/30/');
    });
  });

  describe('deduceModuleNumber e formatModuleFolderName', () => {
    it('deduz o número do módulo a partir do código', () => {
      expect(deduceModuleNumber('132')).toBe(1);
      expect(deduceModuleNumber('529')).toBe(5);
      expect(deduceModuleNumber('1406')).toBe(14);
      expect(deduceModuleNumber(null)).toBeNull();
      expect(deduceModuleNumber('abc')).toBeNull();
    });

    it('formata o nome da pasta do módulo com 3 dígitos', () => {
      expect(formatModuleFolderName(1)).toBe('MOD-001');
      expect(formatModuleFolderName(5)).toBe('MOD-005');
      expect(formatModuleFolderName(14)).toBe('MOD-014');
    });
  });

  describe('detectores de formato de buffer', () => {
    it('detecta executável Windows MZ', () => {
      const mzBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      expect(isExeBuffer(mzBuf)).toBe(true);
      expect(isZipBuffer(mzBuf)).toBe(false);
    });

    it('detecta arquivo ZIP PK', () => {
      const pkBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      expect(isZipBuffer(pkBuf)).toBe(true);
      expect(isExeBuffer(pkBuf)).toBe(false);
    });
  });

  describe('createBackupFilePath', () => {
    it('gera nome de backup preservando o diretório e com extensão .bak', () => {
      const dir = path.join('C:', 'Winthor', 'Prod', 'MOD-001');
      const original = path.join(dir, 'PCSIS132.EXE');
      const backup = createBackupFilePath(original);
      expect(backup).toContain('PCSIS132_');
      expect(backup.endsWith('.bak')).toBe(true);
      expect(path.dirname(backup)).toBe(dir);
    });
  });

  describe('processRoutineDownloadBuffer e extractZipBuffer', () => {
    it('empacota executável direto (.EXE) sem descompactar', () => {
      const exeData = Buffer.from([0x4d, 0x5a, 0x00, 0x00, 0x12, 0x34]);
      const res = processRoutineDownloadBuffer(exeData, 'PCSIS132.EXE');
      expect(res.isExe).toBe(true);
      expect(res.isZip).toBe(false);
      expect(res.filesToWrite.length).toBe(1);
      expect(res.filesToWrite[0].fileName).toBe('PCSIS132.EXE');
      expect(res.filesToWrite[0].data.equals(exeData)).toBe(true);
    });

    it('extrai arquivos de buffer ZIP criado com método Stored (sem compressão)', () => {
      // Monta um ZIP sintético mínimo válido com um arquivo 'PCSIS132.EXE' (método Stored)
      const fileName = 'PCSIS132.EXE';
      const fileData = Buffer.from('CONTEUDO_EXECUTAVEL_WINTHOR');
      const fnLen = Buffer.byteLength(fileName);

      // 1. Local file header (30 bytes + fnLen + data)
      const localHeader = Buffer.alloc(30 + fnLen + fileData.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // signature
      localHeader.writeUInt16LE(20, 4); // version needed
      localHeader.writeUInt16LE(0, 6); // flags
      localHeader.writeUInt16LE(0, 8); // compression: 0 (Stored)
      localHeader.writeUInt16LE(0, 10); // time
      localHeader.writeUInt16LE(0, 12); // date
      localHeader.writeUInt32LE(0, 14); // crc32
      localHeader.writeUInt32LE(fileData.length, 18); // comp size
      localHeader.writeUInt32LE(fileData.length, 22); // uncomp size
      localHeader.writeUInt16LE(fnLen, 26); // fn length
      localHeader.writeUInt16LE(0, 28); // extra len
      localHeader.write(fileName, 30, fnLen, 'utf8');
      fileData.copy(localHeader, 30 + fnLen);

      // 2. Central Directory Header (46 bytes + fnLen)
      const cdOffset = localHeader.length;
      const cdHeader = Buffer.alloc(46 + fnLen);
      cdHeader.writeUInt32LE(0x02014b50, 0); // signature
      cdHeader.writeUInt16LE(20, 4); // version made by
      cdHeader.writeUInt16LE(20, 6); // version needed
      cdHeader.writeUInt16LE(0, 8); // flags
      cdHeader.writeUInt16LE(0, 10); // compression 0
      cdHeader.writeUInt16LE(0, 12); // time
      cdHeader.writeUInt16LE(0, 14); // date
      cdHeader.writeUInt32LE(0, 16); // crc32
      cdHeader.writeUInt32LE(fileData.length, 20); // comp size
      cdHeader.writeUInt32LE(fileData.length, 24); // uncomp size
      cdHeader.writeUInt16LE(fnLen, 28); // fn len
      cdHeader.writeUInt16LE(0, 30); // extra len
      cdHeader.writeUInt16LE(0, 32); // comment len
      cdHeader.writeUInt16LE(0, 34); // disk num
      cdHeader.writeUInt16LE(0, 36); // internal attr
      cdHeader.writeUInt32LE(0, 38); // external attr
      cdHeader.writeUInt32LE(0, 42); // local header offset: 0
      cdHeader.write(fileName, 46, fnLen, 'utf8');

      // 3. End of Central Directory (22 bytes)
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(0, 4); // disk num
      eocd.writeUInt16LE(0, 6); // start disk
      eocd.writeUInt16LE(1, 8); // entries on disk
      eocd.writeUInt16LE(1, 10); // total entries
      eocd.writeUInt32LE(cdHeader.length, 12); // cd size
      eocd.writeUInt32LE(cdOffset, 16); // cd offset
      eocd.writeUInt16LE(0, 20); // comment len

      const fullZip = Buffer.concat([localHeader, cdHeader, eocd]);

      const extracted = extractZipBuffer(fullZip);
      expect(extracted.length).toBe(1);
      expect(extracted[0].fileName).toBe('PCSIS132.EXE');
      expect(extracted[0].data.toString()).toBe('CONTEUDO_EXECUTAVEL_WINTHOR');

      const processed = processRoutineDownloadBuffer(fullZip, 'FALLBACK.EXE');
      expect(processed.isZip).toBe(true);
      expect(processed.filesToWrite.length).toBe(1);
      expect(processed.filesToWrite[0].fileName).toBe('PCSIS132.EXE');
      expect(processed.filesToWrite[0].data.toString()).toBe('CONTEUDO_EXECUTAVEL_WINTHOR');
    });

    it('extrai arquivos de buffer ZIP criado com método Deflate (8)', () => {
      const fileName = 'PCSIS529.EXE';
      const rawText = 'DADOS_COMPACTADOS_COM_DEFLATE_WINTHOR_TESTE_LONGO_PARA_COMPRIMIR_BEM';
      const rawData = Buffer.from(rawText);
      const deflatedData = zlib.deflateRawSync(rawData);
      const fnLen = Buffer.byteLength(fileName);

      // Local Header
      const localHeader = Buffer.alloc(30 + fnLen + deflatedData.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(8, 8); // compression: 8 (Deflate)
      localHeader.writeUInt32LE(deflatedData.length, 18);
      localHeader.writeUInt32LE(rawData.length, 22);
      localHeader.writeUInt16LE(fnLen, 26);
      localHeader.writeUInt16LE(0, 28);
      localHeader.write(fileName, 30, fnLen, 'utf8');
      deflatedData.copy(localHeader, 30 + fnLen);

      // Central Directory
      const cdOffset = localHeader.length;
      const cdHeader = Buffer.alloc(46 + fnLen);
      cdHeader.writeUInt32LE(0x02014b50, 0);
      cdHeader.writeUInt16LE(20, 4);
      cdHeader.writeUInt16LE(20, 6);
      cdHeader.writeUInt16LE(0, 8);
      cdHeader.writeUInt16LE(8, 10); // compression: 8
      cdHeader.writeUInt32LE(deflatedData.length, 20);
      cdHeader.writeUInt32LE(rawData.length, 24);
      cdHeader.writeUInt16LE(fnLen, 28);
      cdHeader.writeUInt16LE(0, 30);
      cdHeader.writeUInt16LE(0, 32);
      cdHeader.writeUInt32LE(0, 42); // local header offset
      cdHeader.write(fileName, 46, fnLen, 'utf8');

      // EOCD
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(1, 8);
      eocd.writeUInt16LE(1, 10);
      eocd.writeUInt32LE(cdHeader.length, 12);
      eocd.writeUInt32LE(cdOffset, 16);

      const fullZip = Buffer.concat([localHeader, cdHeader, eocd]);
      const extracted = extractZipBuffer(fullZip);
      expect(extracted.length).toBe(1);
      expect(extracted[0].fileName).toBe('PCSIS529.EXE');
      expect(extracted[0].data.toString()).toBe(rawText);
    });
  });
});
