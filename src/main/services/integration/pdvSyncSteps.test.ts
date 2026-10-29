import { describe, expect, it } from 'vitest';
import { describeStatus } from '../../../shared/pdvSyncBatch';
import type { IntegrationTraceStep } from '../../../shared/integrationTypes';
import type { PdvSyncBatch, PdvSyncLookup, PdvSyncStore } from './pdvSyncClient';
import { mergeArrivalSteps, stepsFromLookup, unknownStep } from './pdvSyncSteps';

const batch = (statusCode: number | undefined, found = true): PdvSyncBatch => ({
  found, batchNumber: '100', statusCode, status: describeStatus(statusCode)
});
const store = (branchId: string, statusCode: number, errors: PdvSyncStore['errors'] = []): PdvSyncStore => ({
  branchId, statusCode, status: describeStatus(statusCode), errors
});
const lookup = (overrides: Partial<PdvSyncLookup>): PdvSyncLookup => ({ durationMs: 10, ...overrides });

describe('stepsFromLookup: lote', () => {
  it('lote que existe: abertura ok e fechamento ok quando já saiu de EmPreparacao', () => {
    const steps = stepsFromLookup(lookup({ batch: batch(2) }), '100');

    expect(steps.open).toMatchObject({ id: 'open-batch', status: 'ok', source: 'ch-api' });
    expect(steps.open.message).toBe('O lote existe no PDVSync (status Disponivel).');
    expect(steps.close).toMatchObject({ id: 'close-batch', status: 'ok' });
    expect(steps.close.message).toContain('já saiu de EmPreparacao (agora Disponivel)');
  });

  it('lote ainda em EmPreparacao: o fechamento fica pendente, nunca ok', () => {
    const steps = stepsFromLookup(lookup({ batch: batch(0) }), '100');

    expect(steps.close.status).toBe('pending');
    expect(steps.close.message).toContain('o WSH pode não ter fechado');
    expect(steps.open.status).toBe('ok');
  });

  it('status que o Hub não conhece deixa o fechamento sem evidência', () => {
    expect(stepsFromLookup(lookup({ batch: batch(42) }), '100').close.status).toBe('unknown');
  });

  it('o PDVSync não conhece o lote: nada é provado e a nota aponta número, inquilino e ambiente', () => {
    const steps = stepsFromLookup(lookup({ batch: batch(undefined, false) }), '100');

    for (const step of [steps.open, steps.close, steps.arrival]) expect(step.status).toBe('unknown');
    expect(steps.notes[0]).toContain('não conhece o lote 100');
  });

  it('login ou consulta falhou: três passos sem evidência e o erro nas observações', () => {
    const steps = stepsFromLookup(lookup({ error: 'O PDVSync recusou o login (HTTP 401).' }), '100');

    for (const step of [steps.open, steps.close, steps.arrival]) {
      expect(step.status).toBe('unknown');
      expect(step.message).toContain('recusou o login');
    }
    expect(steps.notes).toEqual(['Consulta ao PDVSync falhou: O PDVSync recusou o login (HTTP 401).']);
  });
});

describe('stepsFromLookup: chegada nas lojas', () => {
  it('todas as lojas baixaram: ok', () => {
    const { arrival } = stepsFromLookup(lookup({ batch: batch(5), stores: [store('1', 5), store('2', 5)] }), '100');
    expect(arrival).toMatchObject({ status: 'ok', source: 'ch-api', itemCount: 2, message: 'Todas as 2 lojas baixaram o lote.' });
  });

  it('uma loja só: a mensagem fala no singular', () => {
    const { arrival } = stepsFromLookup(lookup({ batch: batch(5), stores: [store('1', 5)] }), '100');
    expect(arrival.message).toBe('A loja baixou o lote.');
  });

  it('uma loja com erro derruba o passo e mostra o motivo de cada erro', () => {
    const { arrival } = stepsFromLookup(
      lookup({ batch: batch(5), stores: [store('1', 5), store('2', 6, [{ id: 'PROD-7', message: 'NCM inválido' }])] }),
      '100'
    );

    expect(arrival.status).toBe('failed');
    expect(arrival.message).toBe('1 de 2 loja(s) com erro ao baixar o lote (filial 2).');
    expect(arrival.evidence).toBe('loja 2 · PROD-7: NCM inválido');
    expect(arrival.itemCount).toBe(1);
  });

  it('loja com erro sem detalhe mostra o nome do status', () => {
    const { arrival } = stepsFromLookup(lookup({ batch: batch(5), stores: [store('3', 6)] }), '100');
    expect(arrival.evidence).toBe('loja 3: BaixadoComErro');
  });

  it('parte baixou e parte ainda baixa: pendente, com a contagem', () => {
    const { arrival } = stepsFromLookup(lookup({ batch: batch(4), stores: [store('1', 5), store('2', 4), store('3', 2)] }), '100');
    expect(arrival).toMatchObject({ status: 'pending', itemCount: 1, message: '1 de 3 loja(s) baixaram o lote; 2 ainda em andamento.' });
  });

  it('muitos erros: a evidência limita as linhas e informa quantas faltaram', () => {
    const stores = Array.from({ length: 12 }, (_, i) => store(String(i + 1), 6, [{ id: `P${i}`, message: 'erro' }]));
    const { arrival } = stepsFromLookup(lookup({ batch: batch(5), stores }), '100');
    expect(arrival.evidence?.split('\n')).toHaveLength(9);
    expect(arrival.evidence).toContain('(+4 linha(s))');
  });

  it('sem status por loja, o status do lote decide', () => {
    const arrival = (code: number) => stepsFromLookup(lookup({ batch: batch(code), stores: [] }), '100').arrival;

    expect(arrival(5).status).toBe('ok');
    expect(arrival(6).status).toBe('failed');
    expect(arrival(9).status).toBe('failed');
    expect(arrival(2).status).toBe('pending');
    expect(arrival(4).status).toBe('pending');
    expect(arrival(7).status).toBe('unknown');
    expect(arrival(7).message).toContain('não prova que as lojas baixaram');
  });

  it('falha no status por loja cai para o status do lote e avisa nas observações', () => {
    const steps = stepsFromLookup(lookup({ batch: batch(5), storesError: 'HTTP 500' }), '100');
    expect(steps.arrival.status).toBe('ok');
    expect(steps.notes).toEqual(['Status por loja indisponível, usei só o status do lote: HTTP 500']);
  });
});

