import type { IntegrationTraceResult } from '../../../shared/integrationTypes';

/**
 * Regras do modo ao vivo do rastreio: enquanto as lojas ainda baixam o lote, o Hub reconsulta o PDVSync de tempos
 * em tempos. Funções puras, para a regra de parada ser testada sem relógio nem rede.
 */

export const LIVE_INTERVAL_MS = 15_000;
/** Teto de reconsultas (10 minutos no intervalo padrão): um lote travado não fica sendo consultado para sempre. */
export const LIVE_MAX_ATTEMPTS = 40;

const arrivalOf = (trace: Pick<IntegrationTraceResult, 'steps'>) => trace.steps.find((step) => step.id === 'pdv-arrival');

/** Só faz sentido acompanhar quando a chegada ainda está em andamento. */
export function canGoLive(trace: Pick<IntegrationTraceResult, 'steps'> | null): boolean {
  return arrivalOf(trace ?? { steps: [] })?.status === 'pending';
}

export type LiveDecision =
  | { keepGoing: true }
  | { keepGoing: false; reason: string; tone: 'success' | 'error' | 'info' };

export function decideLive(trace: Pick<IntegrationTraceResult, 'steps'>, attempts: number, maxAttempts = LIVE_MAX_ATTEMPTS): LiveDecision {
  const arrival = arrivalOf(trace);
  if (arrival?.status === 'ok') return { keepGoing: false, reason: 'As lojas terminaram de baixar o lote.', tone: 'success' };
  if (arrival?.status === 'failed') return { keepGoing: false, reason: arrival.message ?? 'A chegada nas lojas falhou.', tone: 'error' };
  if (arrival?.status !== 'pending') return { keepGoing: false, reason: 'A chegada deixou de estar em andamento.', tone: 'info' };
  if (attempts >= maxAttempts) {
    return { keepGoing: false, reason: `Parei depois de ${maxAttempts} consultas: as lojas continuam baixando. Rastreie de novo mais tarde.`, tone: 'info' };
  }
  return { keepGoing: true };
}

/** Segundos até a próxima consulta, nunca negativo. */
export function secondsUntil(nextAt: number | null, now: number): number {
  return nextAt === null ? 0 : Math.max(0, Math.ceil((nextAt - now) / 1000));
}
