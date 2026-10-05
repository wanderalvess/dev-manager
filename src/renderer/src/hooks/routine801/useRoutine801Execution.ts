import { useState } from 'react';
import type {
  Routine801Feature,
  Routine801InstallResult,
  Routine801RepositoryUpdate
} from '../../../../shared/types';
import {
  buildDirectInstallFeature,
  buildExecutingTargetName,
  type Routine801DirectType
} from '../../utils/routine801ModalUtils';

interface UseRoutine801ExecutionParams {
  repositorios: Routine801RepositoryUpdate[];
  serverUrlInput: string;
  fetchCatalogs: (overrideUrl?: string) => Promise<void>;
  setErrorBanner: (message: string | null) => void;
  setIsConsoleExpanded: (expanded: boolean) => void;
  clearSelection: () => void;
}

export const useRoutine801Execution = ({
  repositorios,
  serverUrlInput,
  fetchCatalogs,
  setErrorBanner,
  setIsConsoleExpanded,
  clearSelection
}: UseRoutine801ExecutionParams) => {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeVia, setExecuteVia] = useState<'karaf_cli' | 'api'>('karaf_cli');
  const [executingTargetName, setExecutingTargetName] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Routine801InstallResult | null>(null);

  const [isDirectInstallOpen, setIsDirectInstallOpen] = useState<boolean>(false);
  const [directInstallNome, setDirectInstallNome] = useState<string>('winthor-atualizacao-dados');
  const [directInstallVersao, setDirectInstallVersao] = useState<string>('1.38.0.0');
  const [directInstallTipo, setDirectInstallTipo] = useState<Routine801DirectType>('SERVICO');
  const [directInstallAction, setDirectInstallAction] = useState<'install' | 'repo_add_only'>('install');

  // Executa instalação ou registro de repositórios (individual ou em lote)
  const handleExecute = async (
    featuresToInstall: Routine801Feature[],
    action: 'install' | 'repo_add_only' = 'install',
    versionOverride?: string
  ) => {
    if (!featuresToInstall || featuresToInstall.length === 0) return;

    setIsExecuting(true);
    setIsConsoleExpanded(true);
    setLastResult(null);
    setExecutingTargetName(buildExecutingTargetName(featuresToInstall));

    try {
      if (window.electronAPI?.routine801InstallFeatures) {
        const res = await window.electronAPI.routine801InstallFeatures({
          funcionalidades: featuresToInstall,
          repositorios,
          action,
          targetVersionOverride: versionOverride,
          executeVia,
          serverUrl: serverUrlInput
        });
        setLastResult(res);

        if (res.success) {
          clearSelection();
        }

        await fetchCatalogs();
      }
    } catch (err: any) {
      setErrorBanner(`Erro na execução: ${err?.message || err}`);
    } finally {
      setIsExecuting(false);
      setExecutingTargetName(null);
    }
  };

  const handleDirectInstallExecute = async () => {
    if (!directInstallNome.trim()) {
      setErrorBanner('Informe o nome da feature para instalação.');
      return;
    }
    const customFeature = buildDirectInstallFeature(directInstallNome, directInstallVersao, directInstallTipo);
    setIsDirectInstallOpen(false);
    await handleExecute([customFeature], directInstallAction);
  };

  return {
    isExecuting,
    executeVia,
    setExecuteVia,
    executingTargetName,
    lastResult,
    handleExecute,
    isDirectInstallOpen,
    setIsDirectInstallOpen,
    directInstallNome,
    setDirectInstallNome,
    directInstallVersao,
    setDirectInstallVersao,
    directInstallTipo,
    setDirectInstallTipo,
    directInstallAction,
    setDirectInstallAction,
    handleDirectInstallExecute
  };
};
