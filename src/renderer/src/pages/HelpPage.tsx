import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  HelpCircle
} from 'lucide-react';
import { SystemAppInfo, UpdateStatus, getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { MarkdownReader } from '../components/MarkdownReader';
import { WhatsNewModal } from '../components/WhatsNewModal';
import { getMissingRequiredPaths } from '../utils/environmentPageUtils';
import mcpDocsRaw from '../../../../docs/MCP_TOOLS.md?raw';
import changelogRaw from '../../../../CHANGELOG.md?raw';
import {
  HelpCategory,
  getFaqList,
  getKeyboardShortcuts,
  getHelpCategories
} from '../components/help/helpData';
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
  const [activeCategory, setActiveCategory] = useState<HelpCategory>(initialSearch ? 'faq' : 'overview');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});
  const [appInfo, setAppInfo] = useState<SystemAppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');

  const [isMcpDocsOpen, setIsMcpDocsOpen] = useState(false);
  const [mcpDocsContent, setMcpDocsContent] = useState('');
  const [isLoadingMcpDocs, setIsLoadingMcpDocs] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const needsSetup = useMemo(() => getMissingRequiredPaths(settings).length > 0, [settings]);

  const { copy: copyDiag, copiedKey: copiedDiagKey } = useCopyToClipboard(2500);
  const copiedDiag = copiedDiagKey === 'diag';
  const { copy: copyToClipboard, copiedKey: copiedItem } = useCopyToClipboard(2000);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      setActiveCategory('faq');
    }
  }, [initialSearch]);

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getAppInfo) {
        window.electronAPI.getAppInfo().then((info) => setAppInfo(info)).catch(() => {});
      }
      if (window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then((st) => setSettings(st)).catch(() => {});
      }
      const unsubUpdate = window.electronAPI.onUpdateStatus?.(setUpdateStatus);
      return () => unsubUpdate?.();
    }
  }, [settingsVersion]);

  const handleCheckForUpdates = () => {
    setUpdateStatus({ status: 'checking' });
    window.electronAPI?.checkForUpdate?.();
  };

  const handleOpenChangelog = async () => {
    setIsChangelogOpen(true);
    setChangelogContent(changelogRaw);
    try {
      const content = await window.electronAPI?.getChangelog?.();
      if (content && !content.startsWith('Erro ao ler')) {
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
      if (
        content &&
        !content.startsWith('# Documentação não encontrada') &&
        !content.startsWith('# Erro ao ler documentação')
      ) {
        setMcpDocsContent(content);
      }
    } catch {
      // Mantém a documentação embutida caso falhe a leitura dinâmica
    }
  }, []);

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyDiagnostic = () => {
    if (!appInfo) return;
    const report = [
      `=== DIAGNÓSTICO DO SISTEMA - DEV MANAGER ===`,
      `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
      `Aplicação: ${appInfo.appName} v${appInfo.appVersion}`,
      `Privilégios UAC: ${appInfo.isAdmin ? 'Administrador (Elevado)' : 'Usuário Padrão (Sem Elevação)'}`,
      `Sistema Operacional: Windows (${appInfo.osPlatform} ${appInfo.osRelease} ${appInfo.osArch})`,
      `Hostname: ${appInfo.osHostname}`,
      `Memória RAM: ${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB totais`,
      `Electron: v${appInfo.electronVersion}`,
      `Node.js: v${appInfo.nodeVersion}`,
      `Chromium: v${appInfo.chromeVersion}`,
      `V8 Engine: v${appInfo.v8Version}`,
      `Arquivo Config: ${appInfo.configPath}`,
      `====================================================`
    ].join('\n');

    copyDiag(report, 'diag');
  };

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

  // Cálculo da porcentagem de uso de RAM
  const memoryUsagePercent = useMemo(() => {
    if (!appInfo || !appInfo.totalMemoryMb || !appInfo.freeMemoryMb) return 0;
    const used = appInfo.totalMemoryMb - appInfo.freeMemoryMb;
    return Math.min(100, Math.max(0, Math.round((used / appInfo.totalMemoryMb) * 100)));
  }, [appInfo]);

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

  const faqCategories = useMemo(() => {
    const cats = new Set(faqList.map((f) => f.category));
    return ['all', ...Array.from(cats)];
  }, [faqList]);

  const filteredFaqs = useMemo(() => {
    return faqList.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = faqCategoryFilter === 'all' || item.category === faqCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [faqList, searchQuery, faqCategoryFilter]);

  const keyboardShortcuts = useMemo(() => {
    return getKeyboardShortcuts(debugPort);
  }, [debugPort]);

  const categories = useMemo(() => {
    return getHelpCategories(faqList.length, appInfo?.appVersion || '1.25.0');
  }, [faqList.length, appInfo?.appVersion]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && activeCategory === 'overview') {
      setActiveCategory('faq');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-5 space-y-4 overflow-hidden">
      {/* 1. TOPO / HEADER DA CENTRAL DE AJUDA & LAUNCHPAD */}
      <div className="cockpit-panel rounded-2xl p-3.5 sm:p-4 shadow-xl border border-border flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight truncate">
                Central de Ajuda &amp; Documentação
              </h2>
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                PORTA DE ENTRADA
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Hub operacional: orientações de uso, fluxo diário, atalhos de teclado, FAQs e diagnósticos técnicos
            </p>
          </div>
        </div>

        {/* Busca Rápida Integrada */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar ajuda, comandos, FAQ, portas..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-card/70 border border-border hover:border-primary/40 focus:border-primary rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none transition-all font-sans shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVEGAÇÃO POR PÍLULAS TEMÁTICAS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as HelpCategory)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card/60 text-muted-foreground border-border hover:text-foreground hover:bg-card/90'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
              {cat.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
          onClose={() => setIsChangelogOpen(false)}
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
          onClose={() => setIsMcpDocsOpen(false)}
        />
      )}
    </div>
  );
};

export default HelpPage;
