import { describe, expect, it } from 'vitest';
import { buildWshSearch, toWshItem, validateWshSearch } from './wshMonitorQuery';
import { describeWshStatus, formatWshError, parseObservation, splitErrorsByItem } from '../../../shared/wshObservation';

// Respostas reais do PDVSync gravadas pelo WSH na OBSERVACAO (coleta de 2026-10-25)
const PRODUTO_RECUSADO =
  '{"success":false,"message":null,"detailedMessage":null,"data":null,"errors":{"0":{"impostos":["O campo não pode ser nulo ou vazio"],"identificadorExterno":["273-273"]},"1":{"impostos":["O campo não pode ser nulo ou vazio"],"identificadorExterno":["274-274"]}},"totalTime":2055,"numberOfRecords":25}';
const PRECO_OK = '[200 OK] {"success":true,"message":null,"detailedMessage":null,"data":[0,0,0],"errors":null,"totalTime":3979,"numberOfRecords":59}';
const MAPA_JAVA = '{success=true, message=null, detailedMessage=null, data=[0.0, 0.0], errors=null, totalTime=81.0, numberOfRecords=14.0}';
const COBRANCA_CORTADA =
  '{"success":false,"message":null,"detailedMessage":null,"data":null,"errors":{"1":{"tipo":["Valor inválido para o tipo de dado \'Enum\'"],"identificadorExterno":["PIXS"],"linkDocumentacao":["https://tdn.totvs.com/x"]},"7":{"tipo":["Valor inválido para o tipo de dado \'Enum\'"],"identificadorExterno":["PIX"],"linkDocumentacao":["https://tdn.totvs.';

describe('parseObservation', () => {
  it('envio recusado: sucesso falso, um erro por item com o campo e a mensagem', () => {
    const obs = parseObservation(PRODUTO_RECUSADO)!;
    expect(obs.success).toBe(false);
    expect(obs.totalTimeMs).toBe(2055);
    expect(obs.records).toBe(25);
    expect(obs.errors).toEqual([
      { externalId: '273-273', field: 'impostos', messages: ['O campo não pode ser nulo ou vazio'] },
      { externalId: '274-274', field: 'impostos', messages: ['O campo não pode ser nulo ou vazio'] }
    ]);
  });

  it('prefixo HTTP e sucesso', () => {
    expect(parseObservation(PRECO_OK)).toMatchObject({ httpStatus: 200, success: true, errors: [], records: 59 });
  });

  it('toString de mapa Java', () => {
    expect(parseObservation(MAPA_JAVA)).toMatchObject({ success: true, totalTimeMs: 81, records: 14, errors: [] });
  });

  it('texto cortado: aproveita o que dá, ignora o link da documentação e marca como incompleto', () => {
    const obs = parseObservation(COBRANCA_CORTADA, 9000)!;
    expect(obs.truncated).toBe(true);
    expect(obs.errors.map((e) => [e.externalId, e.field])).toEqual([
      ['PIXS', 'tipo'],
      ['PIX', 'tipo']
    ]);
  });

  it('vazio não é observação', () => {
    expect(parseObservation('')).toBeUndefined();
    expect(parseObservation(null)).toBeUndefined();
  });
});

describe('erros do item e do envio', () => {
  const errors = parseObservation(COBRANCA_CORTADA)!.errors;

  it('separa o erro do item dos erros de outros itens do mesmo envio, sem diferenciar maiúsculas', () => {
    const { own, others } = splitErrorsByItem('pdvsync-cobranca-PIXs-2026-06-19T16:10:22', errors);
    expect(own.map((e) => e.externalId)).toEqual(['PIXS']);
    expect(others.map((e) => e.externalId)).toEqual(['PIX']);
  });

  it('produto 1000 recusado só por erro de outros itens', () => {
    const { own, others } = splitErrorsByItem('pdvsync-produto-1000-1-1-2026-06-25T11:47:08', parseObservation(PRODUTO_RECUSADO)!.errors);
    expect(own).toEqual([]);
    expect(others).toHaveLength(2);
  });

  it('rótulos de status e linha do erro', () => {
    expect(describeWshStatus('2')).toEqual({ label: 'Integrado', tone: 'ok' });
    expect(describeWshStatus('3')).toEqual({ label: 'Erro', tone: 'error' });
    expect(describeWshStatus('7')).toEqual({ label: 'Status 7', tone: 'other' });
    expect(formatWshError(errors[0])).toBe("PIXS · tipo: Valor inválido para o tipo de dado 'Enum'");
  });
});

