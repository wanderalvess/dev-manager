import React, { useMemo } from 'react';
import { getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useHelpPageData } from '../hooks/help/useHelpPageData';
import { useHelpPageDocs } from '../hooks/help/useHelpPageDocs';
import { useHelpPageSearch } from '../hooks/help/useHelpPageSearch';
import { useHelpAboutDiagnostic } from '../hooks/help/useHelpAboutDiagnostic';
import { helpPageFaqCategories, helpPageFilterFaqs } from '../utils/helpPageUtils';
import { MarkdownReader } from '../components/MarkdownReader';
import { WhatsNewModal } from '../components/WhatsNewModal';
import {
  getFaqList,
  getKeyboardShortcuts,
  getHelpCategories
} from '../components/help/helpData';
import { HelpPageHeader } from '../components/help/page/HelpPageHeader';
import { HelpPageCategoryNav } from '../components/help/page/HelpPageCategoryNav';
import { HelpOverviewTab } from '../components/help/tabs/HelpOverviewTab';
import { HelpModulesTab } from '../components/help/tabs/HelpModulesTab';
import { HelpShortcutsTab } from '../components/help/tabs/HelpShortcutsTab';
import { HelpFaqTab } from '../components/help/tabs/HelpFaqTab';
import { HelpAboutTab } from '../components/help/tabs/HelpAboutTab';

