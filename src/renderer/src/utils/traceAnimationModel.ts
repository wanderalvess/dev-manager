import {
  INTEGRATION_STEP_ORDER,
  stepLabel,
  type IntegrationStepId,
  type IntegrationStepStatus,
  type IntegrationTraceResult,
  type IntegrationTraceStore
} from '../../../shared/integrationTypes';

/**
 * Modelo puro da vista animada do rastreio: o que o lote percorre, onde para e como as lojas aparecem no fim.
 * A animação só desenha o que o rastreio provou; nada aqui inventa estado.
 */

export interface Point {
  x: number;
  y: number;
}

export interface AnimStep {
  id: string;
  label: string;
  status: IntegrationStepStatus;
  /** Duração da etapa na animação, derivada da duração real quando existe. */
  animMs: number;
}

export interface AnimEndpoint {
  key: string;
  label: string;
  status: IntegrationStepStatus;
  /** Texto curto para o detalhe ao clicar: status no PDVSync e o primeiro erro. */
  detail: string;
  errors: { id?: string; message: string }[];
  y: number;
}

export interface TraceAnimationModel {
  /** Falso para rastreios gravados antes do modelo de passos atual: não há trilho a desenhar. */
  canonical: boolean;
  steps: AnimStep[];
  /** Último passo que a animação percorre: o que quebrou, ou a chegada nas lojas. */
  stopIndex: number;
  endpoints: AnimEndpoint[];
}

export const MAX_VISIBLE_STORES = 6;
export const SCENE = { width: 680, height: 260, nodeY: 130, endpointX: 600, branchFromX: 430 } as const;

/** Onde o lote está em cada passo: WinThor, a meio caminho, WSH, a meio caminho e PDVSync (quatro passos lá dentro). */
export const STEP_POSITIONS: readonly Point[] = [
  { x: 90, y: 130 },
  { x: 175, y: 130 },
  { x: 260, y: 130 },
  { x: 345, y: 130 },
  { x: 430, y: 130 },
  { x: 430, y: 130 },
  { x: 430, y: 130 },
  { x: 430, y: 130 }
];

/** Escala logarítmica: 10 ms e 6 s cabem na mesma animação sem uma etapa demorar uma eternidade. */
export function animationStepMs(durationMs?: number): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) return 600;
  return Math.round(Math.min(1400, Math.max(350, 350 + Math.log10(1 + durationMs) * 250)));
}

const SEVERITY: Record<IntegrationStepStatus, number> = { failed: 4, pending: 3, unknown: 2, skipped: 1, ok: 0 };

/** O pior status de um grupo (falha pesa mais que pendência, que pesa mais que falta de evidência). */
export function worstStatus(statuses: IntegrationStepStatus[]): IntegrationStepStatus {
  return statuses.reduce<IntegrationStepStatus>((worst, status) => (SEVERITY[status] > SEVERITY[worst] ? status : worst), 'ok');
}

/** Distribui as lojas na vertical, centradas no trilho. */
export function endpointYs(count: number, top = 40, bottom = 220): number[] {
  if (count <= 1) return [SCENE.nodeY];
  const gap = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(top + gap * i));
}

/** Ponto de uma curva de Bézier cúbica, usado para levar o lote do PDVSync até cada loja. */
export function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Pontos de controle do ramo do PDVSync até a loja na altura `y`. */
export function branchControls(y: number): [Point, Point, Point, Point] {
  const from = { x: SCENE.branchFromX, y: SCENE.nodeY };
  const to = { x: SCENE.endpointX - 15, y };
  return [from, { x: from.x + 90, y: from.y }, { x: from.x + 90, y }, to];
}

function storeEndpoint(store: IntegrationTraceStore, index: number): Omit<AnimEndpoint, 'y'> {
  const label = `Loja ${store.branchId ?? index + 1}`;
  const firstError = store.errors[0];
  return {
    key: `loja-${store.branchId ?? index}`,
    label,
    status: store.status,
    errors: store.errors,
    detail: firstError ? `${store.statusName}: ${firstError.id ? `${firstError.id} · ` : ''}${firstError.message}` : store.statusName
  };
}

