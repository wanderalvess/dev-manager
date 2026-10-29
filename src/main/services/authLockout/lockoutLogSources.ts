import fs from 'fs';

/** Teto da leitura do trecho novo do log: uma execução gera poucas linhas, mas o Karaf pode estar verboso. */
const MAX_NEW_BYTES = 8 * 1024 * 1024;

export function logFileSize(filePath: string | undefined): number | undefined {
  if (!filePath) return undefined;
  try {
    return fs.statSync(filePath).size;
  } catch {
    return undefined;
  }
}

export interface NewLogLines {
  found: boolean;
  lines: string[];
  /** O arquivo encolheu (rotação ou limpeza) durante a execução: lido do começo. */
  rotated: boolean;
  truncated: boolean;
}

/** Só o que foi escrito no log depois de `fromOffset` (o tamanho no início da execução). */
export function readLogSince(filePath: string | undefined, fromOffset: number | undefined): NewLogLines {
  const size = logFileSize(filePath);
  if (!filePath || size === undefined) return { found: false, lines: [], rotated: false, truncated: false };
  const rotated = fromOffset !== undefined && size < fromOffset;
  let start = rotated || fromOffset === undefined ? 0 : fromOffset;
  const truncated = size - start > MAX_NEW_BYTES;
  if (truncated) start = size - MAX_NEW_BYTES;
  const length = size - start;
  if (length <= 0) return { found: true, lines: [], rotated, truncated };
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buffer, 0, length, start);
  } finally {
    fs.closeSync(fd);
  }
  const lines = buffer.toString('utf-8').split(/\r?\n/).filter((line) => line.length > 0);
  return { found: true, lines, rotated, truncated };
}

/** A API de logs pode devolver texto puro, uma lista JSON ou um objeto com a lista dentro: vira uma linha por item. */
export function logsApiLines(body: string): string[] {
  try {
    const data = JSON.parse(body);
    const list = Array.isArray(data) ? data : Object.values(data ?? {}).find(Array.isArray);
    if (Array.isArray(list)) return list.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
    return JSON.stringify(data).split(/\\n|\n/);
  } catch {
    return body.split(/\r?\n/).filter((line) => line.length > 0);
  }
}

/** Segredos da execução (senhas e tokens) encontrados em linhas de log. */
export function secretsFoundIn(lines: readonly string[], secrets: Iterable<string>): string[] {
  const text = lines.join('\n');
  return [...secrets].filter((secret) => secret.length >= 4 && text.includes(secret));
}