describe('stepsFromLookup: lojas para a tela', () => {
  it('traduz o status de cada loja para o vocabulário do rastreio, com os erros', () => {
    const steps = stepsFromLookup(
      lookup({ batch: batch(5), stores: [store('1', 5), store('2', 6, [{ id: 'P', message: 'erro' }]), store('3', 4), store('4', 7)] }),
      '100'
    );
    expect(steps.stores).toEqual([
      { branchId: '1', status: 'ok', statusName: 'BaixadoComSucesso', errors: [] },
      { branchId: '2', status: 'failed', statusName: 'BaixadoComErro', errors: [{ id: 'P', message: 'erro' }] },
      { branchId: '3', status: 'pending', statusName: 'EmProcessoDeBaixa', errors: [] },
      { branchId: '4', status: 'unknown', statusName: 'EnviadoComSucesso', errors: [] }
    ]);
  });

  it('sem consulta, sem lote ou sem status por loja não há lojas', () => {
    expect(stepsFromLookup(lookup({ error: 'x' }), '1').stores).toEqual([]);
    expect(stepsFromLookup(lookup({ batch: batch(undefined, false) }), '1').stores).toEqual([]);
    expect(stepsFromLookup(lookup({ batch: batch(5) }), '1').stores).toEqual([]);
  });
});

describe('mergeArrivalSteps', () => {
  const step = (status: IntegrationTraceStep['status'], source: IntegrationTraceStep['source'], message: string, evidence?: string): IntegrationTraceStep => ({
    id: 'pdv-arrival', status, source, message, evidence
  });

  it('uma fonte só passa direto; nenhuma fonte é sem evidência', () => {
    const only = step('ok', 'sql', 'achou');
    expect(mergeArrivalSteps(undefined, only)).toBe(only);
    expect(mergeArrivalSteps(only, undefined)).toBe(only);
    expect(mergeArrivalSteps(undefined, undefined)).toMatchObject({ status: 'unknown', source: 'none' });
  });

  it('as duas provam: ok, com as duas mensagens', () => {
    const merged = mergeArrivalSteps(step('ok', 'ch-api', 'Todas baixaram.'), step('ok', 'sql', 'Achou 3.'));
    expect(merged).toMatchObject({ status: 'ok', source: 'ch-api', message: 'Todas baixaram. Achou 3.' });
  });

  it('um prova e o outro não sabe: vale a prova', () => {
    expect(mergeArrivalSteps(step('unknown', 'none', 'Sem evidência: x'), step('ok', 'sql', 'Achou 3.'))).toMatchObject({ status: 'ok', source: 'sql' });
  });

  it('falha do PDVSync vence, mesmo que o banco tenha o dado, e a mensagem avisa do conflito', () => {
    const merged = mergeArrivalSteps(step('failed', 'ch-api', 'Loja 2 com erro.', 'loja 2: NCM'), step('ok', 'sql', 'Achou 3.'));
    expect(merged.status).toBe('failed');
    expect(merged.message).toBe('Loja 2 com erro. Mas o banco do PDV confirma a chegada.');
    expect(merged.evidence).toBe('loja 2: NCM');
  });

  it('PDVSync em andamento e dado ainda ausente no banco: pendente, não falha', () => {
    const merged = mergeArrivalSteps(step('pending', 'ch-api', '1 de 3 baixaram.'), step('failed', 'sql', 'Nenhum registro após 60 s.', 'consulta devolveu 0'));
    expect(merged.status).toBe('pending');
    expect(merged.message).toBe('1 de 3 baixaram. O dado ainda não apareceu no banco do PDV: Nenhum registro após 60 s.');
  });

  it('banco falha e o PDVSync não tem opinião: falha', () => {
    expect(mergeArrivalSteps(step('unknown', 'none', 'Sem evidência: y'), step('failed', 'sql', 'Nenhum registro.')).status).toBe('failed');
  });

  it('as duas sem evidência: junta os motivos', () => {
    const merged = mergeArrivalSteps(unknownStep('pdv-arrival', 'sem PDVSync.'), unknownStep('pdv-arrival', 'sem banco.'));
    expect(merged).toMatchObject({ status: 'unknown', source: 'none', message: 'Sem evidência: sem PDVSync. Sem evidência: sem banco.' });
  });
});
