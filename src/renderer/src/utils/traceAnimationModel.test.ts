import { describe, expect, it } from 'vitest';
import { INTEGRATION_STEP_ORDER, type IntegrationTraceStep, type IntegrationTraceStore } from '../../../shared/integrationTypes';
import {
  animationStepMs,
  branchControls,
  buildAnimationModel,
  cubicPoint,
  easeInOut,
  endpointHeight,
  endpointYs,
  isRevealed,
  MAX_VISIBLE_STORES,
  nodeStatus,
  sceneStatus,
  storesSummary,
  timelineAt,
  trackPoint,
  worstStatus
} from './traceAnimationModel';
import { canGoLive, decideLive, LIVE_MAX_ATTEMPTS, secondsUntil } from './liveTrace';
import { INBOUND_SCENE } from './traceSceneProfiles';

const steps = (overrides: Partial<Record<string, Partial<IntegrationTraceStep>>> = {}): IntegrationTraceStep[] =>
  INTEGRATION_STEP_ORDER.map((id) => ({ id, status: 'unknown' as const, source: 'none' as const, ...overrides[id] }));
const store = (branchId: string, status: IntegrationTraceStore['status'], errors: IntegrationTraceStore['errors'] = []): IntegrationTraceStore => ({
  branchId, status, statusName: status === 'ok' ? 'BaixadoComSucesso' : 'BaixadoComErro', errors
});

describe('animationStepMs', () => {
  it('sem duração usa o padrão; com duração cresce devagar e fica entre 350 e 1400 ms', () => {
    expect(animationStepMs(undefined)).toBe(600);
    expect(animationStepMs(-1)).toBe(600);
    expect(animationStepMs(0)).toBe(350);
    const fast = animationStepMs(20);
    const slow = animationStepMs(6000);
    expect(fast).toBeLessThan(slow);
    expect(slow).toBeLessThanOrEqual(1400);
    expect(animationStepMs(10_000_000)).toBe(1400);
  });
});

describe('buildAnimationModel', () => {
  it('percorre os oito passos na ordem real e vai até as lojas quando nada quebrou antes', () => {
    const model = buildAnimationModel({ steps: steps({ 'winthor-fetch': { status: 'ok', durationMs: 900 } }), stores: [] });
    expect(model.steps.map((s) => s.id)).toEqual([...INTEGRATION_STEP_ORDER]);
    expect(model.stopIndex).toBe(7);
    expect(model.steps[1]).toMatchObject({ label: 'Busca na API do WinThor', status: 'ok' });
  });

  it('para no passo que quebrou', () => {
    const model = buildAnimationModel({ steps: steps({ 'winthor-fetch': { status: 'failed' } }), brokenAt: 'winthor-fetch' });
    expect(model.stopIndex).toBe(1);
  });

  it('sem status por loja mostra um único destino PDV com o status da chegada', () => {
    const model = buildAnimationModel({ steps: steps({ 'pdv-arrival': { status: 'pending', message: 'Lote em EmProcessoDeBaixa.' } }) });
    expect(model.endpoints).toEqual([{ key: 'pdv', label: 'PDV', status: 'pending', errors: [], detail: 'Lote em EmProcessoDeBaixa.', y: 135 }]);
  });

  it('uma loja por destino, com o primeiro erro no detalhe', () => {
    const model = buildAnimationModel({
      steps: steps(),
      stores: [store('1', 'ok'), store('2', 'failed', [{ id: 'PROD-7', message: 'NCM inválido' }])]
    });
    expect(model.endpoints.map((e) => [e.label, e.status, e.detail])).toEqual([
      ['Loja 1', 'ok', 'BaixadoComSucesso'],
      ['Loja 2', 'failed', 'BaixadoComErro: PROD-7 · NCM inválido']
    ]);
    expect(model.endpoints.map((e) => e.y)).toEqual([40, 230]);
  });

  it('muitas lojas: mostra as primeiras e agrupa o resto com o pior status', () => {
    const stores = Array.from({ length: 10 }, (_, i) => store(String(i + 1), i === 8 ? 'failed' : 'ok'));
    const model = buildAnimationModel({ steps: steps(), stores });

    expect(model.endpoints).toHaveLength(MAX_VISIBLE_STORES);
    const rest = model.endpoints[MAX_VISIBLE_STORES - 1];
    expect(rest).toMatchObject({ label: '+5 lojas', status: 'failed', detail: '4 de 5 baixaram.' });
  });

  it('rastreio antigo, com ids que não existem mais, segue a ordem guardada', () => {
    const legacy = [{ id: 'ch-send' as never, status: 'failed' as const, source: 'none' as const }];
    const model = buildAnimationModel({ steps: legacy, brokenAt: 'ch-send' as never });
    expect(model.canonical).toBe(false);
    expect(model.steps).toEqual([{ id: 'ch-send', label: 'ch-send', shortLabel: 'ch-send', status: 'failed', animMs: 600 }]);
    expect(model.stopIndex).toBe(0);
  });
});

describe('perfil do desenho', () => {
  it('envio é o padrão; recebimento troca o nome dos sistemas, dos passos e do destino', () => {
    const outbound = buildAnimationModel({ steps: steps() });
    expect(outbound.profile.nodeLabels.winthor).toBe('WinThor');
    expect(outbound.steps[4].shortLabel).toBe('Abertura');

    const inbound = buildAnimationModel({ steps: steps() }, INBOUND_SCENE);
    expect(inbound.profile.nodeLabels).toEqual({ winthor: 'PDVSync', wsh: 'WSH', pdvsync: 'WinThor' });
    expect(inbound.steps.map((s) => s.label)[4]).toBe('Envio ao WinThor');
    expect(inbound.steps[4].shortLabel).toBe('Envio');
    expect(inbound.endpoints[0].label).toBe('Retaguarda');
  });
});

