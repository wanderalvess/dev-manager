import { describe, expect, it } from 'vitest';
import {
  WSH_CATEGORY_ORDER,
  WSH_FLOWS,
  findFlowById,
  findFlowByRoute,
  flowDirection,
  flowLabel,
  hintedDependencies,
  normalizeRouteName
} from './wshFlowCatalog';

describe('catálogo dos fluxos do WSH', () => {
  it('ids únicos, categorias conhecidas e dependências que existem no catálogo', () => {
    const ids = WSH_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of WSH_FLOWS) {
      expect(WSH_CATEGORY_ORDER).toContain(f.category);
      for (const dep of f.dependsOn ?? []) expect(findFlowById(dep), `${f.id} depende de ${dep}`).toBeDefined();
      for (const dep of Object.values(f.fieldHints ?? {})) expect(f.dependsOn).toContain(dep);
    }
  });

  it('cada rota de busca aponta para um só fluxo', () => {
    const routes = WSH_FLOWS.map((f) => normalizeRouteName(f.searchRoute));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('acha o fluxo pelo nome que o banco grava, com maiúsculas e espaços diferentes', () => {
    // Nomes reais da PCINTEGRACAOROTASERVICO na coleta de 2026-10-25
    expect(findFlowByRoute('WTA - Buscar Perfil PADRAO')?.id).toBe('04');
    expect(findFlowByRoute('WTA - Buscar tipos cobrancas')?.id).toBe('14');
    expect(findFlowByRoute('WTA - PDVSYNC Compartilhamento Master')?.id).toBe('01');
    expect(findFlowByRoute('PDVSYNC - Buscar vendas')?.id).toBe('16');
    expect(findFlowByRoute('  wta -  buscar produto pdv ')?.id).toBe('09');
    expect(findFlowByRoute('WTA - Rota que não existe')).toBeUndefined();
    expect(findFlowByRoute(undefined)).toBeUndefined();
  });

  it('Preço Oferta, visto no ambiente e fora do levantamento: sem número de fluxo, depende do Produto', () => {
    const oferta = findFlowByRoute('WTA - Buscar Preco Oferta');
    expect(oferta).toMatchObject({ category: 'Preços', direction: 'envio', dependsOn: ['09'] });
    expect(flowLabel(oferta!)).toBe('Preço Oferta');
  });

  it('sentido: catálogo primeiro, prefixo da rota para o que não está nele', () => {
    expect(flowDirection('WTA - Buscar Produto PDV')).toBe('envio');
    expect(flowDirection('PDVSYNC - Buscar vendas')).toBe('recebimento');
    expect(flowDirection('PDVSYNC - Rota nova')).toBe('recebimento');
    expect(flowDirection('WTA - Rota nova')).toBe('envio');
  });

  it('o campo recusado aponta a dependência provável', () => {
    const produto = findFlowById('09');
    expect(flowLabel(produto!)).toBe('FLUXO-09 · Produto');
    expect(hintedDependencies(produto, ['impostos', 'Impostos', 'descricao'])).toEqual(['07']);
    expect(hintedDependencies(produto, ['pisCofins', 'ncms'])).toEqual(['06', '05']);
    expect(hintedDependencies(findFlowById('11'), ['impostos'])).toEqual([]);
  });
});
