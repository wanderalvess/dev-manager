import { describe, expect, it } from 'vitest';
import { joltFieldMappings, targetField } from './joltFieldMap';

// Recorte do LAYOUTTRANSFORMACAO real da rota "WTA - BUSCAR TIPOS COBRANCAS" (winthor-smart-hub-layouts)
const COBRANCAS = JSON.stringify([
  {
    operation: 'shift',
    spec: {
      items: {
        '*': {
          idExterno: 'items.[&1].idExterno',
          codOperadoraCartao: {
            cartao_null: {
              '@(2,id)': {
                D: { '#1': 'items.[&5].tipo' },
                TR: { '#0': 'items.[&5].tipo' },
                'CH*': { '#4': 'items.[&5].tipo' },
                'PIX*': { '#8': 'items.[&5].tipo' },
                '*': { '#0': 'items.[&5].tipo' }
              }
            }
          }
        }
      }
    }
  },
  { operation: 'default', spec: { status: 2 } },
  { operation: 'modify-overwrite-beta', spec: { items: { '*': { tipo: '=toInteger' } } } }
]);

describe('joltFieldMappings', () => {
  it('acha cada regra que escreve "tipo", com o valor fixo e as condições', () => {
    const mappings = joltFieldMappings(COBRANCAS, 'tipo', ['PIXS', 'PIX']);
    expect(mappings.map((m) => [m.path.join(' › '), m.value])).toEqual([
      ['codOperadoraCartao › cartao_null › @(2,id) › D', '1'],
      ['codOperadoraCartao › cartao_null › @(2,id) › TR', '0'],
      ['codOperadoraCartao › cartao_null › @(2,id) › CH*', '4'],
      ['codOperadoraCartao › cartao_null › @(2,id) › PIX*', '8'],
      ['codOperadoraCartao › cartao_null › @(2,id) › qualquer outro', '0'],
      ['', '=toInteger']
    ]);
    // PIXS e PIX casam com PIX*: é a regra que mandou o valor recusado
    expect(mappings.find((m) => m.value === '8')).toMatchObject({ step: 1, operation: 'shift', matches: ['PIXS', 'PIX'] });
    expect(mappings.find((m) => m.value === '1')?.matches).toEqual([]);
    expect(mappings.at(-1)).toMatchObject({ step: 3, operation: 'modify-overwrite-beta', target: 'tipo' });
  });

  it('valor fixo do shift é texto até a conversão do passo seguinte', () => {
    const pix = joltFieldMappings(COBRANCAS, 'tipo', ['PIXS']).find((m) => m.value === '8');
    expect(pix).toMatchObject({ literalText: true, convertedBy: '=toInteger no passo 3' });
  });

  it('ignora a custom-totvs (só decodifica Base64) e marca variável do WSH', () => {
    const layout = JSON.stringify([
      { operation: 'custom-totvs', spec: { data: { '*': { conteudo: '=base64ToObject' } } } },
      { operation: 'default', spec: { items: { '*': { idProprietario: '{{MASTER_ID_PROPRIETARIO}}' } } } }
    ]);
    expect(joltFieldMappings(layout, 'conteudo')).toEqual([]);
    expect(joltFieldMappings(layout, 'idProprietario')[0]).toMatchObject({ step: 2, value: '{{MASTER_ID_PROPRIETARIO}}', wshVariable: true });
  });

  it('campo de default e layout inválido', () => {
    expect(joltFieldMappings(COBRANCAS, 'status')).toEqual([{ step: 2, operation: 'default', path: [], target: 'status', value: '2', matches: [] }]);
    expect(joltFieldMappings('não é json', 'tipo')).toEqual([]);
    expect(joltFieldMappings(JSON.stringify({ spec: {} }), 'tipo')).toEqual([]);
  });

  it('targetField tira índices e pega o último nome', () => {
    expect(targetField('items.[&5].tipo')).toBe('tipo');
    expect(targetField('data.lojaLotes[&3].status')).toBe('status');
  });
});