describe('consulta', () => {
  const now = new Date(2026, 9, 25, 12, 0, 0).getTime();

  it('valida a entrada e aplica os padrões', () => {
    expect(validateWshSearch({})).toEqual({ ok: true, value: { status: 'all', lookbackHours: 72, limit: 100 } });
    expect(validateWshSearch({ routeId: -1 })).toMatchObject({ ok: false });
    expect(validateWshSearch({ lookbackHours: 24 * 365 })).toMatchObject({ ok: false });
    expect(validateWshSearch({ limit: 99999 })).toMatchObject({ ok: true, value: { limit: 500 } });
    expect(validateWshSearch({ text: 'x'.repeat(200) })).toMatchObject({ ok: false });
  });

  it('só binds: rota, texto escapado em maiúsculas, status e janela', () => {
    const valid = validateWshSearch({ routeId: 25, text: 'produto-1000_1%', status: 'error', lookbackHours: 24 });
    if (!valid.ok) throw new Error(valid.error);
    const { sql, binds } = buildWshSearch(valid.value, now);
    expect(sql).toContain('c.idrotaservico = :rota');
    // O texto procura também no IDINTERNO (venda: filial-série-cupom)
    expect(sql).toMatch(/upper\(c\.idexterno\) like :texto .* or upper\(c\.idinterno\) like :texto/);
    expect(sql).toContain(`c.status = '3'`);
    expect(sql).not.toMatch(/variaveis|dadosrecebidos|dadostransformados,/i);
    expect(binds).toEqual({ inicio: '2026-10-24 12:00:00', limite: 100, rota: 25, texto: '%PRODUTO-1000\\_1\\%%' });
  });

  it('linha do Oracle vira item, com datas e erros separados', () => {
    const item = toWshItem({
      ID: 25679, STATUS: '3', TENTATIVAS: 1, IDEXTERNO: 'pdvsync-produto-1000-1-1-2026-06-25T11:47:08',
      DATACRIACAO: new Date(2026, 5, 25, 15, 30, 16), DATASINCRONISMO: new Date(2026, 5, 25, 15, 30, 27), DTULTALTER: null,
      ROTA: 'WTA - Buscar Produto PDV', ROTA_ENVIO: 'PDVSYNC - Salvar Produto', IDREQUISICAOENVIO: 'c795ab26',
      TEM_TRANSFORMADO: 1, OBSERVACAO: PRODUTO_RECUSADO, OBSERVACAO_TAMANHO: PRODUTO_RECUSADO.length
    });
    expect(item).toMatchObject({
      id: 25679, statusLabel: 'Erro', tone: 'error', attempts: 1, sendRoute: 'PDVSYNC - Salvar Produto',
      requestId: 'c795ab26', hasTransformedData: true, ownErrors: []
    });
    expect(item.otherErrors).toHaveLength(2);
    expect(item.syncedAt! - item.createdAt!).toBe(11_000);
    expect(item.updatedAt).toBeUndefined();
    expect(item.internalId).toBeUndefined();
    // Venda real: o IDINTERNO é filial-série-cupom
    expect(toWshItem({ ID: 2, STATUS: '2', IDEXTERNO: 'pdvsync-vendamensagem-50277-x', IDINTERNO: '1-3-10905', ROTA: 'PDVSYNC - Buscar vendas' }).internalId).toBe('1-3-10905');
  });
});
