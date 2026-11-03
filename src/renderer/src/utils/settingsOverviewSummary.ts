import type { AppSettings } from '../../../shared/types';
import type { SettingsTab } from '../components/settings/settingsSections';

/** Última parte de um caminho do Windows ou Linux, para caber numa linha. */
function lastSegment(path: string | undefined): string {
  const parts = (path ?? '').trim().split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * Resumo de uma linha de cada seção para a Visão geral, calculado só com o que já está nas configurações
 * (sem ir ao disco). String vazia = nada a mostrar.
 */
export function buildSectionSummaries(settings: Partial<AppSettings>, totalModules: number): Partial<Record<SettingsTab, string>> {
  const providers = settings.llmProviders ?? [];
  const activeProvider = providers.find((p) => p.id === settings.activeLlmProviderId);
  const services = (settings.trackedServices ?? []).length;
  const processes = (settings.trackedProcesses ?? []).length;
  const disabled = (settings.disabledModules ?? []).length;
  return {
    dirs: lastSegment(settings.projectsPath),
    karaf: lastSegment(settings.karafPath),
    routines: settings.winthorStartEnabled ? 'WTA ligado' : lastSegment(settings.appPath),
    azure: settings.hasAzureDevOpsToken || settings.azureDevOpsToken ? 'token salvo' : '',
    backup: settings.expdpPath || settings.pgDumpPath ? 'caminhos definidos' : 'usando o PATH',
    ai: activeProvider ? `em uso: ${activeProvider.name}` : providers.length ? plural(providers.length, 'motor', 'motores') : '',
    quality: (settings.qualitySources ?? []).length ? plural(settings.qualitySources!.length, 'fonte', 'fontes') : '',
    debug: services || processes ? `${plural(services, 'serviço', 'serviços')} · ${plural(processes, 'processo', 'processos')}` : '',
    ports: (settings.monitoredPorts ?? []).length ? plural(settings.monitoredPorts!.length, 'porta vigiada', 'portas vigiadas') : '',
    logs: (settings.realtimeLogSources ?? []).length ? plural(settings.realtimeLogSources!.length, 'fonte', 'fontes') : '',
    integration: (settings.integrationLayers ?? []).length ? plural(settings.integrationLayers!.length, 'camada', 'camadas') : '',
    appearance: `${totalModules - disabled}/${totalModules} módulos`,
    usage: settings.usageMetricsEnabled === false ? 'contagem desligada' : 'contagem ligada'
  };
}
