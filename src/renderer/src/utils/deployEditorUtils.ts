import type { DeployProfile, DeployStep, DeployStepType } from '../../../shared/types';

export const stepTypeDefaultName = (type: DeployStepType): string => {
  switch (type) {
    case 'maven-build':
      return 'Build Maven';
    case 'karaf-command':
      return 'Comando Karaf';
    case 'karaf-bundle':
      return 'Ação de Bundle OSGi';
    case 'docker-build':
      return 'Container Build';
    case 'docker-push':
      return 'Container Push';
    case 'docker-restart':
      return 'Reiniciar Container';
    case 'command':
      return 'Comando Genérico';
    case 'wait':
      return 'Aguardar Inicialização';
    case 'http-healthcheck':
      return 'Healthcheck HTTP';
    case 'service-action':
      return 'Ação de Serviço Windows';
    default:
      return 'Nova Etapa';
  }
};

export const generateStepId = (): string =>
  `deploy-step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const createDeployStep = (type: DeployStepType, id: string): DeployStep => ({
  id,
  name: stepTypeDefaultName(type),
  type,
  enabled: true,
  command: type === 'karaf-command' || type === 'command' ? '' : undefined,
  cwd: '',
  skipTests: type === 'maven-build' ? true : undefined
});

export interface DeployEditorInitialState {
  name: string;
  description: string;
  steps: DeployStep[];
  editingStepIndex: number | null;
}

export const buildInitialEditorState = (
  profile: DeployProfile | null,
  now: number
): DeployEditorInitialState => {
  if (profile) {
    return {
      name: profile.name || '',
      description: profile.description || '',
      steps: profile.steps ? structuredClone(profile.steps) : [],
      editingStepIndex: profile.steps && profile.steps.length > 0 ? 0 : null
    };
  }
  return {
    name: 'Novo Perfil de Deploy',
    description: 'Descrição das etapas de build e publicação',
    steps: [
      {
        id: `deploy-step-${now}-1`,
        name: 'Comando de Exemplo',
        type: 'command',
        enabled: true,
        command: 'echo "Configure aqui as etapas do seu deploy"',
        cwd: ''
      }
    ],
    editingStepIndex: 0
  };
};

// Índice selecionado depois de remover o passo `removedIndex`.
export const selectionAfterRemove = (editing: number | null, removedIndex: number): number | null => {
  if (editing === removedIndex) return null;
  if (editing !== null && editing > removedIndex) return editing - 1;
  return editing;
};

export const removeStepAt = (steps: DeployStep[], index: number): DeployStep[] =>
  steps.filter((_, i) => i !== index);

export const duplicateStepAt = (
  steps: DeployStep[],
  index: number,
  newId: string
): DeployStep[] | null => {
  const source = steps[index];
  if (!source) return null;
  const cloned: DeployStep = {
    ...structuredClone(source),
    id: newId,
    name: `${source.name} (Cópia)`
  };
  const next = [...steps];
  next.splice(index + 1, 0, cloned);
  return next;
};

export const moveTargetIndex = (
  index: number,
  direction: 'up' | 'down',
  length: number
): number | null => {
  const target = direction === 'up' ? index - 1 : index + 1;
  return target < 0 || target >= length ? null : target;
};

export const swapSteps = (steps: DeployStep[], a: number, b: number): DeployStep[] => {
  const copy = [...steps];
  const temp = copy[a];
  copy[a] = copy[b];
  copy[b] = temp;
  return copy;
};

// Mantém a seleção seguindo o passo que foi movido (ou o que trocou de lugar com ele).
export const selectionAfterMove = (
  editing: number | null,
  index: number,
  target: number
): number | null => {
  if (editing === index) return target;
  if (editing === target) return index;
  return editing;
};

export const patchStepAt = (
  steps: DeployStep[],
  index: number,
  fields: Partial<DeployStep>
): DeployStep[] => {
  const copy = [...steps];
  copy[index] = { ...copy[index], ...fields };
  return copy;
};

export const parseIntMin = (value: string, fallback: number, min = 1): number =>
  Math.max(min, parseInt(value) || fallback);

export const parseOptionalInt = (value: string): number | undefined =>
  value ? parseInt(value) : undefined;
