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

/** Progresso do download do modelo ou do cálculo dos vetores, em uma frase. */
export function formatEmbeddingsProgress(
  p: { phase: 'download'; doneBytes: number; totalBytes: number } | { phase: 'embedding'; done: number; rejected: number }
): string {
  if (p.phase === 'download') {
    const pct = p.totalBytes > 0 ? Math.min(100, Math.round((p.doneBytes / p.totalBytes) * 100)) : 0;
    return `Baixando o modelo... ${pct}% (${Math.round(p.doneBytes / 1_048_576)} de ${Math.round(p.totalBytes / 1_048_576)} MB)`;
  }
  return `Calculando embeddings... ${p.done} trecho(s)${p.rejected ? `, ${p.rejected} recusado(s)` : ''}`;
}

/** Tira o prefixo técnico do IPC e diz o que fazer quando a base está desativada. */
export function friendlyKbError(message: string): string {
  const clean = message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').trim();
  if (/desativada/i.test(clean)) {
    return 'A Base de Conhecimento está desativada: marque "Usar a Base de Conhecimento" e clique em Salvar alterações.';
  }
  if (/n[aã]o configurada|inv[aá]lida/i.test(clean) && /chave|url/i.test(clean)) {
    return `${clean} Preencha a URL e a chave e clique em Salvar alterações.`;
  }
  return clean;
}

/** Normaliza a URL digitada (sem espaços nem barras no fim) para comparar e salvar. */
export function normalizeKbUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
