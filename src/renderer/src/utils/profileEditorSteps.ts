import type { AutomationStep, AutomationStepType } from '../../../shared/types';

const STEP_DEFAULT_NAMES: Partial<Record<AutomationStepType, string>> = {
  command: 'Novo Comando',
  'kill-port': 'Liberar Porta',
  'service-start': 'Iniciar Serviço',
  'service-stop': 'Parar Serviço',
  'kill-process': 'Finalizar Processo',
  ide: 'Iniciar IDE',
  karaf: 'Iniciar Karaf Debug',
  browser: 'Abrir Navegador',
  'db-query': 'Executar SQL'
};

export const isNamedTargetStep = (type: AutomationStepType): boolean =>
  type === 'service-start' || type === 'service-stop' || type === 'kill-process';

export const isStepIncomplete = (step: AutomationStep): boolean =>
  step.type === 'db-query' && (!step.dbConnectionId || !step.sql || !step.sql.trim());

export const createProfileEditorStep = (type: AutomationStepType = 'command'): AutomationStep => ({
  id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  name: STEP_DEFAULT_NAMES[type] ?? 'Novo Passo',
  type,
  enabled: true,
  command: type === 'command' ? '' : undefined,
  cwd: '',
  port: type === 'kill-port' ? 8080 : undefined,
  targetName: '',
  launchMode: type === 'command' ? 'wt' : undefined,
  delayAfterSeconds: 2,
  dbConnectionId: type === 'db-query' ? '' : undefined,
  sql: type === 'db-query' ? '' : undefined
});

export const createDefaultProfileSteps = (): AutomationStep[] => [
  {
    id: `step-${Date.now()}-1`,
    name: 'Comando de Exemplo',
    type: 'command',
    enabled: true,
    command: 'npm run dev',
    cwd: '',
    port: 3000,
    launchMode: 'wt',
    delayAfterSeconds: 2
  }
];

/** Aplica os campos e, se o tipo mudou, limpa os campos que não fazem sentido no novo tipo. */
export const applyStepUpdate = (
  current: AutomationStep,
  fields: Partial<AutomationStep>
): AutomationStep => {
  const updated = { ...current, ...fields };

  if (fields.type && fields.type !== current.type) {
    const newType = fields.type;
    if (newType !== 'command' && newType !== 'kill-port') {
      updated.port = undefined;
      updated.waitForPort = false;
    }
    if (newType !== 'command') {
      updated.command = undefined;
      updated.cwd = '';
      updated.launchMode = undefined;
    }
    if (newType !== 'browser') {
      updated.browserUrl = undefined;
    }
    if (!isNamedTargetStep(newType)) {
      updated.targetName = undefined;
    }
    if (newType !== 'db-query') {
      updated.dbConnectionId = undefined;
      updated.sql = undefined;
    }
  }

  return updated;
};

/** Normaliza a etapa antes de salvar, removendo campos incompatíveis com o tipo. */
export const normalizeStepForSave = (step: AutomationStep): AutomationStep => {
  const cleaned = { ...step };
  if (isNamedTargetStep(cleaned.type)) {
    if (!cleaned.targetName || !cleaned.targetName.trim()) {
      cleaned.targetName = cleaned.name.trim();
    }
    cleaned.command = undefined;
    cleaned.port = undefined;
    cleaned.waitForPort = false;
    cleaned.cwd = '';
  } else if (cleaned.type === 'kill-port') {
    cleaned.command = undefined;
    cleaned.targetName = undefined;
    cleaned.cwd = '';
  } else if (cleaned.type === 'ide' || cleaned.type === 'karaf') {
    cleaned.command = undefined;
    cleaned.port = undefined;
    cleaned.targetName = undefined;
    cleaned.cwd = '';
  } else if (cleaned.type === 'browser') {
    cleaned.command = undefined;
    cleaned.port = undefined;
    cleaned.targetName = undefined;
  } else if (cleaned.type === 'db-query') {
    cleaned.command = undefined;
    cleaned.port = undefined;
    cleaned.targetName = undefined;
    cleaned.cwd = '';
  }
  return cleaned;
};

export const swapSteps = (steps: AutomationStep[], index: number, targetIndex: number): AutomationStep[] => {
  const copy = [...steps];
  const temp = copy[index];
  copy[index] = copy[targetIndex];
  copy[targetIndex] = temp;
  return copy;
};

/** Índice selecionado após remover a etapa `removedIndex`; null se a removida era a selecionada. */
export const selectedIndexAfterRemove = (selected: number | null, removedIndex: number): number | null => {
  if (selected === removedIndex) return null;
  if (selected !== null && selected > removedIndex) return selected - 1;
  return selected;
};

/** Índice selecionado após trocar `index` com `targetIndex`. */
export const selectedIndexAfterMove = (
  selected: number | null,
  index: number,
  targetIndex: number
): number | null => {
  if (selected === index) return targetIndex;
  if (selected === targetIndex) return index;
  return selected;
};

export const describeStepSubtitle = (step: AutomationStep, globalDebugPort: number): string => {
  const portPart = step.type === 'karaf' ? ` • :${step.port ?? globalDebugPort}` : step.port ? ` • :${step.port}` : '';
  const targetPart = isNamedTargetStep(step.type) && (step.targetName || step.name) ? ` • ${step.targetName || step.name}` : '';
  return `${step.type}${portPart}${targetPart}`;
};
