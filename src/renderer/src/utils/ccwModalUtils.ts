import type {
  CcwCatalogItem,
  BatchRoutineItemProgress,
  RoutineBackupEntry
} from '../../../shared/types';

export type CcwModalTab = 'download' | 'file' | 'catalog' | 'rollback' | 'batch';

export const DEFAULT_CCW_APP_PATH = 'C:\\Winthor\\Prod';

/** Separa códigos/nomes digitados livremente (vírgula, ponto e vírgula, espaço ou quebra de linha). */
export function parseBatchCodes(raw: string): string[] {
  return raw
    .split(/[,;\s\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function getBatchProgressKey(p: BatchRoutineItemProgress): string {
  return p.routineCodeOrName || p.routine || p.routineCode || '';
}

/** Atualiza o item já existente (comparação case-insensitive) ou acrescenta ao final. */
export function upsertBatchProgress(
  list: BatchRoutineItemProgress[],
  progress: BatchRoutineItemProgress
): BatchRoutineItemProgress[] {
  const target = getBatchProgressKey(progress).toUpperCase();
  const idx = list.findIndex((p) => getBatchProgressKey(p).toUpperCase() === target);
  if (idx >= 0) {
    const updated = [...list];
    updated[idx] = progress;
    return updated;
  }
  return [...list, progress];
}

export function computeBatchStats(list: BatchRoutineItemProgress[]) {
  const total = list.length;
  const completed = list.filter((p) => p.status === 'completed').length;
  const failed = list.filter((p) => p.status === 'failed').length;
  const percent = Math.round(((completed + failed) / (total || 1)) * 100);
  return { total, completed, failed, percent };
}

export function getRestoredVersionSuffix(
  restoredVersion: string | { fileVersion?: string } | undefined | null
): string {
  if (typeof restoredVersion === 'string') {
    return restoredVersion ? ` (v${restoredVersion})` : '';
  }
  return restoredVersion?.fileVersion ? ` (v${restoredVersion.fileVersion})` : '';
}

export function filterCatalogItems(items: CcwCatalogItem[], search: string): CcwCatalogItem[] {
  const q = search.toLowerCase().trim();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.rotina.toLowerCase().includes(q) ||
      item.moduloDesc.toLowerCase().includes(q) ||
      (item.versaoCorrente && item.versaoCorrente.includes(q))
  );
}

/** Último segmento de um caminho, aceitando separadores \ e /. */
export function getPathBaseName(path: string): string {
  return path.split(/[\\/]/).pop() || '';
}

export function getBackupPath(entry: RoutineBackupEntry): string {
  return entry.backupFilePath || entry.fullPath;
}
