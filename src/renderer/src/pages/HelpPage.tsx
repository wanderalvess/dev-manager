import React, { useEffect, useMemo, useRef } from 'react';
import { getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useHelpPageData } from '../hooks/help/useHelpPageData';
import { useHelpPageDocs } from '../hooks/help/useHelpPageDocs';
import { useHelpPageSearch } from '../hooks/help/useHelpPageSearch';
import { useHelpSearch } from '../hooks/help/useHelpSearch';
import { useHelpAboutDiagnostic } from '../hooks/help/useHelpAboutDiagnostic';
import { helpPageFaqCategories, helpPageFaqCategoryCounts, helpPageFilterFaqs } from '../utils/helpPageUtils';
import type { HelpSearchEntry } from '../utils/helpSearch';
import { MarkdownReader } from '../components/MarkdownReader';
import { WhatsNewModal } from '../components/WhatsNewModal';
import { getFaqList, getKeyboardShortcuts } from '../components/help/helpData';
import type { HelpCategory } from '../components/help/helpSections';
import { HelpSectionNav } from '../components/help/page/HelpSectionNav';
import { HelpSectionHeader } from '../components/help/page/HelpSectionHeader';
import { HelpSearchBar } from '../components/help/page/HelpSearchBar';
import { HelpOverviewTab } from '../components/help/tabs/HelpOverviewTab';
import { HelpModulesTab } from '../components/help/tabs/HelpModulesTab';
import { HelpShortcutsTab } from '../components/help/tabs/HelpShortcutsTab';
import { HelpGuidesTab } from '../components/help/tabs/HelpGuidesTab';
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

/**
 * Orquestra a Central de Ajuda no mesmo desenho das Configurações: menu lateral com busca à esquerda e a seção ativa à
 * direita. O conteúdo de cada seção mora em `components/help/tabs`; as perguntas, em `components/help/helpData`.
 */
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
    openFaq
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
  const categoryCounts = useMemo(() => helpPageFaqCategoryCounts(faqList, searchQuery), [faqList, searchQuery]);
  const filteredFaqs = useMemo(
    () => helpPageFilterFaqs(faqList, searchQuery, faqCategoryFilter),
    [faqList, searchQuery, faqCategoryFilter]
  );
  const keyboardShortcuts = useMemo(() => getKeyboardShortcuts(debugPort), [debugPort]);

  // Resultado da busca do menu: pergunta abre no lugar; módulo e atalho levam à sua seção
  const handleSearchSelect = (entry: HelpSearchEntry) => {
    if (entry.faqId) openFaq(entry.faqId);
    else setActiveCategory(entry.category);
  };
  const search = useHelpSearch({ faqList, shortcuts: keyboardShortcuts, onSelect: handleSearchSelect });

  const badges: Partial<Record<HelpCategory, string>> = {
    faq: String(faqList.length),
    about: `v${appInfo?.appVersion || '1.55.0'}`
  };

  // Trocar de seção volta o conteúdo ao topo (abrir uma pergunta rola até ela depois disso)
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeCategory]);

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 md:gap-6 px-4 py-3 md:px-5 md:py-4 overflow-hidden">
      <HelpSectionNav
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        badges={badges}
        onRestartTour={onRestartTour}
        onResetPageTours={onResetPageTours}
        search={
          <HelpSearchBar
            query={search.query}
            onQueryChange={search.setQuery}
            isOpen={search.isOpen}
            onOpenChange={search.setIsOpen}
            results={search.results}
            onSelectResult={search.selectResult}
          />
        }
      />

      <div ref={contentRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto pr-1 -mr-1">
        <div className="max-w-5xl flex flex-col gap-4 min-h-full">
          <HelpSectionHeader category={activeCategory} />

          {activeCategory === 'overview' && (
            <HelpOverviewTab
              appInfo={appInfo}
              webPort={webPort}
              sshPort={sshPort}
              debugPort={debugPort}
              portalWebUrl={portalWebUrl}
              consoleUrl={consoleUrl}
              needsSetup={needsSetup}
              faqList={faqList}
              onNavigate={onNavigate}
              onOpenFaq={openFaq}
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

          {activeCategory === 'guides' && <HelpGuidesTab openLink={handleOpenLink} />}

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
              categoryCounts={categoryCounts}
              faqCategoryFilter={faqCategoryFilter}
              setFaqCategoryFilter={setFaqCategoryFilter}
              filteredFaqs={filteredFaqs}
              expandedFaqs={expandedFaqs}
              toggleFaq={toggleFaq}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onNavigate={onNavigate}
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
