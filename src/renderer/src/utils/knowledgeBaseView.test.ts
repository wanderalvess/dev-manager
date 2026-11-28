import { describe, expect, it } from 'vitest';
import { formatEmbeddingsProgress, formatImportSummary, friendlyKbError, kbKeyPlaceholder, normalizeKbUrl } from './knowledgeBaseView';

describe('knowledgeBaseView', () => {
  it('resume a importação e só cita ignorados e erros quando existem', () => {
    const base = { scanned: 10, skipped: 0, created: 3, updated: 2, unchanged: 5, errors: 0, failures: [], warnings: [], linked: 0 };
    expect(formatImportSummary(base)).toBe('3 novo(s) · 2 atualizado(s) · 5 sem mudança');
    expect(formatImportSummary({ ...base, skipped: 1, errors: 2 })).toContain('1 ignorado(s) · 2 com erro');
    expect(formatImportSummary({ ...base, linked: 14 })).toContain('14 ligado(s) ao TDN');
  });

  it('indica chave salva sem expô-la', () => {
    expect(kbKeyPlaceholder(true)).toMatch(/salva/);
    expect(kbKeyPlaceholder(false)).toMatch(/KNOWLEDGE_READ/);
  });

  it('limpa o prefixo do IPC e orienta quando a base está desativada', () => {
    const raw = "Error invoking remote method 'kb:search': Error: A Base de Conhecimento está desativada nas configurações.";
    expect(friendlyKbError(raw)).toMatch(/marque "Usar a Base de Conhecimento".*Salvar alterações/);
    expect(friendlyKbError("Error invoking remote method 'kb:search': Error: HTTP 500")).toBe('HTTP 500');
    expect(friendlyKbError('Chave de API da Base de Conhecimento não configurada.')).toMatch(/Salvar alterações/);
  });

  it('descreve o progresso do download e dos embeddings', () => {
    expect(formatEmbeddingsProgress({ phase: 'download', doneBytes: 67_108_864, totalBytes: 134_217_728 })).toBe(
      'Baixando o modelo... 50% (64 de 128 MB)'
    );
    expect(formatEmbeddingsProgress({ phase: 'embedding', done: 200, rejected: 1 })).toBe(
      'Calculando embeddings... 200 trecho(s), 1 recusado(s)'
    );
  });

  it('normaliza a URL', () => {
    expect(normalizeKbUrl('  https://x.com/// ')).toBe('https://x.com');
  });
});
