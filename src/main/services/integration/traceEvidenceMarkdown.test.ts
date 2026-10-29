import { describe, expect, it } from 'vitest';
import { buildTraceEvidenceMarkdown } from './traceEvidenceMarkdown';
import { applyStepUpdate, createEmptyTimeline, finalizeTrace } from './traceTimeline';

describe('buildTraceEvidenceMarkdown', () => {
  it('relata lote, passo quebrado com evidência em bloco de código e a tabela dos oito passos', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });
    steps = applyStepUpdate(steps, { id: 'winthor-fetch', status: 'ok', source: 'apm', httpStatus: 200, itemCount: 12, durationMs: 1800 });
    steps = applyStepUpdate(steps, {
      id: 'send',
      status: 'failed',
      source: 'ch-api',
      message: 'O lote ficou sem itens no PDVSync',
      evidence: 'loja 2 · PROD-7: NCM inválido\n-> 0'
    });
    const trace = finalizeTrace(
      { id: 't1', flowId: 'produto', flowName: 'Produto', batchNumber: '48213', startedAt: 1_700_000_000_000, steps },
      1_700_000_065_000
    );

    const md = buildTraceEvidenceMarkdown(trace);

    expect(md).toContain('## Rastreio de Integração: Produto');
    expect(md).toContain('- **Lote:** 48213');
    expect(md).toContain('- **Duração total:** 65,0 s');
    expect(md).toContain('**Quebrou no passo 6: Envio do JSON ao lote**');
    expect(md).toContain('O lote ficou sem itens no PDVSync');
    expect(md).toContain('```\nloja 2 · PROD-7: NCM inválido\n-> 0\n```');
    expect(md).toContain('| 5 | Abertura do lote no PDVSync | ✅ ok | API do PDVSync | 200 | - | 120 ms | - |');
    expect(md).toContain('| 2 | Busca na API do WinThor | ✅ ok | APM | 200 | 12 | 1,8 s | - |');
    expect(md).toContain('| 7 | Fechamento do lote | ⏭️ pulado | - | - | - | - | - |');
  });

  it('sem falha diz que tudo concluiu e trata lote ausente', () => {
    const trace = finalizeTrace({ id: 't2', flowId: 'produto', startedAt: 1_700_000_000_000, steps: createEmptyTimeline() }, 1_700_000_000_500);
    const md = buildTraceEvidenceMarkdown(trace);

    expect(md).toContain('## Rastreio de Integração\n');
    expect(md).toContain('- **Lote:** não identificado');
    expect(md).toContain('todos os passos observados concluíram sem falha');
    expect(md).toContain('- **Duração total:** 500 ms');
  });

  it('inclui os logs do lote com contagem de erros, o corte e as observações', () => {
    const trace = finalizeTrace(
      {
        id: 't4',
        flowId: 'f',
        batchNumber: '7',
        startedAt: 1,
        steps: createEmptyTimeline(),
        logExcerpts: [
          { source: 'wsh', lines: ['10:00 ERROR lote 7 falhou', '10:01 INFO lote 7'], totalMatches: 9, errorLines: 1, truncated: true },
          { source: 'ch', lines: [], totalMatches: 0, errorLines: 0, truncated: false }
        ],
        notes: ['APM sem receptor ativo.']
      },
      2
    );
    const md = buildTraceEvidenceMarkdown(trace);

    expect(md).toContain('### Logs filtrados pelo lote');
    expect(md).toContain('**WSH:** 9 linha(s) citam o lote, 1 com erro; mostrando as 2 mais recentes');
    expect(md).toContain('```\n10:00 ERROR lote 7 falhou\n10:01 INFO lote 7\n```');
    expect(md).toContain('**CH:** nenhuma linha cita o lote nas últimas linhas do log.');
    expect(md).toContain('### Observações\n\n- APM sem receptor ativo.');
  });

  it('sem logs nem observações o relatório não ganha seções vazias', () => {
    const md = buildTraceEvidenceMarkdown(finalizeTrace({ id: 't5', flowId: 'f', startedAt: 1, steps: createEmptyTimeline() }, 2));
    expect(md).not.toContain('### Logs');
    expect(md).not.toContain('### Observações');
  });

  it('escapa barras verticais e quebras de linha nas células da tabela', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'send', status: 'failed', source: 'http', message: 'HTTP 500 | corpo:\nerro' });
    const md = buildTraceEvidenceMarkdown(finalizeTrace({ id: 't3', flowId: 'f', startedAt: 1, steps }, 2));

    expect(md).toContain('HTTP 500 \\| corpo: erro |');
  });
});
