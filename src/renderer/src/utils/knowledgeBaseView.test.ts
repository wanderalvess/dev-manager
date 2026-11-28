import { describe, expect, it } from 'vitest';
import { formatImportSummary, kbKeyPlaceholder, normalizeKbUrl } from './knowledgeBaseView';

describe('knowledgeBaseView', () => {
  it('resume a importação e só cita ignorados e erros quando existem', () => {
    const base = { scanned: 10, skipped: 0, created: 3, updated: 2, unchanged: 5, errors: 0, failures: [], warnings: [] };
    expect(formatImportSummary(base)).toBe('3 novo(s) · 2 atualizado(s) · 5 sem mudança');
    expect(formatImportSummary({ ...base, skipped: 1, errors: 2 })).toContain('1 ignorado(s) · 2 com erro');
  });

  it('indica chave salva sem expô-la', () => {
    expect(kbKeyPlaceholder(true)).toMatch(/salva/);
    expect(kbKeyPlaceholder(false)).toMatch(/KNOWLEDGE_READ/);
  });

  it('normaliza a URL', () => {
    expect(normalizeKbUrl('  https://x.com/// ')).toBe('https://x.com');
  });
});
