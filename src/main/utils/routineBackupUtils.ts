import path from 'path';

export interface ParsedBackupInfo {
  baseRoutineName: string;
  timestampStr?: string;
  parsedDate: Date | null;
  isPreRollback: boolean;
}

/**
 * Formata bytes em formato legível (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedI = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, clampedI);
  return `${val.toFixed(clampedI === 0 ? 0 : 1)} ${units[clampedI]}`;
}

/**
 * Formata um objeto Date no padrão brasileiro DD/MM/AAAA HH:MM:SS.
 */
export function formatBackupDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

/**
 * Analisa o nome de arquivo de backup (.bak) para extrair o nome da rotina base, carimbo de data/hora
 * e se foi gerado preventivamente antes de um rollback.
 */
export function parseBackupFileName(fileName: string): ParsedBackupInfo {
  const clean = path.basename(fileName).trim();
  const isPreRollback = clean.toLowerCase().includes('_pre_rollback');

  // Remove .bak no final
  let withoutBak = clean.replace(/\.bak$/i, '');
  // Remove .exe intermediário se houver (ex: PCSIS132.EXE.20260929_113000 -> PCSIS132.20260929_113000)
  withoutBak = withoutBak.replace(/\.exe(?=\.|$|_)/i, '');
  // Remove sufixo _pre_rollback
  withoutBak = withoutBak.replace(/_pre_rollback$/i, '');

  // Procura padrão de timestamp: _YYYYMMDD_HHMMSS ou .YYYYMMDD_HHMMSS
  const tsMatch = withoutBak.match(/[_.]((\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2}))$/);
  if (tsMatch) {
    const fullTs = tsMatch[1];
    const year = parseInt(tsMatch[2], 10);
    const month = parseInt(tsMatch[3], 10) - 1;
    const day = parseInt(tsMatch[4], 10);
    const hour = parseInt(tsMatch[5], 10);
    const min = parseInt(tsMatch[6], 10);
    const sec = parseInt(tsMatch[7], 10);
    const parsedDate = new Date(year, month, day, hour, min, sec);

    const baseRoutineName = withoutBak.substring(0, tsMatch.index).replace(/[._]$/, '').toUpperCase();
    return {
      baseRoutineName,
      timestampStr: fullTs,
      parsedDate: isNaN(parsedDate.getTime()) ? null : parsedDate,
      isPreRollback
    };
  }

  // Backup sem timestamp padronizado (ex: PCSIS132.bak)
  return {
    baseRoutineName: withoutBak.toUpperCase(),
    parsedDate: null,
    isPreRollback
  };
}

/**
 * Checa se um arquivo de backup (.bak) pertence a uma rotina específica.
 */
export function isBackupForRoutine(backupFileName: string, targetRoutineName: string): boolean {
  if (!backupFileName.toLowerCase().endsWith('.bak')) return false;
  const parsed = parseBackupFileName(backupFileName);

  const cleanTarget = path.basename(targetRoutineName)
    .replace(/\.exe$/i, '')
    .toUpperCase()
    .trim();

  return parsed.baseRoutineName === cleanTarget;
}

/**
 * Cria o nome de arquivo para o backup de segurança gerado imediatamente antes de um rollback.
 */
export function createPreRollbackBackupPath(targetRoutinePath: string): string {
  const dir = path.dirname(targetRoutinePath);
  const ext = path.extname(targetRoutinePath);
  const base = path.basename(targetRoutinePath, ext);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return path.join(dir, `${base}_${timestamp}_pre_rollback.bak`);
}
