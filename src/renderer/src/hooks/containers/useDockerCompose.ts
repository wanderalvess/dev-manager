import { useState, useEffect, useRef } from 'react';
import type { ComposeServiceStatus } from '../../../../shared/types';
import { addRecentFile } from '../../utils/dockerSequenceUtils';
import type { DockerDataState } from './useDockerData';

const RECENT_FILES_KEY = 'winthor_recent_compose_files';

/** Painel Docker Compose: caminho/perfil, up/down/restart/logs/status e arquivos recentes. */
export function useDockerCompose(data: DockerDataState) {
  const { loadDockerData } = data;

  const [composeFilePath, setComposeFilePath] = useState<string>('');
  const [composeProfile, setComposeProfile] = useState<string>('');
  const [isComposeRunning, setIsComposeRunning] = useState<'up' | 'down' | null>(null);
  const [composeOutput, setComposeOutput] = useState<string>('');
  const [composeServices, setComposeServices] = useState<ComposeServiceStatus[]>([]);
  const [isLoadingComposeStatus, setIsLoadingComposeStatus] = useState<boolean>(false);
  const composeOutputRef = useRef<HTMLPreElement>(null);
  const [composeBuild, setComposeBuild] = useState<boolean>(false);
  const [composeVolumes, setComposeVolumes] = useState<boolean>(false);
  const [isComposeRestarting, setIsComposeRestarting] = useState<boolean>(false);
  const [recentComposeFiles, setRecentComposeFiles] = useState<string[]>([]);
  const [isComposeExpanded, setIsComposeExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onDockerComposeLogChunk?.((chunk) => {
      setComposeOutput((prev) => prev + chunk);
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    composeOutputRef.current?.scrollTo({ top: composeOutputRef.current.scrollHeight });
  }, [composeOutput]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_FILES_KEY);
      if (saved) setRecentComposeFiles(JSON.parse(saved));
    } catch {
      // localStorage indisponível
    }
  }, []);

  const persistComposeConfig = (filePath: string, profile: string) => {
    window.electronAPI?.saveSettings?.({ dockerComposeConfig: { filePath, profile: profile || undefined } });
  };

  const addRecentComposeFile = (file: string) => {
    if (!file) return;
    setRecentComposeFiles((prev) => {
      const updated = addRecentFile(prev, file);
      try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
      } catch {
        // localStorage indisponível
      }
      return updated;
    });
  };

  const handleSelectComposeFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    const picked = await window.electronAPI.selectFile({
      filters: [{ name: 'Docker Compose', extensions: ['yml', 'yaml'] }]
    });
    if (picked) {
      setComposeFilePath(picked);
      addRecentComposeFile(picked);
    }
  };

  const handleComposeStatus = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeStatus) return;
    setIsLoadingComposeStatus(true);
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    try {
      const services = await window.electronAPI.dockerComposeStatus(
        composeFilePath.trim(),
        composeProfile.trim() || undefined
      );
      setComposeServices(services || []);
    } finally {
      setIsLoadingComposeStatus(false);
    }
  };

  const handleComposeUp = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeUp) return;
    setIsComposeRunning('up');
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeUp(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        build: composeBuild
      });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRunning(null);
    }
  };

  const handleComposeDown = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeDown) return;
    setIsComposeRunning('down');
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeDown(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        volumes: composeVolumes
      });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRunning(null);
    }
  };

  const handleComposeRestart = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeRestart) return;
    setIsComposeRestarting(true);
    setComposeOutput('');
    persistComposeConfig(composeFilePath.trim(), composeProfile.trim());
    addRecentComposeFile(composeFilePath.trim());
    try {
      await window.electronAPI.dockerComposeRestart(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined
      });
      await handleComposeStatus();
      loadDockerData();
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO] ${err?.message || err}\r\n`);
    } finally {
      setIsComposeRestarting(false);
    }
  };

  const handleComposeLogs = async () => {
    if (!composeFilePath.trim() || !window.electronAPI?.dockerComposeLogs) return;
    try {
      const output = await window.electronAPI.dockerComposeLogs(composeFilePath.trim(), {
        profile: composeProfile.trim() || undefined,
        lines: 100
      });
      setComposeOutput(output || '(Nenhum log retornado pelo Compose)');
    } catch (err: any) {
      setComposeOutput((prev) => `${prev}\r\n[ERRO AO BUSCAR LOGS] ${err?.message || err}\r\n`);
    }
  };

  return {
    composeFilePath,
    setComposeFilePath,
    composeProfile,
    setComposeProfile,
    composeBuild,
    setComposeBuild,
    composeVolumes,
    setComposeVolumes,
    isComposeRunning,
    isComposeRestarting,
    isLoadingComposeStatus,
    composeServices,
    composeOutput,
    composeOutputRef,
    recentComposeFiles,
    isComposeExpanded,
    setIsComposeExpanded,
    handleSelectComposeFile,
    handleComposeUp,
    handleComposeDown,
    handleComposeRestart,
    handleComposeLogs,
    handleComposeStatus
  };
}

export type DockerComposeState = ReturnType<typeof useDockerCompose>;
