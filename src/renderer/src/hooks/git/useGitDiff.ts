import { useMemo, useRef, useState } from 'react';
import type { GitFileStatus, GitProjectInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { limitDiffLines } from '../../utils/gitPageUtils';
import { MAX_RENDERED_DIFF_LINES } from '../../utils/gitViewUtils';

export function useGitDiff(currentProject: GitProjectInfo | undefined) {
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffFiles, setDiffFiles] = useState<GitFileStatus[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string>('');
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const { copy: copyDiff, copiedKey: copiedDiffKey } = useCopyToClipboard();

  const diffRequestRef = useRef(0);

  const handleOpenDiff = async (targetFilePath?: string) => {
    if (!currentProject) return;
    const requestId = ++diffRequestRef.current;
    setIsDiffModalOpen(true);
    setIsLoadingDiff(true);
    setDiffError(null);
    setSelectedDiffFile(targetFilePath || null);
    try {
      const [files, diffRes] = await Promise.all([
        window.electronAPI.getGitStatusDetails(currentProject.path),
        window.electronAPI.getGitDiff(currentProject.path, targetFilePath)
      ]);
      if (requestId !== diffRequestRef.current) return;
      setDiffFiles(files || []);
      if (diffRes?.error) {
        setDiffError(diffRes.error);
        setDiffText('');
      } else {
        setDiffText(diffRes?.diff || '');
      }
    } catch (err: any) {
      if (requestId === diffRequestRef.current) setDiffError(err?.message || String(err));
    } finally {
      if (requestId === diffRequestRef.current) setIsLoadingDiff(false);
    }
  };

  const handleSelectDiffFile = async (filePath: string | null) => {
    if (!currentProject) return;
    // Cliques rápidos em arquivos diferentes: só a última resposta pode preencher o visualizador.
    const requestId = ++diffRequestRef.current;
    setSelectedDiffFile(filePath);
    setIsLoadingDiff(true);
    setDiffError(null);
    try {
      const diffRes = await window.electronAPI.getGitDiff(currentProject.path, filePath || undefined);
      if (requestId !== diffRequestRef.current) return;
      if (diffRes?.error) {
        setDiffError(diffRes.error);
        setDiffText('');
      } else {
        setDiffText(diffRes?.diff || '');
      }
    } catch (err: any) {
      if (requestId === diffRequestRef.current) setDiffError(err?.message || String(err));
    } finally {
      if (requestId === diffRequestRef.current) setIsLoadingDiff(false);
    }
  };

  const renderedDiff = useMemo(() => limitDiffLines(diffText, MAX_RENDERED_DIFF_LINES), [diffText]);

  return {
    isDiffModalOpen,
    setIsDiffModalOpen,
    diffFiles,
    selectedDiffFile,
    diffText,
    isLoadingDiff,
    diffError,
    copyDiff,
    copiedDiffKey,
    renderedDiff,
    handleOpenDiff,
    handleSelectDiffFile
  };
}
