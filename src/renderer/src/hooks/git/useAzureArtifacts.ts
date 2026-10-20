import { useState } from 'react';
import type {
  AzureArtifactDownloadResult,
  AzureBuildArtifact,
  AzureBuildInfo,
  AzurePipelineTarget,
  GitProjectInfo,
  RoutineDownloadResult
} from '../../../../shared/types';

export interface ArtifactActionState {
  busy: boolean;
  download?: AzureArtifactDownloadResult;
  install?: RoutineDownloadResult;
}

/** Builds e artefatos do Azure Pipelines do repositório selecionado no Hub Git. */
export function useAzureArtifacts(currentProject: GitProjectInfo | undefined) {
  const [isOpen, setIsOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [builds, setBuilds] = useState<AzureBuildInfo[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<AzureBuildInfo | null>(null);
  const [artifacts, setArtifacts] = useState<AzureBuildArtifact[]>([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [actions, setActions] = useState<Record<string, ArtifactActionState>>({});
  const [artifactsDir, setArtifactsDir] = useState('');

  const target: AzurePipelineTarget | null =
    currentProject?.azureOrg && currentProject.azureProject
      ? { org: currentProject.azureOrg, project: currentProject.azureProject }
      : null;

  const loadBuilds = async (branch: string) => {
    if (!target) return;
    setIsLoadingBuilds(true);
    setError(null);
    setSelectedBuild(null);
    setArtifacts([]);
    try {
      const res = await window.electronAPI.azureListBuilds(target, { branch: branch || undefined, top: 25 });
      setBuilds(res.builds || []);
      if (!res.success) setError(res.error || 'Falha ao listar builds.');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  const open = () => {
    if (!target) return;
    const initialBranch = currentProject?.currentBranch || '';
    setBranchFilter(initialBranch);
    setBuilds([]);
    setActions({});
    setIsOpen(true);
    window.electronAPI.azureGetArtifactsDir().then(setArtifactsDir).catch(() => setArtifactsDir(''));
    void loadBuilds(initialBranch);
  };

  const selectBuild = async (build: AzureBuildInfo) => {
    if (!target) return;
    setSelectedBuild(build);
    setArtifacts([]);
    setIsLoadingArtifacts(true);
    setError(null);
    try {
      const res = await window.electronAPI.azureListArtifacts(target, build.id);
      setArtifacts(res.artifacts || []);
      if (!res.success) setError(res.error || 'Falha ao listar artefatos.');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  const patchAction = (key: string, patch: Partial<ArtifactActionState>) =>
    setActions((prev) => ({ ...prev, [key]: { ...prev[key], busy: false, ...patch } }));

  const download = async (artifact: AzureBuildArtifact) => {
    if (!target || !selectedBuild) return;
    const key = `${selectedBuild.id}:${artifact.name}`;
    patchAction(key, { busy: true, download: undefined, install: undefined });
    try {
      const res = await window.electronAPI.azureDownloadArtifact(
        target,
        selectedBuild.id,
        selectedBuild.buildNumber,
        artifact.name
      );
      patchAction(key, { download: res });
    } catch (err: any) {
      patchAction(key, { download: { success: false, message: err?.message || String(err) } });
    }
  };

  /** Reaproveita o instalador de Rotinas: extrai o .zip e grava no Prod do WinThor com backup. */
  const installAsRoutine = async (artifact: AzureBuildArtifact, routineCodeOrName: string) => {
    if (!selectedBuild) return;
    const key = `${selectedBuild.id}:${artifact.name}`;
    const filePath = actions[key]?.download?.filePath;
    if (!filePath) return;
    patchAction(key, { busy: true });
    try {
      const res = await window.electronAPI.installLocalRoutineFile(filePath, routineCodeOrName.trim() || undefined, undefined, true);
      patchAction(key, { install: res });
    } catch (err: any) {
      patchAction(key, { install: { success: false, message: err?.message || String(err) } });
    }
  };

  return {
    isOpen,
    close: () => setIsOpen(false),
    open,
    canOpen: Boolean(target),
    branchFilter,
    setBranchFilter,
    reload: () => loadBuilds(branchFilter),
    builds,
    isLoadingBuilds,
    error,
    selectedBuild,
    selectBuild,
    artifacts,
    isLoadingArtifacts,
    actions,
    artifactsDir,
    download,
    installAsRoutine
  };
}

export type AzureArtifactsState = ReturnType<typeof useAzureArtifacts>;