interface HelpPageProps {
  onNavigate?: (tab: string) => void;
  /** Termo de busca vindo de um hint contextual de outra tela (ex: "?" ao lado das portas monitoradas) */
  initialSearch?: string;
  /** Reabre o tour guiado de boas-vindas (spotlight nos itens do Header) */
  onRestartTour?: () => void;
  /**
   * Limpa a marca de "já visto" dos tours individuais de cada tela (Banco, Rotinas, Deploy,
   * Containers, Git, etc.) e reabre o modal de escolha — a única forma de recuperar esses tours
   * pra quem clicou "Pular e explorar sozinho" na primeira vez, já que essa escolha hoje é
   * permanente (ver PAGE_TOURS_PREF_KEY em usePageTour.ts).
   */
  onResetPageTours?: () => void;
  settingsVersion?: number;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  onNavigate,
  initialSearch,
  onRestartTour,
  onResetPageTours,
  settingsVersion
}) => {
  const {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    faqCategoryFilter,
    setFaqCategoryFilter,
    expandedFaqs,
    toggleFaq,
    handleSearchChange
  } = useHelpPageSearch(initialSearch);
  const { appInfo, updateStatus, settings, needsSetup, handleCheckForUpdates } = useHelpPageData(settingsVersion);
  const {
    isChangelogOpen,
    closeChangelog,
    changelogContent,
    isMcpDocsOpen,
    closeMcpDocs,
    mcpDocsContent,
    isLoadingMcpDocs,
    handleOpenChangelog,
    handleOpenMcpDocs
  } = useHelpPageDocs();
  const { copiedDiag, memoryUsagePercent, handleCopyDiagnostic } = useHelpAboutDiagnostic(appInfo);
  const { copy: copyToClipboard, copiedKey: copiedItem } = useCopyToClipboard(2000);

  const handleOpenLink = (url: string) => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    }
  };

  const webPort = getWebPort(settings);
  const sshPort = getKarafSshPort(settings);
  const debugPort = settings?.karafDebugPort || 5005;
  const portalWebUrl = getWebUrl(settings, '');
  const consoleUrl = getWebUrl(settings, '/system/console');

  const faqList = useMemo(() => {
    return getFaqList({
      debugPort,
      webPort,
      sshPort,
      portalWebUrl,
      consoleUrl,
      onNavigate,
      copyToClipboard,
      copiedItem,
      handleOpenLink,
      handleOpenMcpDocs,
      appInfo
    });
  }, [debugPort, webPort, sshPort, portalWebUrl, consoleUrl, onNavigate, copyToClipboard, copiedItem, handleOpenMcpDocs, appInfo]);

  const faqCategories = useMemo(() => helpPageFaqCategories(faqList), [faqList]);

  const filteredFaqs = useMemo(
    () => helpPageFilterFaqs(faqList, searchQuery, faqCategoryFilter),
    [faqList, searchQuery, faqCategoryFilter]
  );

  const keyboardShortcuts = useMemo(() => {
    return getKeyboardShortcuts(debugPort);
  }, [debugPort]);

  const categories = useMemo(() => {
    return getHelpCategories(faqList.length, appInfo?.appVersion || '1.35.0');
  }, [faqList.length, appInfo?.appVersion]);

  return (
    <div className="h-full flex flex-col p-4 sm:p-5 space-y-4 overflow-hidden">
      {/* 1. TOPO / HEADER DA CENTRAL DE AJUDA & LAUNCHPAD */}
      <HelpPageHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={() => setSearchQuery('')}
      />

      {/* 2. SUB-NAVEGAÇÃO POR PÍLULAS TEMÁTICAS */}
      <HelpPageCategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* 3. CONTEÚDO PRINCIPAL ROLÁVEL */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {activeCategory === 'overview' && (
          <HelpOverviewTab
            appInfo={appInfo}
            webPort={webPort}
            sshPort={sshPort}
            debugPort={debugPort}
            portalWebUrl={portalWebUrl}
            consoleUrl={consoleUrl}
            needsSetup={needsSetup}
            onNavigate={onNavigate}
            onRestartTour={onRestartTour}
            onResetPageTours={onResetPageTours}
            setActiveCategory={setActiveCategory}
            handleOpenLink={handleOpenLink}
            copyToClipboard={copyToClipboard}
            copiedItem={copiedItem}
          />
        )}

        {activeCategory === 'modules' && (
          <HelpModulesTab
            debugPort={debugPort}
            onNavigate={onNavigate}
            handleOpenMcpDocs={handleOpenMcpDocs}
            copyToClipboard={copyToClipboard}
            copiedItem={copiedItem}
          />
        )}

        {activeCategory === 'shortcuts' && (
          <HelpShortcutsTab
            keyboardShortcuts={keyboardShortcuts}
            debugPort={debugPort}
            sshPort={sshPort}
            copyToClipboard={copyToClipboard}
            copiedItem={copiedItem}
          />
        )}

        {activeCategory === 'faq' && (
          <HelpFaqTab
            faqCategories={faqCategories}
            faqCategoryFilter={faqCategoryFilter}
            setFaqCategoryFilter={setFaqCategoryFilter}
            filteredFaqs={filteredFaqs}
            expandedFaqs={expandedFaqs}
            toggleFaq={toggleFaq}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeCategory === 'about' && (
          <HelpAboutTab
            appInfo={appInfo}
            updateStatus={updateStatus}
            memoryUsagePercent={memoryUsagePercent}
            copiedDiag={copiedDiag}
            copiedItem={copiedItem}
            handleCopyDiagnostic={handleCopyDiagnostic}
            handleCheckForUpdates={handleCheckForUpdates}
            handleOpenChangelog={handleOpenChangelog}
            copyToClipboard={copyToClipboard}
          />
        )}
      </div>

      {isChangelogOpen && (
        <WhatsNewModal
          isOpen={isChangelogOpen}
          onClose={closeChangelog}
          changelogContent={changelogContent}
          currentAppVersion={appInfo?.appVersion}
        />
      )}

      {isMcpDocsOpen && (
        <MarkdownReader
          title="Catálogo de Ferramentas MCP"
          filePath="docs/MCP_TOOLS.md"
          content={mcpDocsContent}
          isLoading={isLoadingMcpDocs}
          onClose={closeMcpDocs}
        />
      )}
    </div>
  );
};

export default HelpPage;
