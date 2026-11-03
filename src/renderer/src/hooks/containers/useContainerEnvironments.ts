import { useState, useEffect, useCallback } from 'react';
import type { ContainerEnvironment } from '../../../../shared/types';
import type { StartEnvResult } from '../../../../shared/infrEnvStart';
import { showToast } from '../../components/ToastHost';
import { getGroupContainerNames } from '../../utils/dockerContainerUtils';
import {
  buildStartSlots,
  buildDefaultWinThorSequence,
  findDefaultWinThorEnvironment
} from '../../utils/dockerSequenceUtils';
import type { DockerDataState } from './useDockerData';
import type { ContainerErrorsState } from './useContainerErrors';
import type { WslDistroControlsState } from './useWslDistroControls';
import type { SequenceProgressState } from './useContainerSequenceProgress';

/** Grupos/ambientes do container-manager: CRUD, editor e sequências de start/stop. */
export function useContainerEnvironments(
  data: DockerDataState,
  errors: ContainerErrorsState,
  wsl: WslDistroControlsState,
  sequence: SequenceProgressState
) {
  const { containers, selectedDistro, loadDockerData } = data;
  const { handleShowError, setErrorMessage } = errors;
  const { setSequenceProgress } = sequence;

  const [environments, setEnvironments] = useState<ContainerEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [isCreatingEnv, setIsCreatingEnv] = useState<boolean>(false);
  const [envToDelete, setEnvToDelete] = useState<ContainerEnvironment | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingEnv, setEditingEnv] = useState<ContainerEnvironment | null>(null);
  const [preselectedForGroup, setPreselectedForGroup] = useState<string[]>([]);

  const loadEnvironments = useCallback(async () => {
    if (!window.electronAPI?.getContainerEnvironments) return;
    try {
      const result = await window.electronAPI.getContainerEnvironments();
      if (Array.isArray(result?.environments)) {
        setEnvironments(result.environments);
      }
    } catch (err) {
      console.warn('Erro ao carregar ambientes do container-manager:', err);
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  const openCreateGroup = (preselectedNames: string[] = []) => {
    setEditingEnv(null);
    setPreselectedForGroup(preselectedNames);
    setIsCreatingEnv(true);
  };

  const openEditGroup = (env: ContainerEnvironment) => {
    setEditingEnv(env);
    setIsCreatingEnv(true);
  };

  const closeEnvironmentEditor = () => {
    setIsCreatingEnv(false);
    setEditingEnv(null);
    setPreselectedForGroup([]);
  };

  const handleStartEnvironment = async (env: ContainerEnvironment) => {
    if (!window.electronAPI?.startContainerSequence) return;
    const slots = buildStartSlots(env);

    if (slots.length === 0) {
      handleShowError('Grupo Inválido', `O grupo "${env.name}" não possui containers configurados.`);
      return;
    }

    if (env.wslDistro && env.wslDistro !== selectedDistro) {
      await wsl.handleSelectDistro(env.wslDistro);
    }

    setActiveGroupId(env.id);
    setSequenceProgress({ running: true, index: 1, total: slots.length, currentName: slots[0].name });
    try {
      const res = await window.electronAPI.startContainerSequence(slots);
      if (!res.success) {
        handleShowError(`Falha no grupo "${env.name}"`, res.error || 'Erro desconhecido ao subir containers', {
          distroName: env.wslDistro || selectedDistro,
          containerName: res.failed,
          retryAction: () => handleStartEnvironment(env)
        });
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Erro ao iniciar grupo "${env.name}"`, err, {
        distroName: env.wslDistro || selectedDistro,
        retryAction: () => handleStartEnvironment(env)
      });
    } finally {
      setActiveGroupId(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleStopEnvironment = async (env: ContainerEnvironment) => {
    const names = getGroupContainerNames(env);
    if (names.length === 0) {
      handleShowError('Grupo Vazio', `O grupo "${env.name}" não possui containers.`);
      return;
    }

    setActiveGroupId(env.id);
    setSequenceProgress({ running: true, index: 1, total: names.length, currentName: names[0] });
    try {
      if ((window.electronAPI as any)?.stopContainerSequence) {
        const res = await (window.electronAPI as any).stopContainerSequence(names);
        if (!res.success) {
          handleShowError(`Falha ao parar grupo "${env.name}"`, res.error || 'Erro ao parar containers');
        }
      } else {
        for (const name of names) {
          await window.electronAPI?.stopDockerContainer(name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Erro ao parar grupo "${env.name}"`, err);
    } finally {
      setActiveGroupId(null);
      setSequenceProgress({ running: false });
    }
  };

  /**
   * Sobe o ambiente ativo esperando cada parte ficar pronta: o banco saudável, a API do WTA, o login e só então o
   * WSH (que reinicia em loop sem a configuração inicial do WTA). Devolve o resultado para a tela mostrar os avisos.
   */
  const handleStartActiveEnvironment = async (group: ContainerEnvironment): Promise<StartEnvResult | undefined> => {
    const api = window.electronAPI;
    if (!api?.startInfrEnvironment) {
      await handleStartEnvironment(group);
      return undefined;
    }
    const first = group.containers[0];
    const distro = group.wslDistro || selectedDistro || undefined;
    setActiveGroupId(group.id);
    setSequenceProgress({ running: true, index: 1, total: Math.max(group.containers.length, 1), currentName: typeof first === 'string' ? first : first?.name });
    try {
      const res = await api.startInfrEnvironment({ distro, name: group.name });
      if (!res.success) {
        handleShowError(`Falha ao subir o ambiente "${group.name}"`, res.error || 'Erro desconhecido ao subir o ambiente', {
          distroName: distro,
          containerName: res.failed,
          retryAction: async () => {
            await handleStartActiveEnvironment(group);
          }
        });
      } else {
        if (res.notes.length) showToast(`Ambiente ${group.name}: nem tudo subiu. Veja o aviso sob o seletor de ambiente.`, 'info');
        else showToast(res.started.length ? `Ambiente ${group.name} no ar.` : `O ambiente ${group.name} já estava no ar.`, 'success');
      }
      await loadDockerData();
      return res;
    } catch (err: any) {
      handleShowError(`Erro ao subir o ambiente "${group.name}"`, err, { distroName: distro, retryAction: async () => {
            await handleStartActiveEnvironment(group);
          } });
      return undefined;
    } finally {
      setActiveGroupId(null);
      setSequenceProgress({ running: false });
    }
  };

  /** Com um ambiente ativo sobe os containers dele; sem, o grupo padrão ou os containers que parecem do WinThor. */
  const handleStartWinThorSequence = async (activeGroup?: ContainerEnvironment): Promise<StartEnvResult | undefined> => {
    if (activeGroup) return handleStartActiveEnvironment(activeGroup);
    const defaultEnv = findDefaultWinThorEnvironment(environments);
    if (defaultEnv) {
      await handleStartEnvironment(defaultEnv);
      return undefined;
    }
    window.electronAPI?.startContainerSequence?.(buildDefaultWinThorSequence(containers))?.catch((err: any) => {
      setErrorMessage(`Erro ao iniciar sequência: ${err?.message || err}`);
    });
    return undefined;
  };

  const handleSaveEnvironment = async (env: ContainerEnvironment) => {
    if (!env || !env.name.trim() || !window.electronAPI?.saveContainerEnvironment) return;
    try {
      await window.electronAPI.saveContainerEnvironment(env);
      closeEnvironmentEditor();
      await loadEnvironments();
    } catch (err: any) {
      setErrorMessage(`Falha ao salvar grupo: ${err?.message || err}`);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    if (!window.electronAPI?.deleteContainerEnvironment) return;
    try {
      await window.electronAPI.deleteContainerEnvironment(id);
      if (selectedEnvId === id) setSelectedEnvId('');
      await loadEnvironments();
    } catch (err: any) {
      setErrorMessage(`Falha ao remover ambiente: ${err?.message || err}`);
    }
  };

  return {
    environments,
    selectedEnvId,
    setSelectedEnvId,
    isCreatingEnv,
    envToDelete,
    setEnvToDelete,
    activeGroupId,
    editingEnv,
    preselectedForGroup,
    loadEnvironments,
    openCreateGroup,
    openEditGroup,
    closeEnvironmentEditor,
    handleStartEnvironment,
    handleStopEnvironment,
    handleStartWinThorSequence,
    handleSaveEnvironment,
    handleDeleteEnvironment
  };
}

export type ContainerEnvironmentsState = ReturnType<typeof useContainerEnvironments>;
