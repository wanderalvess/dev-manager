import { describe, expect, it } from 'vitest';
import { buildTraceEvidenceMarkdown } from './traceEvidenceMarkdown';
import { applyStepUpdate, createEmptyTimeline, finalizeTrace } from './traceTimeline';

describe('buildTraceEvidenceMarkdown', () => {
  it('relata lote, passo quebrado com evidência em bloco de código e a tabela dos oito passos', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });
    steps = applyStepUpdate(steps, { id: 'winthor-api', status: 'ok', source: 'apm', httpStatus: 200, itemCount: 12, durationMs: 1800 });
    steps = applyStepUpdate(steps, {
      id: 'pdv-arrival',
      status: 'failed',
      source: 'sql',
      message: '0 de 12 registros no Postgres após 60 s',
      evidence: 'SELECT count(*) FROM venda WHERE lote = 48213\n-> 0'
    });
    const trace = finalizeTrace({ id: 't1', flowId: 'venda', flowName: 'Venda', batchNumber: '48213', startedAt: 1_700_000_000_000, steps }, 1_700_000_065_000);

    const md = buildTraceEvidenceMarkdown(trace);

    expect(md).toContain('## Rastreio de Integração: Venda');
    expect(md).toContain('- **Lote:** 48213');
    expect(md).toContain('- **Duração total:** 65,0 s');
    expect(md).toContain('**Quebrou no passo 7: CH desce para o PDV**');
    expect(md).toContain('0 de 12 registros no Postgres após 60 s');
    expect(md).toContain('```\nSELECT count(*) FROM venda WHERE lote = 48213\n-> 0\n```');
    expect(md).toContain('| 1 | WSH abre o lote no CH | ✅ ok | API do CH | 200 | - | 120 ms | - |');
    expect(md).toContain('| 3 | Chamada da API do fluxo (Karaf) | ✅ ok | APM | 200 | 12 | 1,8 s | - |');
    expect(md).toContain('| 8 | WSH fecha o lote | ⏭️ pulado | - | - | - | - | - |');
  });

  it('sem falha diz que tudo concluiu e trata lote ausente', () => {
    const trace = finalizeTrace({ id: 't2', flowId: 'venda', startedAt: 1_700_000_000_000, steps: createEmptyTimeline() }, 1_700_000_000_500);
    const md = buildTraceEvidenceMarkdown(trace);

    expect(md).toContain('## Rastreio de Integração\n');
    expect(md).toContain('- **Lote:** não identificado');
    expect(md).toContain('todos os passos observados concluíram sem falha');
    expect(md).toContain('- **Duração total:** 500 ms');
  });

  it('escapa barras verticais e quebras de linha nas células da tabela', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'ch-send', status: 'failed', source: 'http', message: 'HTTP 500 | corpo:\nerro' });
    const md = buildTraceEvidenceMarkdown(finalizeTrace({ id: 't3', flowId: 'f', startedAt: 1, steps }, 2));

    expect(md).toContain('HTTP 500 \\| corpo: erro |');
  });
});
