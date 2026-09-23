import type {
  AppSettings,
  AutomationProfile,
  AutomationStep,
  PortStatus,
  ProcessStatus,
  ServiceStatus
} from '../../../shared/types';

/**
 * Resolve o perfil de automação ativo: o perfil salvo com `activeProfileId`, ou o primeiro
 * da lista como fallback (ex: perfil salvo foi excluído em outra sessão). `null` quando não
 * há nenhum perfil configurado ainda.
 */
export function resolveActiveProfile(
  profiles: AutomationProfile[] | null | undefined,
  activeProfileId: string
): AutomationProfile | null {
  if (!profiles || profiles.length === 0) return null;
  return profiles.find((p) => p.id === activeProfileId) || profiles[0];
}

/**
 * Diretórios essenciais ainda não configurados (nem manualmente, nem por auto-detecção).
 * Usado para orientar quem está usando o programa pela primeira vez direto às Configurações.
 */
export function getMissingRequiredPaths(settings: AppSettings | null): string[] {
  if (!settings) return [];
  const missing: string[] = [];
  if (!settings.projectsPath) missing.push('Diretório de Repositórios Git');
  if (!settings.intellijPath) missing.push('IDE / Editor de Código');
  return missing;
}

/** Filtra um texto multi-linha (ex: log persistido) pelas linhas que contêm `searchTerm`, case-insensitive. */
export function filterLogLines(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  const needle = searchTerm.trim().toLowerCase();
  return text
    .split(/\r?\n/)
    .filter((line) => line.toLowerCase().includes(needle))
    .join('\n');
}

export interface StepRuntimeTarget {
  /** Porta de debug efetiva de um step tipo 'karaf' (porta do step, senão a global, senão 5005). */
  effectiveKarafPort?: number;
  /** Porta monitorada relevante para este step (karaf ou porta configurada diretamente). */
  targetPort?: number;
  /** Se a porta relevante deste step está atualmente em uso. */
  isPortActive: boolean;
  /** Nome do serviço alvo (targetName do step, ou o próprio nome do step como fallback), só para steps 'service-start'/'service-stop'. */
  serviceTargetName?: string | null;
  /** Serviço Windows correspondente, para steps 'service-start'/'service-stop' (match por nome, case-insensitive). */
  service?: ServiceStatus;
  /** Nome do processo alvo (targetName do step, ou o próprio nome do step como fallback), só para steps 'kill-process'. */
  processTargetName?: string | null;
  /** Processo correspondente, para steps 'kill-process' (match por nome, case-insensitive). */
  process?: ProcessStatus;
}

/**
 * Resolve, para um step de automação, qual porta/serviço/processo do sistema ele referencia
 * e o estado atual desse alvo — usado pra colorir o card do step e mostrar rótulo/ação corretos
 * (ex: botão "Iniciar"/"Parar" segue o estado real do serviço, não um estado assumido).
 */
export function resolveStepRuntimeTarget(
  step: AutomationStep,
  context: {
    services: ServiceStatus[];
    processes: ProcessStatus[];
    ports: PortStatus[];
    karafDebugPort?: number;
  }
): StepRuntimeTarget {
  const effectiveKarafPort = step.type === 'karaf' ? step.port || context.karafDebugPort || 5005 : undefined;
  const targetPort = step.type === 'karaf' ? effectiveKarafPort : step.port;
  const portStatus = targetPort ? context.ports.find((p) => p.port === targetPort) : undefined;
  const isPortActive = portStatus?.inUse ?? false;

  const serviceTargetName = step.type === 'service-start' || step.type === 'service-stop' ? step.targetName || step.name : null;
  const processTargetName = step.type === 'kill-process' ? step.targetName || step.name : null;
  const service = serviceTargetName
    ? context.services.find((s) => s.name.toLowerCase() === serviceTargetName.toLowerCase())
    : undefined;
  const process = processTargetName
    ? context.processes.find((p) => p.name.toLowerCase() === processTargetName.toLowerCase())
    : undefined;

  return { effectiveKarafPort, targetPort, isPortActive, serviceTargetName, service, processTargetName, process };
}
