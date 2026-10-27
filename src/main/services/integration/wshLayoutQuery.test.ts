import { describe, expect, it } from 'vitest';
import { buildLayoutQuery, toRouteLayouts, validateLayoutRequest } from './wshLayoutQuery';

const LAYOUT = JSON.stringify([
  { operation: 'shift', spec: { items: { '*': { '@(1,id)': { 'PIX*': { '#8': 'items.[&3].tipo' } } } } } }
]);

describe('layout das rotas do WSH', () => {
  it('valida rotas, campos e identificadores', () => {
    expect(validateLayoutRequest({ routes: ['WTA - Buscar tipos cobrancas'], fields: ['tipo'], itemIds: ['PIXS'] })).toMatchObject({ ok: true });
    expect(validateLayoutRequest({ routes: [], fields: ['tipo'] })).toMatchObject({ ok: false });
    expect(validateLayoutRequest({ routes: ['a', 'b', 'c'], fields: ['tipo'] })).toMatchObject({ ok: false });
    expect(validateLayoutRequest({ routes: ['a'], fields: ['x'.repeat(200)] })).toMatchObject({ ok: false });
  });

  it('rotas por bind, normalizadas, e só as colunas do layout', () => {
    const { sql, binds } = buildLayoutQuery(['WTA - Buscar tipos cobrancas', 'PDVSYNC - Enviar formas de pgto']);
    expect(sql).toContain('in (:r0, :r1)');
    expect(sql).not.toMatch(/pcintegracaocore|variaveis|dados/i);
    expect(binds).toEqual({ r0: 'WTA - BUSCAR TIPOS COBRANCAS', r1: 'PDVSYNC - ENVIAR FORMAS DE PGTO' });
  });

  it('acha as regras do campo na rota encontrada; rota sem linha fica como não encontrada', () => {
    const request = { routes: ['WTA - Buscar tipos cobrancas', 'PDVSYNC - Enviar formas de pgto'], fields: ['tipo'], itemIds: ['PIXS'] };
    const layouts = toRouteLayouts(request, [{ SERVICO: 'WTA - BUSCAR TIPOS COBRANCAS', LAYOUTTRANSFORMACAO: LAYOUT }]);
    expect(layouts[0]).toMatchObject({ route: 'WTA - Buscar tipos cobrancas', found: true });
    expect(layouts[0].fields[0].mappings[0]).toMatchObject({ value: '8', matches: ['PIXS'] });
    expect(layouts[1]).toEqual({ route: 'PDVSYNC - Enviar formas de pgto', found: false, fields: [] });
  });
});
