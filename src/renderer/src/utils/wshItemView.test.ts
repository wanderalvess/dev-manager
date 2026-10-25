import { describe, expect, it } from 'vitest';
import type { WshItem } from '../../../shared/wshMonitorTypes';
import { describeWshItem, wshItemMarkdown, wshItemTrace } from './wshItemView';

const item = (overrides: Partial<WshItem> = {}): WshItem => ({
  id: 25679,
  status: '3',
  statusLabel: 'Erro',
  tone: 'error',
  attempts: 1,
  externalId: 'pdvsync-produto-1000-1-1-2026-06-25T11:47:08',
  route: 'WTA - Buscar Produto PDV',
  sendRoute: 'PDVSYNC - Salvar Produto',
  requestId: 'c795ab26',
  createdAt: new Date(2026, 5, 25, 15, 30, 16).getTime(),
  syncedAt: new Date(2026, 5, 25, 15, 30, 27).getTime(),
  hasTransformedData: true,
  observation: { success: false, errors: [], totalTimeMs: 2055, records: 25, raw: '{}', truncated: false },
  ownErrors: [],
  otherErrors: [{ externalId: '273-273', field: 'impostos', messages: ['O campo não pode ser nulo ou vazio'] }],
  ...overrides
});

describe('describeWshItem', () => {
  it('recusado só por outros itens do envio: diz isso, em vez de culpar o item', () => {
    expect(describeWshItem(item())).toMatchObject({ tone: 'danger', title: 'Recusado junto com o envio' });
  });

  it('erro próprio aparece com o campo e a mensagem', () => {
    const own = item({ ownErrors: [{ externalId: '1000-1', field: 'impostos', messages: ['vazio'] }] });
    expect(describeWshItem(own)).toEqual({ tone: 'danger', title: 'O PDVSync recusou este item', detail: '1000-1 · impostos: vazio' });
  });

  it('integrado e status desconhecido', () => {
    expect(describeWshItem(item({ tone: 'ok', status: '2', statusLabel: 'Integrado' })).tone).toBe('success');
    expect(describeWshItem(item({ tone: 'other', status: '7', statusLabel: 'Status 7' }))).toMatchObject({ tone: 'muted', title: 'Status 7' });
  });
});

describe('wshItemTrace', () => {
  it('quebra no envio; abertura, fechamento e chegada ficam sem evidência', () => {
    const trace = wshItemTrace(item());
    expect(trace.brokenAt).toBe('send');
    expect(trace.steps.map((s) => [s.id, s.status])).toEqual([
      ['winthor-login', 'ok'],
      ['winthor-fetch', 'ok'],
      ['jolt', 'ok'],
      ['pdvsync-login', 'ok'],
      ['open-batch', 'unknown'],
      ['send', 'failed'],
      ['close-batch', 'unknown'],
      ['pdv-arrival', 'unknown']
    ]);
    expect(trace.steps[5].durationMs).toBe(2055);
  });

  it('item ainda não enviado: envio pendente e login do PDVSync sem evidência', () => {
    const trace = wshItemTrace(item({ tone: 'other', status: '1', sendRoute: undefined, syncedAt: undefined, hasTransformedData: false }));
    expect(trace.brokenAt).toBeUndefined();
    expect(trace.steps.find((s) => s.id === 'send')).toMatchObject({ status: 'pending', message: 'Ainda não enviado ao PDVSync.' });
    expect(trace.steps.find((s) => s.id === 'pdvsync-login')?.status).toBe('unknown');
    expect(trace.steps.find((s) => s.id === 'jolt')?.status).toBe('unknown');
  });
});

describe('wshItemMarkdown', () => {
  it('resume o item e lista os erros do envio', () => {
    const md = wshItemMarkdown(item());
    expect(md).toContain('**Recusado junto com o envio** — `pdvsync-produto-1000-1-1-2026-06-25T11:47:08`');
    expect(md).toContain('- Status no WSH: Erro (STATUS 3), 1 tentativa(s)');
    expect(md).toContain('requisição c795ab26');
    expect(md).toContain('- 273-273 · impostos: O campo não pode ser nulo ou vazio');
  });
});
