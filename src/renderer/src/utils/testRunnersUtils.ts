import {
  DEFAULT_TEST_RUNNER_PRESETS,
  type TestRunnerConfig,
  type TestRunnerPreset,
  type TestRunnerType,
  type TestExecutionResult
} from '../../../shared/types';

export type TestRunnerStatus = TestExecutionResult['status'];

const PLACEHOLDER_WORKING_DIRS = new Set(
  DEFAULT_TEST_RUNNER_PRESETS.map((preset) => preset.suggestedWorkingDirPlaceholder)
);

/** Runner ainda com a pasta de exemplo dos modelos (ex.: `{PROJECTS_PATH}/seu-projeto`): executar só daria erro. */
export const hasPlaceholderWorkingDir = (runner: Pick<TestRunnerConfig, 'workingDir'>): boolean =>
  PLACEHOLDER_WORKING_DIRS.has(runner.workingDir?.trim() ?? '');

/** Rótulo curto e único dos modelos rápidos ("Maven Unit/Integration Tests" → "Maven Unit/Integration"). */
export const getPresetShortLabel = (preset: Pick<TestRunnerPreset, 'name'>): string =>
  preset.name.replace(/\s*\(.*\)\s*$/, '').split(' ').slice(0, 2).join(' ');

/** Runner "em branco" usado ao abrir o editor para criar um novo. */
export const createEmptyRunner = (): Partial<TestRunnerConfig> => ({
  name: '',
  type: 'maven',
  commandArgs: 'test',
  workingDir: '{PROJECTS_PATH}/',
  description: '',
  linkedValidationItemIds: []
});

export const presetToRunner = (preset: TestRunnerPreset): Partial<TestRunnerConfig> => ({
  name: preset.name,
  type: preset.type,
  commandArgs: preset.defaultCommandArgs,
  workingDir: preset.suggestedWorkingDirPlaceholder,
  description: preset.description,
  linkedValidationItemIds: []
});

/** Argumentos padrão sugeridos ao trocar o tipo do runner no editor. */
export const getDefaultCommandArgs = (type: TestRunnerType): string => {
  switch (type) {
    case 'maven':
    case 'playwright':
      return 'test';
    case 'cypress':
      return 'run';
    case 'newman':
      return 'run ./tests/collection.json';
    default:
      return '';
  }
};

/** Linha de comando exibida no card do runner. */
export const getCommandPreview = (
  runner: Pick<TestRunnerConfig, 'type' | 'commandArgs' | 'customCommand'>
): string => {
  switch (runner.type) {
    case 'maven':
      return `mvn ${runner.commandArgs || 'test'}`;
    case 'playwright':
      return `npx playwright ${runner.commandArgs || 'test'}`;
    case 'cypress':
      return `npx cypress ${runner.commandArgs || 'run'}`;
    case 'newman':
      return `npx newman ${runner.commandArgs || 'run'}`;
    default:
      return `${runner.customCommand || ''} ${runner.commandArgs || ''}`;
  }
};

/** Adiciona/remove um id da lista de cenários vinculados, sem mutar a original. */
export const toggleLinkedId = (current: string[] | undefined, id: string, checked: boolean): string[] => {
  const list = current || [];
  return checked ? [...list, id] : list.filter((item) => item !== id);
};

export const formatDurationSeconds = (durationMs: number): string => `${(durationMs / 1000).toFixed(1)}s`;

/** Mensagem de toast ao término de uma execução. */
export const getExecutionToast = (
  runnerName: string,
  result: Pick<TestExecutionResult, 'status' | 'passedCount' | 'failedCount'>
): { message: string; kind: 'success' | 'info' | 'error' } => {
  if (result.status === 'passed') {
    return {
      message: `Runner "${runnerName}" finalizado com sucesso! (${result.passedCount} testes passaram)`,
      kind: 'success'
    };
  }
  if (result.status === 'aborted') {
    return { message: `Execução de "${runnerName}" abortada pelo usuário.`, kind: 'info' };
  }
  return { message: `Runner "${runnerName}" falhou com ${result.failedCount} erro(s).`, kind: 'error' };
};

export const buildExecutionStartMessage = (runner: Pick<TestRunnerConfig, 'name' | 'type'>): string =>
  `[DevManager] Iniciando execução do runner "${runner.name}" (${runner.type})...\n\n`;
