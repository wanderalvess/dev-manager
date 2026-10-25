import {
  stepLabel,
  type IntegrationStepStatus,
  type IntegrationTraceListItem,
  type IntegrationTraceResult
} from '../../../shared/integrationTypes';
import type { ReadinessTone, ReadinessVerdict } from './integrationReadinessView';

/**
 * Apresentação pura do rastreio de lote (decisão 0003): rótulos, tons, veredito em uma frase e
 * formatos. Sem JSX para poder ser testada sem renderizar a página.
 */

export const STEP_STATUS_LABELS: Readonly<Record<IntegrationStepStatus, string>> = {
  ok: 'ok',
  failed: 'falhou',
  pending: 'pendente',
  skipped: 'pulado',
  unknown: 'sem evidência'
};

export const STEP_STATUS_TONES: Readonly<Record<IntegrationStepStatus, ReadinessTone>> = {
  ok: 'success',
  failed: 'danger',
  // Âmbar como no percurso animado e no veredito: em andamento não é problema, mas pede atenção
  pending: 'warning',
  skipped: 'muted',
  unknown: 'muted'
};

export const LOOKBACK_OPTIONS: readonly { minutes: number; label: string }[] = [
  { minutes: 30, label: 'Últimos 30 minutos' },
  { minutes: 60, label: 'Última hora' },
  { minutes: 120, label: 'Últimas 2 horas' },
  { minutes: 360, label: 'Últimas 6 horas' },
  { minutes: 1440, label: 'Últimas 24 horas' },
  { minutes: 4320, label: 'Últimos 3 dias' }
];

const LOG_SOURCE_NAMES = { wsh: 'WSH', ch: 'CH' } as const;

/**
 * Veredito do rastreio: onde quebrou, ou o quanto foi possível provar. Verde só quando a chegada no
 * PDV foi provada e nenhum log citou erro com o lote; nunca "tudo certo" sem ter provado.
 */
export function describeTrace(trace: Pick<IntegrationTraceResult, 'brokenAt' | 'steps' | 'logExcerpts'>): ReadinessVerdict {
  const total = trace.steps.length;
  const count = (status: IntegrationStepStatus) => trace.steps.filter((step) => step.status === status).length;

  if (trace.brokenAt) {
    const position = trace.steps.findIndex((step) => step.id === trace.brokenAt) + 1;
    const step = trace.steps.find((s) => s.id === trace.brokenAt);
    return {
      tone: 'danger',
      title: `Quebrou no passo ${position}: ${stepLabel(trace.brokenAt)}`,
      detail: step?.message ?? 'Veja a evidência do passo.'
    };
  }
  const ok = count('ok');
  const unknown = count('unknown');
  const balance = `${ok} de ${total} passos provados; ${unknown} sem evidência.`;
  if (ok === 0) {
    return { tone: 'muted', title: 'Sem evidência suficiente', detail: `Nenhum dos ${total} passos pôde ser provado com as fontes configuradas.` };
  }
  const withErrors = (trace.logExcerpts ?? []).filter((excerpt) => excerpt.errorLines > 0);
  if (withErrors.length > 0) {
    const where = withErrors.map((excerpt) => `${excerpt.errorLines} no ${LOG_SOURCE_NAMES[excerpt.source]}`).join(' e ');
    return { tone: 'warning', title: 'Sem falha provada, mas os logs têm erros', detail: `Linhas de erro citando o lote: ${where}. ${balance}` };
  }
  const arrival = trace.steps.find((step) => step.id === 'pdv-arrival');
  if (arrival?.status === 'pending') {
    return { tone: 'warning', title: 'Chegada nas lojas em andamento', detail: `${arrival.message ?? 'As lojas ainda não terminaram de baixar o lote.'} ${balance}` };
  }
  if (arrival?.status !== 'ok') {
    return { tone: 'warning', title: 'Chegada no PDV não provada', detail: `Nenhuma falha encontrada, mas a chegada nas lojas não foi confirmada. ${balance}` };
  }
  return { tone: 'success', title: 'Nenhuma falha nos passos observados', detail: balance };
}

export function formatTraceDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`;
}

export function formatTraceTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Resumo de uma linha do histórico: o que quebrou ou o saldo de passos provados. */
export function summarizeListItem(item: IntegrationTraceListItem): string {
  if (item.brokenAt) return `Quebrou: ${stepLabel(item.brokenAt)}`;
  if (item.okSteps === 0) return 'Sem evidência suficiente';
  return `${item.okSteps} ok, ${item.unknownSteps} sem evidência`;
}

/** A lista só tem contagens e não sabe se o PDV foi provado: só a falha ganha cor, para não dar verde que o veredito não dá. */
export function listItemTone(item: IntegrationTraceListItem): ReadinessTone {
  return item.brokenAt ? 'danger' : 'muted';
}
