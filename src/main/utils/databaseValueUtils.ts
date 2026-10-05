/**
 * Sanitiza valores retornados do banco de dados para garantir que possam ser
 * serializados via IPC do Electron (structuredClone) sem travar ou rejeitar.
 */
export function sanitizeDbValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (Buffer.isBuffer(val)) {
    return `[BLOB ${val.length} bytes]`;
  }
  if (typeof val === 'object') {
    // Se for um Stream / EventEmitter / oracledb.Lob que não foi convertido
    if (typeof (val as any).pipe === 'function' || typeof (val as any).read === 'function') {
      return '[LOB Stream]';
    }
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function sanitizeRows(rows: Record<string, any>[], columns: string[]): Record<string, any>[] {
  return rows.map((row) => {
    const clean: Record<string, any> = {};
    for (const col of columns) {
      clean[col] = sanitizeDbValue(row[col]);
    }
    return clean;
  });
}
