import { describe, expect, it } from 'vitest';
import {
  INTEGRATION_STEP_ORDER,
  type IntegrationTraceListItem,
  type IntegrationTraceStep
} from '../../../shared/integrationTypes';
import {
  describeTrace,
  formatTraceDuration,
  listItemTone,
  LOOKBACK_OPTIONS,
  summarizeListItem
} from './integrationTraceView';

const step = (id: IntegrationTraceStep['id'], status: IntegrationTraceStep['status'], message?: string): IntegrationTraceStep => ({
  id,
  status,
  source: 'none',
  message
});

/** Os oito passos na ordem real, todos sem evidência, com os ajustes pedidos. */
const timeline = (overrides: Partial<Record<IntegrationTraceStep['id'], IntegrationTraceStep['status']>> = {}, messages: Partial<Record<IntegrationTraceStep['id'], string>> = {}) =>
  INTEGRATION_STEP_ORDER.map((id) => step(id, overrides[id] ?? 'unknown', messages[id]));

const listItem = (overrides: Partial<IntegrationTraceListItem> = {}): IntegrationTraceListItem => ({
  id: 't', flowId: 'f', startedAt: 1, okSteps: 0, failedSteps: 0, unknownSteps: 0, ...overrides
});

describe('describeTrace', () => {
  it('quebrou: mostra a posição e o rótulo do passo e a mensagem dele', () => {
    const steps = timeline({ 'winthor-fetch': 'ok', 'pdv-arrival': 'failed' }, { 'pdv-arrival': '1 de 2 loja(s) com erro ao baixar o lote (filial 2).' });
    expect(describeTrace({ brokenAt: 'pdv-arrival', steps })).toEqual({
      tone: 'danger',
      title: 'Quebrou no passo 8: Chegada nas lojas (PDV)',
      detail: '1 de 2 loja(s) com erro ao baixar o lote (filial 2).'
    });
  });

  it('rastreio antigo com id de passo que não existe mais não quebra a tela', () => {
    const steps = [step('open-batch', 'unknown'), { ...step('pdv-arrival', 'unknown'), id: 'ch-send' as never }];
    expect(describeTrace({ brokenAt: 'ch-send' as never, steps }).title).toBe('Quebrou no passo 2: ch-send');
  });

  it('verde só com a chegada nas lojas provada, e com o saldo de sem evidência', () => {
    const steps = timeline({ 'winthor-fetch': 'ok', 'open-batch': 'ok', 'close-batch': 'ok', 'pdv-arrival': 'ok' });
    expect(describeTrace({ steps })).toEqual({
      tone: 'success',
      title: 'Nenhuma falha nos passos observados',
      detail: '4 de 8 passos provados; 4 sem evidência.'
    });
  });

  it('chegada em andamento: aviso que pede para esperar, com a contagem de lojas', () => {
    const steps = timeline({ 'open-batch': 'ok', 'pdv-arrival': 'pending' }, { 'pdv-arrival': '1 de 3 loja(s) baixaram o lote; 2 ainda em andamento.' });
    expect(describeTrace({ steps })).toMatchObject({ tone: 'warning', title: 'Chegada nas lojas em andamento' });
    expect(describeTrace({ steps }).detail).toContain('1 de 3 loja(s) baixaram o lote; 2 ainda em andamento.');
  });

  it('chegada não provada nunca fica verde, mesmo sem nenhuma falha', () => {
    const steps = timeline({ 'winthor-fetch': 'ok' });
    expect(describeTrace({ steps })).toMatchObject({ tone: 'warning', title: 'Chegada no PDV não provada' });
  });

  it('erro em log citando o lote vira aviso, nomeando onde está', () => {
    const steps = timeline({ 'winthor-fetch': 'ok', 'pdv-arrival': 'ok' });
    const logExcerpts = [
      { source: 'wsh' as const, lines: [], totalMatches: 2, errorLines: 0, truncated: false },
      { source: 'ch' as const, lines: [], totalMatches: 3, errorLines: 2, truncated: false }
    ];
    expect(describeTrace({ steps, logExcerpts })).toEqual({
      tone: 'warning',
      title: 'Sem falha provada, mas os logs têm erros',
      detail: 'Linhas de erro citando o lote: 2 no CH. 2 de 8 passos provados; 6 sem evidência.'
    });
  });

  it('falha de passo pesa mais que erro de log', () => {
    const steps = timeline({ 'pdv-arrival': 'failed' }, { 'pdv-arrival': 'não desceu' });
    const logExcerpts = [{ source: 'ch' as const, lines: [], totalMatches: 1, errorLines: 1, truncated: false }];
    expect(describeTrace({ brokenAt: 'pdv-arrival', steps, logExcerpts }).tone).toBe('danger');
  });

  it('nada provado nunca vira sucesso', () => {
    const verdict = describeTrace({ steps: timeline() });
    expect(verdict.tone).toBe('muted');
    expect(verdict.title).toBe('Sem evidência suficiente');
  });
});

describe('histórico', () => {
  it('resumo e tom por linha', () => {
    expect(summarizeListItem(listItem({ brokenAt: 'send' }))).toBe('Quebrou: Envio do JSON ao lote');
    expect(summarizeListItem(listItem({ brokenAt: 'ch-send' as never }))).toBe('Quebrou: ch-send');
    expect(summarizeListItem(listItem({ okSteps: 2, unknownSteps: 6 }))).toBe('2 ok, 6 sem evidência');
    expect(summarizeListItem(listItem())).toBe('Sem evidência suficiente');
    expect(listItemTone(listItem({ brokenAt: 'send' }))).toBe('danger');
    expect(listItemTone(listItem({ okSteps: 1 }))).toBe('muted');
    expect(listItemTone(listItem())).toBe('muted');
  });
});

describe('formatos e opções', () => {
  it('duração em ms ou segundos com vírgula', () => {
    expect(formatTraceDuration(undefined)).toBe('');
    expect(formatTraceDuration(900)).toBe('900 ms');
    expect(formatTraceDuration(61_500)).toBe('61,5 s');
  });

  it('as janelas oferecidas são crescentes, com a padrão de 2 horas', () => {
    const minutes = LOOKBACK_OPTIONS.map((o) => o.minutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    expect(minutes).toContain(120);
  });
});
