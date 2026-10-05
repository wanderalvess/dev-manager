import { useCallback, useState } from 'react';
import mcpDocsRaw from '../../../../../docs/MCP_TOOLS.md?raw';
import changelogRaw from '../../../../../CHANGELOG.md?raw';
import { helpPageIsValidChangelog, helpPageIsValidMcpDocs } from '../../utils/helpPageUtils';

/** Modais de leitura (changelog e catálogo MCP): abrem com o conteúdo embutido e tentam o dinâmico. */
export function useHelpPageDocs() {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');

  const [isMcpDocsOpen, setIsMcpDocsOpen] = useState(false);
  const [mcpDocsContent, setMcpDocsContent] = useState('');
  const [isLoadingMcpDocs, setIsLoadingMcpDocs] = useState(false);

  const handleOpenChangelog = async () => {
    setIsChangelogOpen(true);
    setChangelogContent(changelogRaw);
    try {
      const content = await window.electronAPI?.getChangelog?.();
      if (helpPageIsValidChangelog(content)) {
        setChangelogContent(content);
      }
    } catch {
      // Mantém o changelog embutido caso falhe a leitura dinâmica
    }
  };

  const handleOpenMcpDocs = useCallback(async () => {
    setIsMcpDocsOpen(true);
    setMcpDocsContent(mcpDocsRaw);
    setIsLoadingMcpDocs(false);
    try {
      const content = await window.electronAPI?.getMcpDocs?.();
      if (helpPageIsValidMcpDocs(content)) {
        setMcpDocsContent(content);
      }
    } catch {
      // Mantém a documentação embutida caso falhe a leitura dinâmica
    }
  }, []);

  return {
    isChangelogOpen,
    closeChangelog: () => setIsChangelogOpen(false),
    changelogContent,
    isMcpDocsOpen,
    closeMcpDocs: () => setIsMcpDocsOpen(false),
    mcpDocsContent,
    isLoadingMcpDocs,
    handleOpenChangelog,
    handleOpenMcpDocs
  };
}
