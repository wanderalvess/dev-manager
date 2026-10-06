import { useState, useEffect } from 'react';
import { showToast } from '../../components/ToastHost';
import type {
  BundleDependencyCheckResult,
  GitProjectInfo,
  InstallBundleRequest,
  KarafBundleInfo
} from '../../../../shared/types';
import {
  buildCoordinateForUpdate,
  buildCoordinateFromProject,
  computeInstallLocation,
  type KarafInstallSourceType
} from '../../utils/karafInstallModalUtils';

interface UseKarafInstallModalParams {
  isOpen: boolean;
  updatingTargetBundle: KarafBundleInfo | null;
  projects: GitProjectInfo[];
  initialCoords: string;
  initialVersion: string;
  onSuccess: () => Promise<void> | void;
}

export function useKarafInstallModal({
  isOpen,
  updatingTargetBundle,
  projects,
  initialCoords,
  initialVersion,
  onSuccess
}: UseKarafInstallModalParams) {
  const [installSourceType, setInstallSourceType] = useState<KarafInstallSourceType>('project');
  const [selectedProjectPath, setSelectedProjectPath] = useState('');
  const [mvnCoordinate, setMvnCoordinate] = useState('');
  const [filePath, setFilePath] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [installStartImmediately, setInstallStartImmediately] = useState(true);
  const [installDepCheck, setInstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingInstallDeps, setIsCheckingInstallDeps] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string | null>(null);

  const updateFromSelectedProject = (proj: GitProjectInfo) => {
    const { coordinate, version } = buildCoordinateFromProject(proj);
    setMvnCoordinate(coordinate);
    setTargetVersion(version);
  };

  useEffect(() => {
    if (!isOpen) return;

    setInstallDepCheck(null);
    setInstallLog(null);

    if (updatingTargetBundle) {
      setInstallSourceType('mvn');
      setMvnCoordinate(buildCoordinateForUpdate(updatingTargetBundle));
      setTargetVersion(updatingTargetBundle.version);
    } else if (initialCoords) {
      setInstallSourceType('mvn');
      setMvnCoordinate(initialCoords);
      if (initialVersion) setTargetVersion(initialVersion);
    } else {
      setInstallSourceType('project');
      if (projects.length > 0) {
        setSelectedProjectPath(projects[0].path);
        updateFromSelectedProject(projects[0]);
      }
    }
  }, [isOpen, updatingTargetBundle, initialCoords, initialVersion, projects]);

  const handleSelectProject = (path: string) => {
    setSelectedProjectPath(path);
    const proj = projects.find((p) => p.path === path);
    if (proj) updateFromSelectedProject(proj);
  };

  const handleSelectFile = async () => {
    if (window.electronAPI?.selectFile) {
      const picked = await window.electronAPI.selectFile({
        filters: [{ name: 'Arquivos JAR OSGi', extensions: ['jar'] }]
      });
      if (picked) {
        setFilePath(picked);
      }
    }
  };

  const computedLocation = computeInstallLocation({
    sourceType: installSourceType,
    mvnCoordinate,
    filePath,
    targetVersion,
    selectedProjectPath,
    projects
  });

  const handleCheckInstallImpact = async () => {
    const loc = computedLocation;
    if (!loc) {
      showToast('Informe a localização ou coordenada Maven do bundle.', 'info');
      return;
    }
    setIsCheckingInstallDeps(true);
    setInstallDepCheck(null);
    try {
      if (window.electronAPI?.checkKarafInstallDeps) {
        const check = await window.electronAPI.checkKarafInstallDeps({
          location: loc,
          version: targetVersion.trim()
        });
        setInstallDepCheck(check);
      }
    } catch (err: any) {
      console.error('Erro na checagem de instalação:', err);
    } finally {
      setIsCheckingInstallDeps(false);
    }
  };

  const handleConfirmInstall = async () => {
    const loc = computedLocation;
    if (!loc) {
      showToast('Informe a coordenada ou arquivo do bundle.', 'info');
      return;
    }

    setIsInstalling(true);
    setInstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setInstallLog((prev) => (prev || '') + chunk);
    });
    try {
      if (updatingTargetBundle && window.electronAPI?.updateKarafBundleVersion) {
        const res = await window.electronAPI.updateKarafBundleVersion({
          bundleId: updatingTargetBundle.id,
          newVersionOrLocation: loc
        });
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao atualizar versão do bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle [${updatingTargetBundle.id}] atualizado com sucesso!`);
          await onSuccess();
        }
      } else {
        const req: InstallBundleRequest = {
          location: loc,
          version: targetVersion.trim() || undefined,
          startImmediately: installStartImmediately
        };

        const res = await window.electronAPI?.installKarafBundle(req);
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao instalar bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle instalado com ID: ${res.bundleId || 'concluído'}`);
          await onSuccess();
        }
      }
    } catch (err: any) {
      setInstallLog((prev) => `${prev || ''}\r\n[ERRO FATAL] ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsInstalling(false);
    }
  };

  return {
    installSourceType,
    setInstallSourceType,
    selectedProjectPath,
    mvnCoordinate,
    setMvnCoordinate,
    filePath,
    setFilePath,
    targetVersion,
    setTargetVersion,
    installStartImmediately,
    setInstallStartImmediately,
    installDepCheck,
    isCheckingInstallDeps,
    isInstalling,
    installLog,
    computedLocation,
    handleSelectProject,
    handleSelectFile,
    handleCheckInstallImpact,
    handleConfirmInstall
  };
}
