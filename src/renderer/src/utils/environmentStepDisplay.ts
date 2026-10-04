import type { AutomationStep } from '../../../shared/types';

/** Rótulo curto do modo de execução; o terceiro modo muda de nome conforme o tipo de etapa. */
export function getLaunchModeLabel(type: 'karaf' | 'command', launchMode: string): string {
  if (launchMode === 'wt') return 'WT Abas';
  if (launchMode === 'cmd') return 'CMD';
  return type === 'karaf' ? 'Console' : 'Background';
}

export interface StepSatisfactionInput {
  step: AutomationStep;
  stepNumber: number;
  isRunningProfile: boolean;
  activeStepIndex: number;
  isPortUp: boolean;
  serviceState?: string;
  processIsRunning?: boolean;
}

/** Indica se a etapa já está concluída na trilha: passou na esteira, porta ativa ou alvo no estado desejado. */
export function isStepDone(input: StepSatisfactionInput): boolean {
  const { step, stepNumber, isRunningProfile, activeStepIndex, isPortUp, serviceState, processIsRunning } = input;
  const isPast = isRunningProfile && activeStepIndex > stepNumber;
  const isServiceSatisfied =
    step.type === 'service-stop'
      ? serviceState === 'STOPPED'
      : step.type === 'service-start'
      ? serviceState === 'RUNNING'
      : step.type === 'kill-process'
      ? processIsRunning === false
      : false;
  return isPast || isPortUp || isServiceSatisfied;
}

/** Mantém no máximo `limit` entradas (as mais recentes) para o console não estourar memória. */
export function appendCapped<T>(prev: T[], entry: T, limit = 1000): T[] {
  const next = [...prev, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
