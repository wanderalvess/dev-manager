/**
 * O que conta como linha de erro num log, igual no backend (contagem do rastreio) e na tela
 * (destaque da linha). `Exception` sem fronteira antes pega java.lang.IllegalStateException e semelhantes.
 */
const ERROR_LINE = /\b(ERROR|FATAL|SEVERE|CRITICAL)\b|Exception\b/;

export function isErrorLogLine(line: string): boolean {
  return ERROR_LINE.test(line);
}
