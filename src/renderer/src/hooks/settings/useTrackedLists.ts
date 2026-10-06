import type {
  AppSettings,
  MonitoredPortConfig,
  RealtimeLogSource,
  TrackedProcessConfig,
  TrackedServiceConfig
} from '../../../../shared/types';
import {
  DEFAULT_LOG_SOURCES,
  DEFAULT_PORTS,
  DEFAULT_PROCESSES,
  DEFAULT_SERVICES
} from '../../utils/settingsDefaults';
import { addToList, coercePortFieldValue, removeAtIndex, updateAtIndex } from '../../utils/settingsListEditors';
import type { SetSettings } from './settingsHookTypes';

type ListKey = 'trackedServices' | 'trackedProcesses' | 'monitoredPorts' | 'realtimeLogSources';

/**
 * Editor genérico de uma lista de configuração (adicionar, alterar campo, remover, restaurar o padrão). As quatro
 * listas da tela (serviços, processos, portas, fontes de log) repetiam exatamente este padrão.
 */
function createListEditor<T>(settings: AppSettings, setSettings: SetSettings, key: ListKey, defaults: T[]) {
  const current = (): T[] => ((settings[key] as T[] | undefined) || defaults);
  const write = (update: (list: T[] | undefined) => T[]) =>
    setSettings((prev) => ({ ...prev, [key]: update(prev[key] as T[] | undefined) }));

  return {
    add: (item: T) => write((list) => addToList(list, defaults, item)),
    update: (index: number, patch: Partial<T>) => write((list) => updateAtIndex(list, defaults, index, patch)),
    remove: (index: number) => write((list) => removeAtIndex(list, defaults, index)),
    count: () => current().length,
    /** Troca a lista inteira pelo padrão. Quem chama decide se pede confirmação antes. */
    reset: () => write(() => defaults)
  };
}

/** Serviços Windows, processos conflitantes, portas e fontes de log monitorados, com a confirmação de "restaurar". */
export function useTrackedLists(settings: AppSettings, setSettings: SetSettings) {
  const services = createListEditor<TrackedServiceConfig>(settings, setSettings, 'trackedServices', DEFAULT_SERVICES);
  const processes = createListEditor<TrackedProcessConfig>(settings, setSettings, 'trackedProcesses', DEFAULT_PROCESSES);
  const ports = createListEditor<MonitoredPortConfig>(settings, setSettings, 'monitoredPorts', DEFAULT_PORTS);
  const logs = createListEditor<RealtimeLogSource>(settings, setSettings, 'realtimeLogSources', DEFAULT_LOG_SOURCES);

  /** Pede confirmação só quando há algo a perder; a remoção só vale ao salvar. */
  const confirmRemoval = (count: number, message: string) => count === 0 || window.confirm(message);

  return {
    handleAddService: (name = 'NovoServico', displayName = 'Novo Serviço Windows') =>
      services.add({ name, displayName, enabled: true, autoStop: true, autoStart: false }),
    handleUpdateService: (index: number, field: keyof TrackedServiceConfig, value: unknown) =>
      services.update(index, { [field]: value } as Partial<TrackedServiceConfig>),
    handleRemoveService: services.remove,
    handleResetServices: () => {
      const count = services.count();
      if (confirmRemoval(count, `Remover os ${count} serviço(s) monitorado(s) configurado(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
        services.reset();
      }
    },

    handleAddProcess: (name = 'processo.exe', displayName = 'Processo em Segundo Plano') =>
      processes.add({ name, displayName, enabled: true, autoKill: true }),
    handleUpdateProcess: (index: number, field: keyof TrackedProcessConfig, value: unknown) =>
      processes.update(index, { [field]: value } as Partial<TrackedProcessConfig>),
    handleRemoveProcess: processes.remove,
    handleResetProcesses: () => {
      const count = processes.count();
      if (confirmRemoval(count, `Remover os ${count} processo(s) conflitante(s) configurado(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
        processes.reset();
      }
    },

    handleAddPort: (port = 8080, label = 'Nova Porta') => ports.add({ port, label, enabled: true }),
    handleUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: unknown) =>
      ports.update(index, { [field]: coercePortFieldValue(field, value) } as Partial<MonitoredPortConfig>),
    handleRemovePort: ports.remove,
    handleResetPorts: () => {
      if (window.confirm('Restaurar a lista de portas monitoradas para o padrão (:8889, :9195, :8101, :5005, :1521)? Qualquer porta personalizada adicionada será perdida ao salvar.')) {
        ports.reset();
      }
    },

    handleAddLogSource: () =>
      logs.add({ id: `log-source-${Date.now()}`, name: 'Nova Fonte de Log', filePath: '', encoding: 'utf-8', enabled: true }),
    handleUpdateLogSource: (index: number, field: keyof RealtimeLogSource, value: unknown) =>
      logs.update(index, { [field]: value } as Partial<RealtimeLogSource>),
    handleRemoveLogSource: logs.remove,
    handleResetLogSources: () => {
      const count = logs.count();
      if (confirmRemoval(count, `Remover as ${count} fonte(s) de log configurada(s)? Essa ação só é efetivada ao clicar em "Salvar Configurações".`)) {
        logs.reset();
      }
    },
    handleBrowseLogPath: async (index: number) => {
      const select = window.electronAPI?.selectFile;
      if (!select) return;
      const selected = await select({
        filters: [
          { name: 'Arquivos de Log (*.log, *.out, *.txt)', extensions: ['log', 'out', 'txt'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (!selected) return;
      const autoName = selected.split(/[\\/]/).pop()?.replace(/\.(log|out|txt)$/i, '');
      logs.update(index, autoName ? { filePath: selected, name: autoName } : { filePath: selected });
    }
  };
}
