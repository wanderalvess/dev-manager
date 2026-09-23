import type { DocFileInfo } from '../../../shared/types';

/** Rótulo de fonte que representa "sem filtro" no seletor de fontes de documentação. */
export const ALL_SOURCES_FILTER = 'TODOS';

/**
 * Filtra os arquivos indexados pela fonte selecionada (`sourceFilter`) e por um termo de
 * busca no título, aplicados em conjunto (E lógico).
 */
export function filterDocFiles(
  files: DocFileInfo[],
  sourceFilter: string,
  fileFilter: string
): DocFileInfo[] {
  return files.filter((f) => {
    if (sourceFilter !== ALL_SOURCES_FILTER && f.sourceLabel !== sourceFilter) return false;
    if (fileFilter.trim() && !f.title.toLowerCase().includes(fileFilter.toLowerCase())) return false;
    return true;
  });
}
