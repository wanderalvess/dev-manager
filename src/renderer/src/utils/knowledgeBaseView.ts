import type { KbImportSummary } from '../../../main/services/kb/KnowledgeBaseImportService';

/** Resumo da importação em uma frase, para toast/linha de status. */
export function formatImportSummary(s: KbImportSummary): string {
  const parts = [
    `${s.created} novo(s)`,
    `${s.updated} atualizado(s)`,
    `${s.unchanged} sem mudança`
  ];
  if (s.skipped > 0) parts.push(`${s.skipped} ignorado(s)`);
  if (s.errors > 0) parts.push(`${s.errors} com erro`);
  return parts.join(' · ');
}

/** Placeholder do campo da chave: indica que já existe uma chave salva sem mostrá-la. */
export function kbKeyPlaceholder(hasSavedKey: boolean): string {
  return hasSavedKey ? 'Chave salva — digite só para trocar' : 'Chave de API com KNOWLEDGE_READ e KNOWLEDGE_WRITE';
}

/** Normaliza a URL digitada (sem espaços nem barras no fim) para comparar e salvar. */
export function normalizeKbUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
