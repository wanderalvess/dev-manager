export const DEFAULT_IMPORT_DISTRO_NAME = 'ubuntu2604-winthor';
export const DEFAULT_IMPORT_INSTALL_DIR = `C:\\WSL\\${DEFAULT_IMPORT_DISTRO_NAME}`;

/** Remove a extensão .tar e o sufixo de data (-AA-MM-DD) do nome do snapshot. */
export const deriveDistroNameFromSnapshot = (snapshotFileName: string): string =>
  snapshotFileName.replace(/\.tar$/i, '').replace(/-\d{2}-\d{2}-\d{2}$/, '');

export const buildImportDefaultsFromSnapshot = (snapshotFileName: string) => {
  const distroName = deriveDistroNameFromSnapshot(snapshotFileName) || DEFAULT_IMPORT_DISTRO_NAME;
  return { distroName, installDir: `C:\\WSL\\${distroName}` };
};

export const buildDefaultExportPath = (distro: string): string => `C:\\WSL\\snapshots\\${distro}-backup.tar`;

export const canImportSnapshot = (tarPath: string, distroName: string): boolean =>
  Boolean(tarPath.trim()) && Boolean(distroName.trim());

export const canExportSnapshot = (distro: string, exportPath: string): boolean =>
  Boolean(distro) && Boolean(exportPath.trim());

export const buildImportParams = (distroName: string, installDir: string, tarPath: string) => ({
  distroName: distroName.trim(),
  installDir: installDir.trim(),
  tarPath: tarPath.trim()
});

export const buildExportParams = (distroName: string, exportPath: string) => ({
  distroName,
  exportPath: exportPath.trim()
});