function buildEndpoints(trace: Pick<IntegrationTraceResult, 'stores' | 'steps'>): AnimEndpoint[] {
  const stores = trace.stores ?? [];
  let items: Omit<AnimEndpoint, 'y'>[];
  if (stores.length === 0) {
    const arrival = trace.steps.find((step) => step.id === 'pdv-arrival');
    items = [{ key: 'pdv', label: 'PDV', status: arrival?.status ?? 'unknown', errors: [], detail: arrival?.message ?? 'Sem status por loja.' }];
  } else if (stores.length <= MAX_VISIBLE_STORES) {
    items = stores.map(storeEndpoint);
  } else {
    const visible = stores.slice(0, MAX_VISIBLE_STORES - 1);
    const rest = stores.slice(MAX_VISIBLE_STORES - 1);
    const restErrors = rest.flatMap((store) => store.errors);
    items = [
      ...visible.map(storeEndpoint),
      {
        key: 'demais-lojas',
        label: `+${rest.length} lojas`,
        status: worstStatus(rest.map((store) => store.status)),
        errors: restErrors,
        detail: `${rest.filter((store) => store.status === 'ok').length} de ${rest.length} baixaram.`
      }
    ];
  }
  const ys = endpointYs(items.length);
  return items.map((item, index) => ({ ...item, y: ys[index] }));
}

/** Monta o roteiro da animação. Rastreios antigos, com ids de passo que não existem mais, seguem a ordem guardada. */
export function buildAnimationModel(trace: Pick<IntegrationTraceResult, 'steps' | 'brokenAt' | 'stores'>): TraceAnimationModel {
  const byId = new Map(trace.steps.map((step) => [step.id as string, step]));
  const canonical = INTEGRATION_STEP_ORDER.every((id) => byId.has(id));
  const ordered = canonical ? INTEGRATION_STEP_ORDER.map((id) => byId.get(id)!) : trace.steps;
  const steps: AnimStep[] = ordered.map((step) => ({
    id: step.id,
    label: stepLabel(step.id),
    status: step.status,
    animMs: animationStepMs(step.durationMs)
  }));
  const brokenIndex = trace.brokenAt ? steps.findIndex((step) => step.id === trace.brokenAt) : -1;
  return {
    canonical,
    steps,
    stopIndex: brokenIndex >= 0 ? brokenIndex : steps.length - 1,
    endpoints: buildEndpoints(trace)
  };
}

/** Quadro da animação: em que passo o lote está e quanto dele já percorreu. */
export interface TimelineFrame {
  index: number;
  t: number;
  done: boolean;
}

/** Converte o tempo decorrido no quadro atual. `Infinity` leva direto ao estado final. */
export function timelineAt(model: TraceAnimationModel, elapsedMs: number): TimelineFrame {
  let rest = Math.max(0, elapsedMs);
  for (let i = 0; i <= model.stopIndex; i++) {
    const ms = model.steps[i].animMs;
    if (rest < ms) return { index: i, t: rest / ms, done: false };
    rest -= ms;
  }
  return { index: model.stopIndex, t: 1, done: true };
}

/** Um passo só ganha cor depois que o lote passou por ele; o que vem depois da quebra nunca é revelado. */
export function isRevealed(frame: TimelineFrame, index: number): boolean {
  return frame.done ? index <= frame.index : index < frame.index;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Posição do lote no trilho durante o passo `index` (sai do ponto do passo anterior e chega no dele). */
export function trackPoint(index: number, t: number): Point {
  const last = STEP_POSITIONS.length - 1;
  const to = STEP_POSITIONS[Math.min(Math.max(index, 0), last)];
  const from = index <= 0 ? to : STEP_POSITIONS[Math.min(index - 1, last)];
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** Passos que acontecem dentro de cada sistema, mostrados como pontos de status sob o nome. */
export const NODE_STEPS: Readonly<Record<'winthor' | 'wsh' | 'pdvsync', readonly IntegrationStepId[]>> = {
  winthor: ['winthor-login', 'winthor-fetch'],
  wsh: ['jolt', 'pdvsync-login'],
  pdvsync: ['open-batch', 'send', 'close-batch']
};
