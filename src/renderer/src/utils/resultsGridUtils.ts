export const RESULTS_GRID_ROW_HEIGHT = 33;

export type ResultsGridDataType = 'number' | 'date' | 'boolean' | 'object' | 'string';

export type ResultsGridCellKind = 'null' | 'number' | 'date' | 'boolean' | 'object' | 'string';

/** Texto exibido/editado de uma célula: null/undefined viram string vazia. */
export function toEditableDisplay(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Só grava se o texto digitado diferir do valor original exibido. */
export function hasCellChanged(editedValue: string, originalValue: unknown): boolean {
  return editedValue !== toEditableDisplay(originalValue);
}

/** A ordem das checagens define a precedência visual (number antes de date, etc). */
export function getCellKind(value: any, dataType: ResultsGridDataType): ResultsGridCellKind {
  if (value === null || value === undefined) return 'null';
  if (dataType === 'number' || typeof value === 'number') return 'number';
  if (dataType === 'date') return 'date';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
}

export function formatCellValue(value: any, kind: ResultsGridCellKind): string {
  return kind === 'object' ? JSON.stringify(value) : String(value);
}

export function getCellTitle(isEditable: boolean): string {
  return isEditable
    ? 'Clique para copiar | Duplo-clique para editar | Botão direito para mais opções'
    : 'Clique para copiar | Botão direito para filtrar por valor';
}

export function getRowClassName(isSelected: boolean, index: number): string {
  if (isSelected) return 'bg-sky-500/15 dark:bg-sky-500/25 border-l-4 border-sky-500 font-medium';
  return index % 2 === 0
    ? 'bg-background hover:bg-muted/30'
    : 'bg-muted/15 dark:bg-muted/10 hover:bg-muted/30';
}

export function computeBottomSpacerHeight(totalHeight: number, offsetY: number, visibleCount: number): number {
  return Math.max(0, totalHeight - offsetY - visibleCount * RESULTS_GRID_ROW_HEIGHT);
}

export function omitColumnFilter(filters: Record<string, string>, column: string): Record<string, string> {
  const copy = { ...filters };
  delete copy[column];
  return copy;
}

/** Mantém o menu de contexto dentro da viewport. */
export function clampContextMenuPosition(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number
): { top: number; left: number } {
  return { top: Math.min(y, viewportHeight - 180), left: Math.min(x, viewportWidth - 250) };
}

export function formatFilterValueLabel(value: unknown): string {
  return value === null || value === undefined ? '[NULL]' : String(value);
}
