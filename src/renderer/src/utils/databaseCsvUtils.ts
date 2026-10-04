/**
 * Monta o conteúdo CSV de um resultado de consulta.
 * Valores nulos/indefinidos viram campo vazio; os demais são sempre entre aspas,
 * com aspas internas duplicadas (RFC 4180).
 */
export function buildCsvContent(columns: string[], rows: Record<string, any>[]): string {
  const lines = [columns.join(',')];

  for (const row of rows) {
    const line = columns
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
    lines.push(line);
  }

  return lines.join('\n');
}

/** Texto copiado para a área de transferência a partir de uma célula (objetos viram JSON). */
export function formatCellForCopy(value: any): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
}
