import { useState } from 'react';
import {
  DEFAULT_IMPORT_DISTRO_NAME,
  DEFAULT_IMPORT_INSTALL_DIR,
  buildDefaultExportPath,
  buildExportParams,
  buildImportDefaultsFromSnapshot,
  buildImportParams,
  canExportSnapshot,
  canImportSnapshot
} from '../../utils/wslSnapshotsModalUtils';

interface UseWslSnapshotsModalFormParams {
  onImportSnapshot: (params: { distroName: string; installDir: string; tarPath: string }) => Promise<void> | void;
  onExportSnapshot: (params: { distroName: string; exportPath: string }) => Promise<void> | void;
}

export function useWslSnapshotsModalForm({
  onImportSnapshot,
  onExportSnapshot
}: UseWslSnapshotsModalFormParams) {
  const [importName, setImportName] = useState<string>(DEFAULT_IMPORT_DISTRO_NAME);
  const [importTarPath, setImportTarPath] = useState<string>('');
  const [importInstallDir, setImportInstallDir] = useState<string>(DEFAULT_IMPORT_INSTALL_DIR);
  const [exportDistro, setExportDistro] = useState<string>('');
  const [exportPath, setExportPath] = useState<string>('');

  const selectSnapshot = (snapshot: { name: string; path: string }) => {
    const defaults = buildImportDefaultsFromSnapshot(snapshot.name);
    setImportTarPath(snapshot.path);
    setImportName(defaults.distroName);
    setImportInstallDir(defaults.installDir);
  };

  const changeExportDistro = (distro: string) => {
    setExportDistro(distro);
    if (distro) setExportPath(buildDefaultExportPath(distro));
  };

  const handleImport = () => {
    if (!canImportSnapshot(importTarPath, importName)) return;
    onImportSnapshot(buildImportParams(importName, importInstallDir, importTarPath));
  };

  const handleExport = () => {
    if (!canExportSnapshot(exportDistro, exportPath)) return;
    onExportSnapshot(buildExportParams(exportDistro, exportPath));
  };

  return {
    importName,
    setImportName,
    importTarPath,
    setImportTarPath,
    importInstallDir,
    setImportInstallDir,
    exportDistro,
    changeExportDistro,
    exportPath,
    setExportPath,
    selectSnapshot,
    handleImport,
    handleExport
  };
}
