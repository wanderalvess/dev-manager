/** Metadados de exibição derivados do título (caminho) de um arquivo indexado. */
export interface DocFileDisplayMeta {
  fileName: string;
  ext: string;
  parentFolder: string | null;
}

export function getDocFileDisplayMeta(title: string): DocFileDisplayMeta {
  const fileName = title.split(/[\\/]/).pop() || title;
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toUpperCase() : 'DOC';
  const parentFolder =
    title.includes('/') || title.includes('\\')
      ? title.replace(/[\\/][^\\/]+$/, '').split(/[\\/]/).pop() || null
      : null;
  return { fileName, ext, parentFolder };
}

const GENERIC_DOC_FOLDER_NAMES = ['docs', 'doc', 'documentacao', 'documentation', 'wiki'];

/**
 * Deriva o rótulo de uma pasta de documentação. Nomes genéricos (ex.: "docs") usam o
 * diretório pai, pois o rótulo precisa identificar o projeto na lista de fontes.
 */
export function deriveDocFolderLabel(selectedPath: string): string {
  const normalized = selectedPath.replace(/\\/g, '/').replace(/\/+$/, '');
  let label = normalized.split('/').pop() || 'docs';
  if (GENERIC_DOC_FOLDER_NAMES.includes(label.toLowerCase())) {
    const parent = normalized.split('/').slice(-2, -1)[0];
    if (parent && !parent.includes(':')) {
      label = parent;
    }
  }
  return label;
}

/** Substitui o item de mesmo `id` ou, se inexistente, acrescenta ao final. */
export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((i) => i.id === item.id)
    ? items.map((i) => (i.id === item.id ? item : i))
    : [...items, item];
}
