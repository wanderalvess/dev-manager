import { describe, expect, it } from 'vitest';
import { describeOrderJson, describeOrderOperation, describeOrderStatus, markUnanswered, parseOrderRejection, prettyOrderJson, type OnlineOrderLogEntry } from './onlineOrderLog';

describe('log de pedidos online', () => {
  it('operação: I inclusão, A alteração, C cancelamento', () => {
    expect(['I', 'a', ' C '].map(describeOrderOperation)).toEqual(['Inclusão', 'Alteração', 'Cancelamento']);
    expect(describeOrderOperation('Z')).toBe('Operação Z');
    expect(describeOrderOperation(undefined)).toBe('Sem operação');
  });

  it('status: A aceito, R rejeitado, P processando', () => {
    expect(describeOrderStatus('A')).toEqual({ label: 'Aceito', tone: 'ok' });
    expect(describeOrderStatus('r')).toEqual({ label: 'Rejeitado', tone: 'error' });
    expect(describeOrderStatus('P')).toEqual({ label: 'Processando', tone: 'pending' });
    expect(describeOrderStatus('X')).toEqual({ label: 'Status X', tone: 'other' });
  });

  it('indenta só o JSON completo e válido', () => {
    expect(prettyOrderJson('{"a":1}', false)).toBe('{\n  "a": 1\n}');
    expect(prettyOrderJson('{"a":', true)).toBe('{"a":');
    expect(prettyOrderJson('não é json', false)).toBe('não é json');
  });

  it('o R traz o motivo no lugar do JSON: código do WinThor e mensagem, sem o "{ [] }" do fim', () => {
    expect(parseOrderRejection('(WT-IM-0000239) -> Pedido HUB ou Market Place já incluído. { [] }')).toEqual({
      code: 'WT-IM-0000239',
      message: 'Pedido HUB ou Market Place já incluído.'
    });
    expect(parseOrderRejection('Cliente bloqueado')).toEqual({ message: 'Cliente bloqueado' });
    expect(parseOrderRejection('{"numero":"1"}')).toBeUndefined();
    expect(parseOrderRejection(undefined)).toBeUndefined();
    expect(describeOrderJson('P')).toBe('Pedido como chegou do PDV');
  });

  it('cada A ou R fecha um único P do mesmo pedido; o P que sobra, passado o prazo, fica "Sem resposta"', () => {
    const at = (min: number) => Date.UTC(2026, 8, 25, 15, min);
    const row = (orderNumber: string, status: string, date: number) =>
      ({ orderNumber, status, date, statusLabel: status, tone: 'other', operation: 'I', operationLabel: 'Inclusão', jsonTruncated: false }) as OnlineOrderLogEntry;
    // Da mais nova para a mais antiga, como a consulta devolve; no mesmo segundo o desfecho vem antes do P
    const entries = [row('843', 'P', at(33)), row('843', 'A', at(32)), row('843', 'P', at(32)), row('841', 'R', at(30)), row('841', 'P', at(30)), row('900', 'P', at(59))];

    const marked = markUnanswered(entries, at(60));

    expect(marked.map((e) => Boolean(e.unanswered))).toEqual([true, false, false, false, false, false]);
    expect(marked[0].statusLabel).toBe('Sem resposta');
  });
});
