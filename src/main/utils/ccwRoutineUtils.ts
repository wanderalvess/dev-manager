import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
export {
  type NormalizedRoutineTarget,
  normalizeRoutineTarget,
  buildCcwDownloadUrl,
  deduceModuleNumber,
  formatModuleFolderName
} from '../../shared/ccwRoutineCommon';
import {
  deduceModuleNumber,
  formatModuleFolderName
} from '../../shared/ccwRoutineCommon';

/**
 * Localiza a pasta de destino correta para instalar a rotina dentro de C:\Winthor\Prod.
 * 1. Se a rotina já existe em qualquer subpasta (ex: MOD-001 ou Raiz), preserva a pasta onde ela já está instalada.
 * 2. Se um módulo foi especificado (ex: MOD-001), utiliza a subpasta dele.
 * 3. Se deduzível pelo código da rotina e a pasta existir no disco, utiliza a pasta deduzida.
 * 4. Fallback: utiliza o diretório raiz de Prod (ou subpasta "Raiz" se existir).
 */
export function resolveTargetRoutineDirectory(
  baseProdPath: string,
  fileName: string,
  routineCode: string | null,
  specifiedModule?: string
): { targetDir: string; isExisting: boolean; existingFilePath?: string } {
  const normalizedBase = path.normalize(path.resolve(baseProdPath));

  // 1. Procurar se o executável já existe em alguma subpasta
  try {
    if (fs.existsSync(normalizedBase)) {
      const existingInRoot = path.join(normalizedBase, fileName);
      if (fs.existsSync(existingInRoot)) {
        return { targetDir: normalizedBase, isExisting: true, existingFilePath: existingInRoot };
      }

      const entries = fs.readdirSync(normalizedBase, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const candidatePath = path.join(normalizedBase, entry.name, fileName);
          if (fs.existsSync(candidatePath)) {
            return {
              targetDir: path.join(normalizedBase, entry.name),
              isExisting: true,
              existingFilePath: candidatePath
            };
          }
        }
      }
    }
  } catch {
    // Continua para criação
  }

  // 2. Módulo explicitamente informado
  if (specifiedModule && specifiedModule.trim()) {
    const cleanMod = specifiedModule.trim();
    const modDir = path.join(normalizedBase, cleanMod);
    return { targetDir: modDir, isExisting: false };
  }

  // 3. Deduzir módulo a partir do código
  const modNum = deduceModuleNumber(routineCode);
  if (modNum !== null) {
    const modFolderName = formatModuleFolderName(modNum);
    const candidateModDir = path.join(normalizedBase, modFolderName);
    if (fs.existsSync(candidateModDir)) {
      return { targetDir: candidateModDir, isExisting: false };
    }
  }

  // 4. Fallback: pasta "Raiz" se existir, ou a própria baseProdPath
  const raizDir = path.join(normalizedBase, 'Raiz');
  if (fs.existsSync(raizDir)) {
    return { targetDir: raizDir, isExisting: false };
  }

  return { targetDir: normalizedBase, isExisting: false };
}

/**
 * Cria o nome de caminho para backup de um arquivo existente antes de ser substituído.
 * Exemplo: PCSIS132.EXE -> PCSIS132_20260929_113000.bak
 */
export function createBackupFilePath(existingFilePath: string): string {
  const dir = path.dirname(existingFilePath);
  const ext = path.extname(existingFilePath);
  const base = path.basename(existingFilePath, ext);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return path.join(dir, `${base}_${timestamp}.bak`);
}

export interface ExtractedZipEntry {
  fileName: string;
  data: Buffer;
  isDirectory: boolean;
}

/**
 * Parser de arquivos ZIP puro em TypeScript/Node.js, sem dependências externas.
 * Extrai entradas compactadas com Deflate (método 8) ou Stored (método 0) lendo o Central Directory.
 */