describe('linha do tempo', () => {
  const model = buildAnimationModel({ steps: steps({ 'winthor-fetch': { status: 'failed' } }), brokenAt: 'winthor-fetch' });

  it('avança passo a passo e termina no passo que quebrou', () => {
    expect(timelineAt(model, 0)).toEqual({ index: 0, t: 0, done: false });
    expect(timelineAt(model, 300)).toEqual({ index: 0, t: 0.5, done: false });
    expect(timelineAt(model, 900)).toEqual({ index: 1, t: 0.5, done: false });
    expect(timelineAt(model, Number.POSITIVE_INFINITY)).toEqual({ index: 1, t: 1, done: true });
  });

  it('só revela o que o lote já percorreu; depois da quebra nada é revelado', () => {
    const final = timelineAt(model, Number.POSITIVE_INFINITY);
    expect(isRevealed(final, 1)).toBe(true);
    expect(isRevealed(final, 2)).toBe(false);
    expect(isRevealed(timelineAt(model, 900), 1)).toBe(false);
    expect(isRevealed(timelineAt(model, 900), 0)).toBe(true);
  });

  it('o lote sai do ponto do passo anterior e chega no do passo atual', () => {
    expect(trackPoint(0, 0.5)).toEqual({ x: 90, y: 135 });
    expect(trackPoint(1, 0.5)).toEqual({ x: 136, y: 135 });
    expect(trackPoint(6, 1)).toEqual({ x: 458, y: 135 });
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });
});

describe('geometria', () => {
  it('worstStatus: falha > pendente > sem evidência > pulado > ok', () => {
    expect(worstStatus(['ok', 'pending', 'unknown'])).toBe('pending');
    expect(worstStatus(['ok', 'failed', 'pending'])).toBe('failed');
    expect(worstStatus(['ok', 'skipped'])).toBe('skipped');
    expect(worstStatus([])).toBe('ok');
  });

  it('endpointYs centraliza um destino e espalha vários', () => {
    expect(endpointYs(1)).toEqual([135]);
    expect(endpointYs(3)).toEqual([40, 135, 230]);
  });

  it('a curva do ramo começa no PDVSync e termina na loja', () => {
    const controls = branchControls(40);
    expect(cubicPoint(...controls, 0)).toEqual({ x: 528, y: 135 });
    expect(cubicPoint(...controls, 1)).toEqual({ x: 596, y: 40 });
  });
});

describe('estado no desenho', () => {
  const model = buildAnimationModel({
    steps: steps({ 'winthor-login': { status: 'ok' }, 'winthor-fetch': { status: 'failed' } }),
    brokenAt: 'winthor-fetch'
  });
  const final = timelineAt(model, Number.POSITIVE_INFINITY);

  it('passo provado mostra o status; depois da quebra é "não alcançado", nunca "sem evidência"', () => {
    expect(sceneStatus(model, final, 1)).toBe('failed');
    expect(sceneStatus(model, final, 2)).toBe('unreached');
    expect(sceneStatus(model, timelineAt(model, 0), 0)).toBe('unreached');
  });

  it('cada sistema assume o pior status provado; sem nada provado fica neutro', () => {
    expect(nodeStatus(model, final, 'winthor')).toBe('failed');
    expect(nodeStatus(model, final, 'wsh')).toBe('unreached');
  });

  it('cartões de loja encolhem quando há muitas lojas', () => {
    expect(endpointHeight(2)).toBe(44);
    expect(endpointHeight(6)).toBe(32);
  });

  it('resumo das lojas para o ao vivo', () => {
    expect(storesSummary({ stores: [store('1', 'ok'), store('2', 'pending')] })).toBe('1 de 2 lojas baixaram');
    expect(storesSummary({ stores: [store('1', 'ok')] })).toBe('a loja baixou');
    expect(storesSummary({ stores: [] })).toBeNull();
  });
});

describe('modo ao vivo', () => {
  const trace = (status: IntegrationTraceStep['status'], message?: string) => ({ steps: steps({ 'pdv-arrival': { status, message } }) });

  it('só acompanha chegada em andamento', () => {
    expect(canGoLive(trace('pending'))).toBe(true);
    expect(canGoLive(trace('ok'))).toBe(false);
    expect(canGoLive(null)).toBe(false);
  });

  it('para quando as lojas terminam, quando falha, quando deixa de ser pendente e no teto de consultas', () => {
    expect(decideLive(trace('pending'), 3)).toEqual({ keepGoing: true });
    expect(decideLive(trace('ok'), 3)).toMatchObject({ keepGoing: false, tone: 'success' });
    expect(decideLive(trace('failed', 'Loja 2 com erro.'), 3)).toEqual({ keepGoing: false, reason: 'Loja 2 com erro.', tone: 'error' });
    expect(decideLive(trace('unknown'), 3)).toMatchObject({ keepGoing: false, tone: 'info' });
    expect(decideLive(trace('pending'), LIVE_MAX_ATTEMPTS)).toMatchObject({ keepGoing: false, tone: 'info' });
  });

  it('contagem regressiva em segundos, nunca negativa', () => {
    expect(secondsUntil(10_500, 1_000)).toBe(10);
    expect(secondsUntil(1_000, 5_000)).toBe(0);
    expect(secondsUntil(null, 5_000)).toBe(0);
  });
});
