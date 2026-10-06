/** Texto copiado para a área de transferência a partir de uma célula (objetos viram JSON). */
export function formatCellForCopy(value: any): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
}
