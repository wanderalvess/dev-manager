import { useState } from 'react';

export function useDocSettingsFolderActions() {
  const [copiedFolderPath, setCopiedFolderPath] = useState<string | null>(null);

  const handleCopyFolderPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedFolderPath(path);
    setTimeout(() => setCopiedFolderPath(null), 2000);
  };

  const handleOpenFolderInExplorer = (path: string) => {
    if (window.electronAPI?.openDocFile) {
      window.electronAPI.openDocFile(path, 'folder');
    }
  };

  return { copiedFolderPath, handleCopyFolderPath, handleOpenFolderInExplorer };
}