export function extractZipBuffer(buffer: Buffer): ExtractedZipEntry[] {
  const entries: ExtractedZipEntry[] = [];
  if (!buffer || buffer.length < 22) {
    return entries;
  }

  // Localiza o registro End of Central Directory (EOCD: 0x06054b50) a partir do final
  let eocdOffset = -1;
  const maxSearch = Math.min(buffer.length - 22, 65557);
  for (let i = buffer.length - 22; i >= buffer.length - 22 - maxSearch; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return entries;
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (centralDirOffset + centralDirSize > buffer.length) {
    return entries;
  }

  let curr = centralDirOffset;
  for (let i = 0; i < totalEntries && curr < buffer.length - 46; i++) {
    // Signature do Central Directory: 0x02014b50
    if (buffer.readUInt32LE(curr) !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(curr + 10);
    const compressedSize = buffer.readUInt32LE(curr + 20);
    const fileNameLength = buffer.readUInt16LE(curr + 28);
    const extraFieldLength = buffer.readUInt16LE(curr + 30);
    const commentLength = buffer.readUInt16LE(curr + 32);
    const localHeaderOffset = buffer.readUInt32LE(curr + 42);

    const nameOffset = curr + 46;
    const entryFileName = buffer.toString('utf8', nameOffset, nameOffset + fileNameLength);
    curr = nameOffset + fileNameLength + extraFieldLength + commentLength;

    const isDir = entryFileName.endsWith('/') || entryFileName.endsWith('\\');
    if (isDir) {
      entries.push({ fileName: entryFileName, data: Buffer.alloc(0), isDirectory: true });
      continue;
    }

    // Lê os dados do Local File Header
    if (localHeaderOffset + 30 > buffer.length) {
      continue;
    }
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      continue;
    }

    const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

    if (dataOffset + compressedSize > buffer.length) {
      continue;
    }

    const compressedSlice = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let fileData: Buffer;

    if (compressionMethod === 0) {
      // Stored (sem compressão)
      fileData = Buffer.from(compressedSlice);
    } else if (compressionMethod === 8) {
      // Deflate
      try {
        fileData = zlib.inflateRawSync(compressedSlice);
      } catch (err) {
        console.warn(`[extractZipBuffer] Falha ao inflar ${entryFileName}:`, err);
        continue;
      }
    } else {
      console.warn(`[extractZipBuffer] Método de compressão não suportado: ${compressionMethod} para ${entryFileName}`);
      continue;
    }

    entries.push({
      fileName: entryFileName,
      data: fileData,
      isDirectory: false
    });
  }

  return entries;
}

/**
 * Identifica se um buffer é um arquivo executável Windows (.EXE - assinatura MZ: 0x4D 0x5A).
 */
export function isExeBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a;
}

/**
 * Identifica se um buffer é um arquivo ZIP (assinatura PK: 0x50 0x4B 0x03 0x04).
 */
export function isZipBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

export interface ProcessedDownloadPayload {
  isZip: boolean;
  isExe: boolean;
  filesToWrite: { fileName: string; data: Buffer }[];
}

/**
 * Processa o payload binário retornado pela Central de Controle ou de um arquivo local.
 * Se for executável direto (.EXE), empacota como arquivo único.
 * Se for compactado (.ZIP), extrai todos os executáveis e arquivos de suporte (ex: .dll, .bpl, .ini).
 */
export function processRoutineDownloadBuffer(
  buffer: Buffer,
  fallbackFileName: string = 'PCSIS.EXE'
): ProcessedDownloadPayload {
  if (isExeBuffer(buffer)) {
    return {
      isZip: false,
      isExe: true,
      filesToWrite: [{ fileName: fallbackFileName, data: buffer }]
    };
  }

  if (isZipBuffer(buffer)) {
    const extracted = extractZipBuffer(buffer);
    const nonDir = extracted.filter((e) => !e.isDirectory && e.data.length > 0);
    if (nonDir.length > 0) {
      return {
        isZip: true,
        isExe: false,
        filesToWrite: nonDir.map((e) => ({
          // Normaliza separadores de pasta e extrai apenas o nome de arquivo na raiz se necessário
          fileName: path.basename(e.fileName),
          data: e.data
        }))
      };
    }
  }

  // Fallback: se não tiver assinatura conhecida, assume que seja o arquivo direto
  return {
    isZip: false,
    isExe: false,
    filesToWrite: [{ fileName: fallbackFileName, data: buffer }]
  };
}
