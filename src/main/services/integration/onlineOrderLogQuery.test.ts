import { describe, expect, it, vi } from 'vitest';
import { buildOrderLogSearch, searchOrderLog, toOrderLogEntry, validateOrderLogSearch } from './onlineOrderLogQuery';

describe('consulta da PCLOGPEDIDOAPI', () => {
  it('valida o pedido (só dígitos), o status e o período', () => {
    expect(validateOrderLogSearch({ orderNumber: ' 4521 ' })).toMatchObject({ ok: true, value: { orderNumber: 4521, status: 'all', limit: 100 } });
    expect(validateOrderLogSearch({ orderNumber: "1' or 1=1" })).toMatchObject({ ok: false });
    expect(validateOrderLogSearch({ status: 'X' as never })).toMatchObject({ ok: true, value: { status: 'all' } });
    expect(validateOrderLogSearch({ lookbackHours: 99999 })).toMatchObject({ ok: false });
  });

  it('com o pedido, ignora o período; sem ele, filtra pela data; status entra por bind', () => {
    const byOrder = buildOrderLogSearch({ orderNumber: 7, status: 'R', lookbackHours: 24, limit: 50 }, Date.now());
    expect(byOrder.sql).toContain('l.numped = :numped');
    expect(byOrder.sql).toContain("order by l.data desc, case when upper(l.status) = 'P' then 1 else 0 end");
    expect(byOrder.sql).not.toContain(':inicio');
    expect(byOrder.binds).toEqual({ numped: 7, status: 'R', limite: 50 });

    const byPeriod = buildOrderLogSearch({ status: 'all', lookbackHours: 24, limit: 50 }, new Date(2026, 9, 28, 12).getTime());
    expect(byPeriod.sql).toContain(':inicio');
    expect(byPeriod.sql).not.toContain(':status');
    expect(byPeriod.binds.inicio).toBe('2026-10-27 12:00:00');
  });

  it('traduz operação e status, e marca o JSON cortado', () => {
    const entry = toOrderLogEntry({ data: '2026-10-28T10:00:00', numped: 9, posicao: ' F ', operacao: 'c', status: 'a', json_trecho: '{"x":', json_tamanho: 9000 });
    expect(entry).toMatchObject({ orderNumber: '9', position: 'F', operationLabel: 'Cancelamento', statusLabel: 'Aceito', tone: 'ok', jsonTruncated: true });
    expect(toOrderLogEntry({ NUMPED: 1, OPERACAO: 'A', STATUS: 'P' })).toMatchObject({ operationLabel: 'Alteração', tone: 'pending', jsonTruncated: false });
    expect(toOrderLogEntry({ NUMPED: 2, OPERACAO: 'I', STATUS: 'R', JSON_TRECHO: '(WT-IM-0000239) -> Pedido já incluído. { [] }' }).reason).toEqual({
      code: 'WT-IM-0000239',
      message: 'Pedido já incluído.'
    });
  });

  it('erro do banco volta como mensagem, e o período só vem quando não há pedido', async () => {
    const failing = vi.fn(async () => ({ success: false, error: 'ORA-00942: table or view does not exist' }));
    expect(await searchOrderLog({}, failing, Date.now())).toEqual({ success: false, error: 'ORA-00942: table or view does not exist' });

    const empty = vi.fn(async () => ({ success: true, rows: [] }));
    expect(await searchOrderLog({ orderNumber: '1' }, empty, Date.now())).toEqual({ success: true, entries: [], limit: 100 });
    expect(await searchOrderLog({}, empty, Date.now())).toMatchObject({ lookbackHours: 24 });
  });
});
