import type { IntegrationLogExcerpt } from '../../../shared/integrationTypes';
import { isErrorLogLine } from '../../../shared/integrationLogUtils';

/**
 * Evidência de log do Rastreio de Integração (decisão 0003): das últimas linhas do arquivo,
 * fica só o que cita o número do lote. Função pura; quem lê o arquivo é o service.
 */

/** Quantas linhas do trecho filtrado são guardadas no rastreio (as mais recentes). */
export const MAX_EXCERPT_LINES = 40;
/** Cada linha guardada é cortada nesse tamanho: stack traces e JSON gigante não incham o histórico. */
export const MAX_EXCERPT_LINE_LENGTH = 400;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** O lote 482 não pode casar com 14821: o número precisa estar isolado por caracteres que não sejam letra, dígito ou `_`. */
export function batchNumberPattern(batchNumber: string): RegExp {
  return new RegExp(`(?<![\\w])${escapeRegExp(batchNumber.trim())}(?![\\w])`);
}

function clip(line: string): string {
  return line.length > MAX_EXCERPT_LINE_LENGTH ? `${line.slice(0, MAX_EXCERPT_LINE_LENGTH)}…` : line;
}

/**
 * Linhas que citam o lote e, quando há marcador do fluxo, também o marcador (o marcador restringe,
 * não amplia). Guarda as últimas `maxLines` em ordem de arquivo.
 */
export function extractLogExcerpt(
  source: IntegrationLogExcerpt['source'],
  lines: string[],
  batchNumber: string,
  marker?: string,
  maxLines: number = MAX_EXCERPT_LINES
): IntegrationLogExcerpt {
  const batchPattern = batchNumberPattern(batchNumber);
  const needle = marker?.trim().toLowerCase();
  const matched = lines.filter(
    (line) => batchPattern.test(line) && (!needle || line.toLowerCase().includes(needle))
  );
  const kept = matched.slice(Math.max(0, matched.length - maxLines));
  return {
    source,
    lines: kept.map(clip),
    totalMatches: matched.length,
    errorLines: matched.filter(isErrorLogLine).length,
    truncated: matched.length > kept.length
  };
}
