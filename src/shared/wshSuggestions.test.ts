import { describe, expect, it } from 'vitest';
import type { WshDependency, WshItem } from './wshMonitorTypes';
import { parseObservation, splitErrorsByItem } from './wshObservation';
import { suggestionFields, suggestWshFixes } from './wshSuggestions';

// Respostas reais do PDVSync (coleta de 2026-10-25)
const PRODUTO = '{"success":false,"errors":{"0":{"impostos":["O campo não pode ser nulo ou vazio"],"identificadorExterno":["273-273"]},"1":{"impostos":["O campo não pode ser nulo ou vazio"],"identificadorExterno":["274-274"]}},"totalTime":2055,"numberOfRecords":25}';
const COBRANCA = '{"success":false,"errors":{"1":{"tipo":["Valor inválido para o tipo de dado \'Enum\'"],"identificadorExterno":["PIXS"],"linkDocumentacao":["https://tdn.totvs.com/display/TVPO/Forma+de+pagamento"]},"7":{"tipo":["Valor inválido para o tipo de dado \'Enum\'"],"identificadorExterno":["PIX"],"linkDocumentacao":["https://tdn.totvs.com/display/TVPO/Forma+de+pagamento"]}}}';

function item(route: string, externalId: string, raw: string, tone: WshItem['tone'] = 'error'): WshItem {
  const observation = parseObservation(raw)!;
  const { own, others } = splitErrorsByItem(externalId, observation.errors);
  return { id: 1, status: '3', statusLabel: 'Erro', tone, externalId, route, hasTransformedData: true, observation, ownErrors: own, otherErrors: others };
}

const deps = (overrides: Partial<WshDependency>[]): WshDependency[] =>
  overrides.map((o) => ({ flowId: '07', flowName: 'ICMS', route: 'WTA - Buscar ICMS', found: true, periodTotal: 0, periodErrors: 0, ...o }));

describe('suggestWshFixes', () => {
  it('produto 1000: corrigir os itens que derrubaram o envio, impostos vazio e a dependência do ICMS', () => {
    const result = suggestWshFixes(item('WTA - Buscar Produto PDV', 'pdvsync-produto-1000-1-1-x', PRODUTO), deps([{ lastTone: 'ok', lastLabel: 'Integrado' }]));
    expect(result.map((s) => s.kind)).toEqual(['fix-items', 'empty-field', 'dependency']);
    expect(result[0].detail).toContain('273-273, 274-274');
    expect(result[1].title).toBe('"impostos" foi vazio em 273-273, 274-274');
    expect(result[2].title).toBe('"impostos" vem do FLUXO-07 · ICMS');
    expect(suggestionFields(result)).toEqual(['impostos']);
  });

  it('dependência que nunca integrou é dita como tal; outra dependência quebrada também aparece', () => {
    const result = suggestWshFixes(
      item('WTA - Buscar Produto PDV', 'pdvsync-produto-1000-1-1-x', PRODUTO),
      deps([{ flowId: '07', found: false }, { flowId: '05', flowName: 'NCM CEST', found: true, lastTone: 'error' }])
    );
    const dependency = result.filter((s) => s.kind === 'dependency');
    expect(dependency[0].detail).toContain('nunca integrou neste banco');
    expect(dependency[1].title).toBe('FLUXO-05 · NCM CEST está com erro');
  });

  it('cobrança PIXS: valor fora do Enum, com o link do TDN e o campo para o layout', () => {
    const result = suggestWshFixes(item('WTA - Buscar tipos cobrancas', 'pdvsync-cobranca-PIXs-2026-06-19T16:10:22', COBRANCA));
    const enumSuggestion = result.find((s) => s.kind === 'enum')!;
    expect(enumSuggestion.title).toBe('O PDVSync não aceita o valor de "tipo"');
    expect(enumSuggestion.detail).toContain('PIXS, PIX');
    expect(enumSuggestion.docUrl).toBe('https://tdn.totvs.com/display/TVPO/Forma+de+pagamento');
    expect(enumSuggestion.fields).toEqual(['tipo']);
    // O erro próprio de Enum não vira um "corrija o campo" genérico além da explicação
    expect(result.some((s) => s.kind === 'fix-field')).toBe(false);
  });

  it('item integrado não tem sugestão; erro sem detalhe manda abrir a resposta', () => {
    expect(suggestWshFixes(item('WTA - Buscar Produto PDV', 'x', PRODUTO, 'ok'))).toEqual([]);
    const bare = suggestWshFixes(item('XPTO - Rota', 'x', '{"success":false}'));
    expect(bare.map((s) => s.kind)).toEqual(['no-detail']);
  });

  it('venda recusada pelo WinThor num campo de origem conhecida: diz de onde o WSH tirou o valor', () => {
    const recusa = '{"success":false,"errors":{"0":{"codCob":["Cobrança não cadastrada"],"identificadorExterno":["1-3-10905"]}}}';
    const venda = item('PDVSYNC - Buscar vendas', 'pdvsync-vendamensagem-50277-x', recusa);
    const origin = suggestWshFixes(venda).find((s) => s.kind === 'origin')!;
    expect(origin.title).toBe('"codCob" vem de VendaPagamentos[].PagamentoForma.IdRetaguarda no PDVSync');
    expect(origin.detail).toContain('falta no WinThor o cadastro equivalente');
  });

  it('recebimento fala do WinThor', () => {
    const venda = item('PDVSYNC - Buscar vendas', 'pdvsync-venda-1', COBRANCA);
    expect(suggestWshFixes(venda).find((s) => s.kind === 'enum')?.title).toBe('O WinThor não aceita o valor de "tipo"');
  });
});
