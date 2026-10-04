import { useState, useCallback } from 'react';
import type { InfrDockerScriptStatus } from '../../../../shared/types';
import type { DockerDataState } from './useDockerData';

/** Assistente de bootstrap INFR-Docker (verificação e execução dos scripts oracle/wta/wsh). */
export function useInfrBootstrap(data: DockerDataState) {
  const { selectedDistro, daemonStatus, loadDockerData } = data;

  const [isInfrModalOpen, setIsInfrModalOpen] = useState<boolean>(false);
  const [infrScripts, setInfrScripts] = useState<InfrDockerScriptStatus[]>([]);
  const [isLoadingInfrScripts, setIsLoadingInfrScripts] = useState<boolean>(false);
  const [isExecutingInfr, setIsExecutingInfr] = useState<boolean>(false);
  const [infrOutput, setInfrOutput] = useState<string>('');

  const loadInfrScripts = useCallback(async (customPath?: string) => {
    if (!window.electronAPI?.checkInfrDockerScripts) return;
    setIsLoadingInfrScripts(true);
    try {
      const scripts = await window.electronAPI.checkInfrDockerScripts(
        customPath || 'C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker'
      );
      setInfrScripts(scripts || []);
    } catch {
      setInfrScripts([]);
    } finally {
      setIsLoadingInfrScripts(false);
    }
  }, []);

  const openInfrModal = () => {
    setIsInfrModalOpen(true);
    loadInfrScripts();
  };

  const handleRunInfrScript = async (
    scriptType: 'oracle' | 'wta' | 'wsh',
    options: {
      customPath: string;
      oracleContainer: string;
      oraclePort: number;
      wtaContainer: string;
      wtaPort: number;
    }
  ) => {
    if (!window.electronAPI?.runInfrSetupScript) return;
    setIsExecutingInfr(true);
    setInfrOutput('');
    try {
      const opts: any = {
        infrPath: options.customPath,
        distro: selectedDistro || daemonStatus?.wslDistro
      };
      if (scriptType === 'oracle') {
        opts.containerName = options.oracleContainer.trim() || 'oracle-winthor';
        opts.port = Number(options.oraclePort) || 1521;
      } else if (scriptType === 'wta') {
        opts.containerName = options.wtaContainer.trim() || 'linux-winthor';
        opts.port = Number(options.wtaPort) || 8080;
      }
      const res = await window.electronAPI.runInfrSetupScript(scriptType, opts);
      setInfrOutput(res.output || (res.success ? 'Script iniciado com sucesso.' : 'Falha na execução.'));
      if (res.success) {
        setTimeout(loadDockerData, 3000);
      }
    } catch (err: any) {
      setInfrOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingInfr(false);
    }
  };

  return {
    isInfrModalOpen,
    closeInfrModal: () => setIsInfrModalOpen(false),
    openInfrModal,
    infrScripts,
    isLoadingInfrScripts,
    isExecutingInfr,
    infrOutput,
    loadInfrScripts,
    handleRunInfrScript
  };
}

export type InfrBootstrapState = ReturnType<typeof useInfrBootstrap>;
