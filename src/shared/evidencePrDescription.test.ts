import { describe, expect, it } from 'vitest';
import { PR_DESCRIPTION_MAX_CHARS, buildPrDescription } from './evidencePrDescription';
import type { EvidenceSession, EvidenceStep } from './evidenceTypes';

const step = (n: number, over: Partial<EvidenceStep> = {}): EvidenceStep => ({
  id: `s${n}`,
  title: `Passo ${n}`,
  result: 'passed',
  createdAt: '2026-01-01T10:00:00.000Z',
  ...over
});

const session = (over: Partial<EvidenceSession> = {}): EvidenceSession => ({
  id: 'WT-1__20260101-100000',
  task: 'WT-1',
  title: 'Carga inicial <b>nova</b>',
  kind: 'qa',
  tester: 'Ana',
  environment: 'v1.2 / branch x',
  steps: [
    step(1, { expected: 'Retorna os campos', actual: 'Retornou os campos', blocks: [{ id: 'b1', kind: 'api', phase: 'single', request: 'GET http://h/api?x=1\nAuthorization: Bearer abc', response: '{}', meta: '200 OK · 12 ms', verdict: { passed: true, results: [{ rule: 'status 200', ok: true, detail: 'status 200' }] }, createdAt: '' }] }),
    step(2, { result: 'failed', actual: 'erro 500', blocks: [{ id: 'b2', kind: 'sql', phase: 'after', title: 'Pedidos', request: 'select 1', response: '', meta: '0 linha(s)', verdict: { passed: false, results: [{ rule: 'linhas >= 1', ok: false, detail: '0' }] }, createdAt: '' }] })
  ],
  videos: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:02:00.000Z',
  ...over
});

describe('buildPrDescription', () => {
  it('resume cabeçalho, passos e provas em Markdown, sem cabeçalhos nem corpo das chamadas', () => {
    const text = buildPrDescription(session());
    expect(text).toContain('## Carga inicial &lt;b>nova&lt;/b>');
    expect(text).toContain('- **Tarefa:** WT-1');
    expect(text).toContain('- **Resultado:** ❌ Reprovado (1 aprovados, 1 reprovados, 0 pendentes de 2 passos)');
    expect(text).toContain('1. ✅ Passo 1');
    expect(text).toContain('   - Esperado: Retorna os campos');
    expect(text).toContain("   - API `GET http://h/api?x=1` → 200 OK · 12 ms · regras ✅");
    expect(text).toContain('2. ❌ Passo 2');
    expect(text).toContain('   - [Depois] SQL Pedidos → 0 linha(s) · regras ❌ (linhas >= 1)');
    expect(text).not.toContain('Authorization');
    expect(text).not.toContain('Bearer');
  });

  it('inclui só links http(s) válidos e omite o que não existe', () => {
    const text = buildPrDescription(
      session({
        task: '',
        tester: undefined,
        links: [
          { id: 'a', kind: 'pr', label: 'Versão [1]|x', url: 'https://github.com/o/r/pull/1' },
          { id: 'b', kind: 'video', url: 'https://v.example.com/a' },
          { id: 'c', kind: 'other', url: 'javascript:alert(1)' }
        ]
      })
    );
    expect(text).toContain('### Links');
    expect(text).toContain('- Pull request: [Versão  1  x](https://github.com/o/r/pull/1)');
    expect(text).toContain('- Vídeo: https://v.example.com/a');
    expect(text).not.toContain('javascript:');
    expect(text).not.toContain('**Tarefa:**');
    expect(text).not.toContain('**Responsável:**');
  });

  it('nunca passa do limite: tira detalhe e depois corta passos avisando quantos ficaram de fora', () => {
    const many = session({ steps: Array.from({ length: 400 }, (_, i) => step(i + 1, { expected: 'x'.repeat(300), actual: 'y'.repeat(300) })) });
    const text = buildPrDescription(many);
    expect(text.length).toBeLessThanOrEqual(PR_DESCRIPTION_MAX_CHARS);
    expect(text).toMatch(/… e mais \d+ passos/);
    expect(text).toContain('1. ✅ Passo 1');
    expect(text).not.toContain('Esperado:');
  });

  it('prefere o texto completo quando cabe e respeita um limite menor', () => {
    const small = session();
    expect(buildPrDescription(small)).toContain('Esperado:');
    const tight = buildPrDescription(small, 420);
    expect(tight.length).toBeLessThanOrEqual(420);
    expect(tight).toContain('1. ✅ Passo 1');
    expect(buildPrDescription(small, 50).length).toBeLessThanOrEqual(50);
  });

  it('evidência sem passos não mostra a seção de passos', () => {
    const text = buildPrDescription(session({ steps: [] }));
    expect(text).not.toContain('### Passos');
    expect(text).toContain('⏳ Pendente');
  });
});
