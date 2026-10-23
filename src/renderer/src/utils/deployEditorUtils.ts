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
    case 'pom-sync-version':
      return 'Sincronizar Versão POM Downstream';
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


export const parseIntMin = (value: string, fallback: number, min = 1): number =>
  Math.max(min, parseInt(value) || fallback);

export const parseOptionalInt = (value: string): number | undefined =>
  value ? parseInt(value) : undefined;
