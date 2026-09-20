import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  Search,
  RefreshCw,
  FolderOpen,
  FileText,
  Settings,
  X,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Send,
  Globe,
  Radio,
  Layers,
  BookOpen,
  Cpu,
  Sparkles,
  Bot
} from 'lucide-react';
import {
  DocFolderConfig,
  DocSearchResult,
  DocsIndexProgress,
  DocsIndexStatus,
  DocSyncTargetConfig,
  DocSyncProgress,
  DocSyncResult,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  LlmProviderConfig
} from '../../../shared/types';
import { MarkdownReader } from '../components/MarkdownReader';
import { DocSettingsModal } from '../components/DocSettingsModal';
import { AiMarkdownViewer } from '../components/AiMarkdownViewer';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DOCS_TOUR_STEPS, DOCS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/docsTour';

interface DocsPageProps {
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

const PHASE_LABELS: Record<DocsIndexProgress['phase'], string> = {
  'loading-model': 'Carregando modelo de IA (pode baixar na primeira vez)...',
  scanning: 'Descobrindo projetos e arquivos de documentação...',
  embedding: 'Processando documentos...',
  saving: 'Salvando índice...',
  done: 'Indexação concluída.'
};

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateToSettings, settingsVersion }) => {
  const tour = usePageTour(DOCS_TOUR_STORAGE_KEY);
  const [status, setStatus] = useState<DocsIndexStatus | null>(null);
  const [query, setQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('TODOS');
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [progress, setProgress] = useState<DocsIndexProgress | null>(null);
  const [docFolders, setDocFolders] = useState<DocFolderConfig[]>([]);
  const [indexProjectsDocs, setIndexProjectsDocs] = useState<boolean>(false);
  const [autoReindexOnChange, setAutoReindexOnChange] = useState<boolean>(false);
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [showModelHelp, setShowModelHelp] = useState<boolean>(false);
  const [fileFilter, setFileFilter] = useState<string>('');

  // Modal de Leitura / Prévia de Documento
  const [previewFile, setPreviewFile] = useState<{ path: string; title: string } | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Sincronização Agnóstica de Documentação
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncTargets, setSyncTargets] = useState<DocSyncTargetConfig[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<DocSyncProgress | null>(null);
  const [syncResults, setSyncResults] = useState<DocSyncResult[] | null>(null);

  // Formulário de Destino
  const [editingTarget, setEditingTarget] = useState<Partial<DocSyncTargetConfig> | null>(null);

  // Fontes Confluence (input do RAG, ao lado das Pastas de Documentação locais)
  const [confluenceSources, setConfluenceSources] = useState<ConfluenceSourceConfig[]>([]);
  const [editingConfluenceSource, setEditingConfluenceSource] = useState<Partial<ConfluenceSourceConfig> | null>(null);

  // Fontes Jira (input do RAG — issues viram "documentos", mesmo padrão do Confluence acima)
  const [jiraSources, setJiraSources] = useState<JiraSourceConfig[]>([]);
  const [editingJiraSource, setEditingJiraSource] = useState<Partial<JiraSourceConfig> | null>(null);

  // Modal de Configurações de Documentação & LLM
  const [showDocSettingsModal, setShowDocSettingsModal] = useState<boolean>(false);
  const [llmProviders, setLlmProviders] = useState<LlmProviderConfig[]>([]);
  const [activeLlmProviderId, setActiveLlmProviderId] = useState<string | undefined>(undefined);

  // Estados de Pergunta e Síntese de IA (RAG)
  const [isAskingLlm, setIsAskingLlm] = useState<boolean>(false);
  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);
  const [llmSources, setLlmSources] = useState<Array<{ title: string; path: string; score: number }>>([]);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [copiedLlmAnswer, setCopiedLlmAnswer] = useState<boolean>(false);

  const loadStatus = async () => {
    if (window.electronAPI) {
      setStatus(await window.electronAPI.getDocsIndexStatus());
    }
  };

  const loadDocSettings = async () => {
    if (window.electronAPI) {
      const settings = await window.electronAPI.getSettings();
      setDocFolders(settings.docFolders || []);
      setIndexProjectsDocs(Boolean(settings.indexProjectsDocs));
      setAutoReindexOnChange(Boolean(settings.autoReindexOnChange));
      setSyncTargets(settings.docSyncTargets || []);
      setConfluenceSources(settings.confluenceSources || []);
      setJiraSources(settings.jiraSources || []);
      setLlmProviders(settings.llmProviders || []);
      setActiveLlmProviderId(settings.activeLlmProviderId);
    }
  };

  useEffect(() => {
    loadStatus();
    loadDocSettings();
    const unsubIndex = window.electronAPI?.onDocsIndexProgress?.(setProgress);
    const unsubSync = window.electronAPI?.onDocSyncProgress?.(setSyncProgress);
    return () => {
      unsubIndex?.();
      unsubSync?.();
    };
  }, []);

  useEffect(() => {
    if (settingsVersion && settingsVersion > 0) {
      loadDocSettings();
      loadStatus();
    }
  }, [settingsVersion]);

  const handleToggleIndexProjects = async (checked: boolean) => {
    setIndexProjectsDocs(checked);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ indexProjectsDocs: checked });
    }
  };

  const handleToggleAutoReindex = async (checked: boolean) => {
    setAutoReindexOnChange(checked);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ autoReindexOnChange: checked });
    }
  };

  const handleAddFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    const selected = await window.electronAPI.selectDirectory();
    if (!selected) return;
    if (docFolders.some((f) => f.path === selected)) return;
    setIsAddingFolder(true);
    try {
      const normalized = selected.replace(/\\/g, '/').replace(/\/+$/, '');
      let label = normalized.split('/').pop() || 'docs';
      if (['docs', 'doc', 'documentacao', 'documentation', 'wiki'].includes(label.toLowerCase())) {
        const parent = normalized.split('/').slice(-2, -1)[0];
        if (parent && !parent.includes(':')) {
          label = parent;
        }
      }
      const updated = [...docFolders, { path: selected, label }];
      await window.electronAPI.saveSettings({ docFolders: updated });
      setDocFolders(updated);
    } finally {
      setIsAddingFolder(false);
    }
  };

  const handleRemoveFolder = async (path: string) => {
    const updated = docFolders.filter((f) => f.path !== path);
    await window.electronAPI?.saveSettings({ docFolders: updated });
    setDocFolders(updated);
  };

  const handleReindex = async () => {
    if (!window.electronAPI) return;
    setIsIndexing(true);
    setProgress(null);
    setIndexError(null);
    try {
      const updated = await window.electronAPI.reindexDocs();
      setStatus(updated);
    } catch (err: any) {
      console.error('Erro ao indexar documentação:', err);
      setIndexError(err?.message || 'Falha ao indexar documentação.');
    } finally {
      setIsIndexing(false);
      setProgress(null);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget?.name || !editingTarget?.endpointUrl) return;

    const targetToSave: DocSyncTargetConfig = {
      id: editingTarget.id || `sync_${Date.now()}`,
      name: editingTarget.name.trim(),
      endpointUrl: editingTarget.endpointUrl.trim(),
      method: editingTarget.method || 'PUT',
      authHeader: editingTarget.authHeader?.trim() || 'X-Api-Key',
      authValue: editingTarget.authValue?.trim() || '',
      batchSize: Number(editingTarget.batchSize) || 50,
      syncMode: editingTarget.syncMode || 'all',
      enabled: editingTarget.enabled !== undefined ? editingTarget.enabled : true,
      lastSyncedAt: editingTarget.lastSyncedAt
    };

    let updated: DocSyncTargetConfig[];
    if (editingTarget.id) {
      updated = syncTargets.map((t) => (t.id === editingTarget.id ? targetToSave : t));
    } else {
      updated = [...syncTargets, targetToSave];
    }

    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
    setEditingTarget(null);
  };

  const handleDeleteTarget = async (id: string) => {
    const updated = syncTargets.filter((t) => t.id !== id);
    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
    if (editingTarget?.id === id) {
      setEditingTarget(null);
    }
  };

  const handleToggleTargetEnabled = async (target: DocSyncTargetConfig, enabled: boolean) => {
    const updated = syncTargets.map((t) => (t.id === target.id ? { ...t, enabled } : t));
    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
  };

  const handleDeleteConfluenceSource = async (id: string) => {
    const updated = confluenceSources.filter((s) => s.id !== id);
    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
    if (editingConfluenceSource?.id === id) setEditingConfluenceSource(null);
  };

  const handleToggleConfluenceEnabled = async (source: ConfluenceSourceConfig, enabled: boolean) => {
    const updated = confluenceSources.map((s) => (s.id === source.id ? { ...s, enabled } : s));
    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
  };

  const handleDeleteJiraSource = async (id: string) => {
    const updated = jiraSources.filter((s) => s.id !== id);
    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
    if (editingJiraSource?.id === id) setEditingJiraSource(null);
  };

  const handleToggleJiraEnabled = async (source: JiraSourceConfig, enabled: boolean) => {
    const updated = jiraSources.map((s) => (s.id === source.id ? { ...s, enabled } : s));
    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
  };

  const handleSyncNow = async (targetId?: string) => {
    if (!window.electronAPI) return;
    setIsSyncing(true);
    setSyncProgress(null);
    setSyncResults(null);
    try {
      const res = await window.electronAPI.syncDocs(targetId);
      setSyncResults(res);
      await loadDocSettings(); // Recarrega timestamps
    } catch (err: any) {
      setSyncResults([
        {
          success: false,
          targetId: targetId || 'error',
          targetName: 'Erro de Execução',
          totalChunksSent: 0,
          totalBatches: 0,
          error: err?.message || 'Falha ao executar sincronização.'
        }
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveLlmProvider = async (provider: LlmProviderConfig) => {
    let updated: LlmProviderConfig[];
    if (llmProviders.some((p) => p.id === provider.id)) {
      updated = llmProviders.map((p) => (p.id === provider.id ? provider : p));
    } else {
      updated = [...llmProviders, provider];
    }
    const newActiveId = activeLlmProviderId || provider.id;
    setLlmProviders(updated);
    setActiveLlmProviderId(newActiveId);
    await window.electronAPI?.saveSettings({
      llmProviders: updated,
      activeLlmProviderId: newActiveId
    });
  };

  const handleDeleteLlmProvider = async (id: string) => {
    const updated = llmProviders.filter((p) => p.id !== id);
    const newActiveId = activeLlmProviderId === id ? updated[0]?.id : activeLlmProviderId;
    setLlmProviders(updated);
    setActiveLlmProviderId(newActiveId);
    await window.electronAPI?.saveSettings({
      llmProviders: updated,
      activeLlmProviderId: newActiveId
    });
  };

  const handleSetActiveLlmProvider = async (id: string) => {
    setActiveLlmProviderId(id);
    await window.electronAPI?.saveSettings({ activeLlmProviderId: id });
  };

  const handleTestLlmConnection = async (provider: LlmProviderConfig) => {
    const tester = window.electronAPI?.testLlmConnection;
    if (tester) {
      return await tester(provider);
    }
    return { success: false, message: 'API não disponível.' };
  };

  const handleAskLlm = async (q = query) => {
    if (!q.trim()) return;
    if (!activeLlmProvider || !activeLlmProvider.enabled) {
      setLlmError('Nenhum provedor de IA/LLM está ativo. Configure sua chave (BYOK) na aba IA & Modelos LLM das Configurações.');
      return;
    }
    const askFn = window.electronAPI?.askDocsWithAi || window.electronAPI?.askLlm;
    if (!askFn) return;
    setIsAskingLlm(true);
    setLlmError(null);
    setLlmAnswer(null);
    try {
      const res = await askFn({
        query: q.trim(),
        sourceLabel: sourceFilter !== 'TODOS' ? sourceFilter : undefined,
        topK: 5
      });
      setLlmAnswer(res.answer);
      setLlmSources(res.sources || []);
    } catch (err: any) {
      setLlmError(err?.message || 'Falha ao consultar assistente de IA.');
    } finally {
      setIsAskingLlm(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!window.electronAPI || !query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setLlmAnswer(null);
    setLlmError(null);
    try {
      const options = sourceFilter !== 'TODOS' ? { sourceLabel: sourceFilter } : undefined;
      const data = await window.electronAPI.searchDocs(query.trim(), options);
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenInEditor = (filePath: string) => {
    window.electronAPI?.openDocFile(filePath, 'editor');
  };

  const handleOpenInFolder = (filePath: string) => {
    window.electronAPI?.openDocFile(filePath, 'folder');
  };

  const handleOpenPreview = async (filePath: string, title: string) => {
    setPreviewFile({ path: filePath, title });
    setIsLoadingPreview(true);
    setPreviewContent('');
    try {
      if (window.electronAPI?.readDocContent) {
        const text = await window.electronAPI.readDocContent(filePath);
        setPreviewContent(text || '(Arquivo vazio)');
      } else {
        setPreviewContent('(Visualizador não disponível no ambiente web)');
      }
    } catch (err: any) {
      setPreviewContent(`Erro ao ler arquivo: ${err?.message || err}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const hasIndex = !!status && status.totalChunks > 0;

  const filesList = status?.files || [];
  const filteredFiles = filesList.filter((f) => {
    if (sourceFilter !== 'TODOS' && f.sourceLabel !== sourceFilter) return false;
    if (fileFilter.trim() && !f.title.toLowerCase().includes(fileFilter.toLowerCase())) return false;
    return true;
  });

  const activeLlmProvider = llmProviders.find((p) => (activeLlmProviderId ? p.id === activeLlmProviderId : p.enabled));

  return (
    <div className="h-full flex flex-col p-4 md:p-5 space-y-4 overflow-y-auto">
      {/* Topo / Indexação */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Documentação
                {hasIndex && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    {status.totalChunks} trechos · {status.totalFiles} arquivos · {status.totalSources} fontes
                    {!status.isTextOnly && ' · IA Neural Ativa'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={tour.open}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                  title="Rever o tour guiado desta página"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Busca semântica local (RAG) sobre o README/docs dos projetos e das pastas adicionais configuradas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              data-tour="doc-settings-button"
              onClick={() => setShowDocSettingsModal(true)}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Configurar pastas locais, projetos Git, Confluence, Jira e Assistente IA"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              <span>Configurações ({docFolders.length + confluenceSources.length + jiraSources.length})</span>
              {activeLlmProvider && activeLlmProvider.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title={`IA Ativa: ${activeLlmProvider.name}`} />
              )}
            </button>

            <button
              onClick={() => setShowSyncModal(true)}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="Gerenciar e enviar documentos vetorizados para APIs externas (ex: Espaço Ágil)"
            >
              <Send className="w-3.5 h-3.5 text-primary" />
              <span>Sincronizações ({syncTargets.filter((t) => t.enabled).length})</span>
            </button>

            <button
              data-tour="reindex-button"
              onClick={handleReindex}
              disabled={isIndexing}
              className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer active:scale-95"
              title="Escanear projetos e (re)gerar o índice de busca"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
              <span>{isIndexing ? 'Indexando...' : hasIndex ? 'Reindexar' : 'Indexar Documentação'}</span>
            </button>
          </div>
        </div>

        {indexError && (
          <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">Erro ao indexar documentação:</span> {indexError}
            </div>
          </div>
        )}

        {hasIndex && status?.isTextOnly && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                <strong>Modo Textual Ativo:</strong> Busca por termos e palavras-chave habilitada ({status.totalFiles} arquivos). Para habilitar a busca semântica neural por IA, instale o modelo local.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowModelHelp(true)}
              className="text-[11px] underline hover:no-underline font-semibold shrink-0 cursor-pointer"
            >
              Como instalar modelo offline
            </button>
          </div>
        )}

        {!status?.modelDownloaded && !status?.isTextOnly && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-start justify-between gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <Download className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Na primeira indexação, o modelo de embeddings (~90MB) é baixado da internet. Em redes corporativas com bloqueio, a busca textual simples funcionará automaticamente.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowModelHelp(true)}
              className="text-[11px] underline hover:no-underline font-semibold shrink-0 cursor-pointer"
            >
              Instalação manual
            </button>
          </div>
        )}

        {isIndexing && progress && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{PHASE_LABELS[progress.phase]}</span>
              {progress.total > 0 && (
                <span className="font-mono">
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>
            {progress.total > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
                />
              </div>
            )}
            {progress.currentFile && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">{progress.currentFile}</p>
            )}
          </div>
        )}
      </div>

      {/* Barra de Busca */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]" data-tour="search-input">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Pergunte algo sobre a documentação dos projetos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {status && status.sourceLabels.length > 0 && (
            <select
              data-tour="source-filter-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            >
              <option value="TODOS">Todas as fontes</option>
              {status.sourceLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            data-tour="search-submit-button"
            disabled={isSearching || !query.trim() || !hasIndex}
            className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            disabled={isSearching || isAskingLlm || !query.trim() || !hasIndex}
            onClick={async () => {
              if (!hasSearched) await handleSearch();
              handleAskLlm();
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-primary/25 disabled:opacity-40 cursor-pointer active:scale-95 shrink-0"
            title={activeLlmProvider ? `Consultar Copilot Técnico (${activeLlmProvider.name} · ${activeLlmProvider.model})` : 'Consultar Copilot Técnico (BYOK)'}
          >
            {isAskingLlm ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sintetizando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Perguntar à IA</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Resultados e Catálogo de Documentos */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {!hasIndex && !isIndexing && (
          <div className="cockpit-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 border border-border">
            <FolderOpen className="w-10 h-10 text-primary/50" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Nenhum índice de documentação gerado ainda</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                {docFolders.length > 0
                  ? 'Suas pastas de projetos e documentação já estão configuradas. Clique em "Indexar Documentação" acima para processar os arquivos e habilitar a busca.'
                  : 'Clique em "Indexar Documentação" pra escanear os projetos configurados em busca de README e arquivos de doc.'}
              </p>
            </div>
            {docFolders.length === 0 && onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20 cursor-pointer active:scale-95"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Pasta de Projetos</span>
              </button>
            )}
          </div>
        )}

        {/* MODO BUSCA ATIVA */}
        {hasIndex && hasSearched && query.trim() && (
          <div className="space-y-3" data-tour="search-results-list">
            <div className="flex items-center justify-between pb-1 px-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                Resultados para "{query.trim()}" ({results.length})
              </span>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setQuery('');
                }}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              >
                ← Ver todos os documentos ({filteredFiles.length})
              </button>
            </div>

            {/* Card de Síntese RAG com IA (Copilot Técnico WinThor) */}
            {(isAskingLlm || llmAnswer || llmError) && (
              <div className="cockpit-card rounded-2xl p-4.5 border border-primary/40 bg-card shadow-md space-y-3.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                      <Bot className="w-4.5 h-4.5" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground">
                          Copilot Técnico WinThor {activeLlmProvider ? `· ${activeLlmProvider.name}` : ''}
                        </span>
                        {activeLlmProvider && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/25 font-bold shrink-0">
                            {activeLlmProvider.model}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        Síntese contextual gerada com base na documentação dos projetos e wikis indexadas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {llmAnswer && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(llmAnswer);
                            setCopiedLlmAnswer(true);
                            setTimeout(() => setCopiedLlmAnswer(false), 2000);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Copiar síntese gerada"
                        >
                          {copiedLlmAnswer ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isAskingLlm}
                          onClick={() => handleAskLlm(query)}
                          className="px-3 py-1.5 rounded-xl bg-card hover:bg-primary/10 text-primary border border-border hover:border-primary/40 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                          title="Regenerar resposta"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isAskingLlm ? 'animate-spin' : ''}`} />
                          <span>Regenerar</span>
                        </button>
                      </>
                    )}
                    {!llmAnswer && !isAskingLlm && (
                      <button
                        type="button"
                        onClick={() => handleAskLlm(query)}
                        className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Resposta com IA</span>
                      </button>
                    )}
                  </div>
                </div>

                {isAskingLlm && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Consultando {activeLlmProvider?.name || 'modelo de IA'} ({activeLlmProvider?.model || 'LLM'})...</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        RAG Vector Search
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Analisando trechos indexados para responder "{query.trim()}"...
                    </p>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
                    </div>
                  </div>
                )}

                {llmError && !isAskingLlm && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between text-destructive font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Erro ao consultar motor de IA
                      </span>
                      <div className="flex items-center gap-2">
                        {onNavigateToSettings && (
                          <button
                            type="button"
                            onClick={onNavigateToSettings}
                            className="text-foreground/90 hover:text-foreground text-[11px] font-semibold flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Configurar Motor</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAskLlm(query)}
                          className="text-primary hover:underline text-[11px] font-semibold cursor-pointer font-sans"
                        >
                          Tentar de novo
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-destructive/80 break-all">{llmError}</p>
                  </div>
                )}

                {llmAnswer && !isAskingLlm && (
                  <div className="space-y-3 pt-1">
                    <div className="bg-card/90 p-4.5 rounded-xl border border-border/80 shadow-2xs">
                      <AiMarkdownViewer content={llmAnswer} />
                    </div>

                    {llmSources.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-primary" />
                            Fontes & Referências Utilizadas na Síntese ({llmSources.length}):
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Clique para abrir a leitura do documento
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {llmSources.map((source, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenPreview(source.path, source.title)}
                              className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 text-xs font-mono flex items-center gap-2 transition cursor-pointer shadow-2xs group"
                              title={`Abrir prévia de ${source.title}`}
                            >
                              <FileText className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                              <span className="max-w-[260px] truncate font-medium">{source.title}</span>
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-mono shrink-0">
                                {(source.score * 100).toFixed(0)}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isSearching && results.length === 0 && (
              <div className="cockpit-panel rounded-2xl p-8 text-center border border-border">
                <p className="text-xs text-muted-foreground">Nenhum resultado encontrado para essa busca.</p>
              </div>
            )}

            {results.map((result) => (
              <div
                key={result.chunk.id}
                className="cockpit-card rounded-2xl p-4 border border-border shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80 shrink-0">
                      {result.chunk.sourceLabel}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1" title={result.chunk.entryTitle}>
                      <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      {result.chunk.entryTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground mr-1">
                      {(result.score * 100).toFixed(0)}% relevante
                    </span>
                    <button
                      onClick={() => handleOpenPreview(result.chunk.entryId, result.chunk.entryTitle)}
                      className="px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                      title="Ler documento formatado"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">Ler</span>
                    </button>
                    <button
                      onClick={() => handleOpenInEditor(result.chunk.entryId)}
                      className="px-2 py-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                      title="Abrir arquivo no editor padrão do sistema / VS Code"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Editor</span>
                    </button>
                    <button
                      onClick={() => handleOpenInFolder(result.chunk.entryId)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Revelar na pasta"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6">
                  {result.chunk.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* MODO CATÁLOGO DE DOCUMENTOS (Quando não está buscando ativamente) */}
        {hasIndex && (!hasSearched || !query.trim()) && (
          <div className="space-y-3" data-tour="indexed-docs-catalog">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">
                  Documentos Indexados ({filteredFiles.length})
                </h3>
              </div>
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar documentos por nome..."
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-8 pr-7 py-1.5 text-[11px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                {fileFilter && (
                  <button
                    type="button"
                    onClick={() => setFileFilter('')}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="cockpit-panel rounded-2xl p-8 text-center border border-border">
                <p className="text-xs text-muted-foreground">Nenhum documento encontrado com esse filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredFiles.map((file) => {
                  const fileName = file.title.split(/[\\/]/).pop() || file.title;
                  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
                  const ext = extMatch ? extMatch[1].toUpperCase() : 'DOC';
                  const parentFolder = file.title.includes('/') || file.title.includes('\\')
                    ? file.title.replace(/[\\/][^\\/]+$/, '').split(/[\\/]/).pop()
                    : null;

                  return (
                    <div
                      key={file.id}
                      className="cockpit-card rounded-xl p-3.5 border border-border shadow-2xs flex items-center justify-between gap-3 hover:border-primary/50 transition-all group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {ext}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors" title={fileName}>
                            {fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-mono truncate">
                          {parentFolder && (
                            <>
                              <span className="truncate max-w-[140px] opacity-75">{parentFolder}</span>
                              <span className="opacity-40">/</span>
                            </>
                          )}
                          <span className="text-muted-foreground/75 truncate" title={file.title}>
                            {file.chunkCount} {file.chunkCount === 1 ? 'trecho' : 'trechos'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenPreview(file.id, file.title)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center gap-1.5 text-[11px] font-bold cursor-pointer active:scale-95 shadow-2xs"
                          title="Ler documento formatado"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ler</span>
                        </button>
                        <button
                          onClick={() => handleOpenInEditor(file.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Abrir no editor padrão do sistema"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenInFolder(file.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Revelar na pasta"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Leitura / Prévia Estilizada Markdown */}
      {previewFile && (
        <MarkdownReader
          title={previewFile.title}
          filePath={previewFile.path}
          content={previewContent}
          isLoading={isLoadingPreview}
          onClose={() => setPreviewFile(null)}
          onOpenInEditor={handleOpenInEditor}
          onOpenInFolder={handleOpenInFolder}
        />
      )}

      {/* Modal de Ajuda: Instalação Manual do Modelo de IA */}
      {showModelHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Instalação Manual do Modelo de IA (Offline)</h4>
              </div>
              <button
                onClick={() => setShowModelHelp(false)}
                className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-foreground/90 space-y-3">
              <p>
                Em redes corporativas (com proxy, Zscaler ou firewall), o download automático do modelo de IA pelo aplicativo pode ser bloqueado. Para instalar manualmente:
              </p>
              <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
                <li>
                  Baixe o modelo pelo navegador no link:
                  <div className="mt-1">
                    <a
                      href="https://storage.googleapis.com/qdrant-fastembed/sentence-transformers-all-MiniLM-L6-v2.tar.gz"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-mono break-all inline-flex items-center gap-1 font-semibold"
                    >
                      sentence-transformers-all-MiniLM-L6-v2.tar.gz <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </div>
                </li>
                <li>
                  No Windows Explorer, acesse a pasta:
                  <div className="bg-muted p-2 rounded-lg font-mono text-[11px] text-foreground mt-1 select-all break-all border border-border/70">
                    %APPDATA%\dev-manager\models\fast-all-MiniLM-L6-v2
                  </div>
                </li>
                <li>
                  Extraia todo o conteúdo do arquivo <code>.tar.gz</code> dentro dessa pasta <code>fast-all-MiniLM-L6-v2</code> (devem conter arquivos como <code>model.onnx</code>, <code>tokenizer.json</code>, etc).
                </li>
                <li>
                  Volte nesta aba e clique em <strong>Indexar Documentação</strong> para gerar os embeddings neurais!
                </li>
              </ol>
            </div>

            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModelHelp(false)}
                className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sincronização Agnóstica de Documentação */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Cabeçalho do Modal com identidade clara de Cockpit */}
            <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">Sincronização de Documentação</h3>
                    <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
                      RAG Agnóstico
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Exporte trechos e vetores locais de 384 dimensões para o Espaço Ágil ou APIs externas sem custos de IA.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSyncModal(false);
                  setEditingTarget(null);
                  setSyncResults(null);
                }}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Barra de Progresso com Pulso e Indicadores Precisos */}
              {isSyncing && syncProgress && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/25 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      Transmitindo para {syncProgress.targetName}...
                    </span>
                    <span className="font-mono text-xs text-foreground font-semibold">
                      Lote {syncProgress.currentBatch}/{syncProgress.totalBatches} · {syncProgress.sentChunks} chunks{syncProgress.totalArticles ? ` · ${syncProgress.sentArticles || 0}/${syncProgress.totalArticles} artigos` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-primary/15 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${syncProgress.totalChunks ? Math.round((syncProgress.sentChunks / syncProgress.totalChunks) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Feedback de Resultados com estilo de Alerta de Cockpit */}
              {syncResults && (
                <div className="space-y-2">
                  {syncResults.map((res, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
                        res.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}
                    >
                      {res.success ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground">{res.targetName}</div>
                        <div className="text-[11px] mt-0.5">
                          {res.success
                            ? `Sincronização concluída com sucesso! ${res.totalChunksSent || 0} chunks${res.totalArticlesSent ? ` e ${res.totalArticlesSent} artigos` : ''} entregues em ${res.totalBatches} lote(s).`
                            : `Falha: ${res.error || 'Não foi possível conectar com o endpoint remoto'}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Barra de Status do Índice Local + Ação Geral */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/80">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Base Local:</span>{' '}
                  <span className="text-foreground/90 font-mono font-semibold">
                    {status?.totalChunks || 0} trechos
                  </span>{' '}
                  <span className="text-muted-foreground text-[11px]">
                    em {status?.totalFiles || 0} arquivos {!status?.isTextOnly && '· Vetorizado'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSyncNow()}
                    disabled={isSyncing || !hasIndex || syncTargets.filter((t) => t.enabled).length === 0}
                    className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Transmitindo...' : 'Sincronizar Habilitados'}</span>
                  </button>
                </div>
              </div>

              {/* Lista de Destinos Configurados */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Destinos de API Conectados ({syncTargets.length})
                  </h4>
                  {!editingTarget && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTarget({
                          name: '',
                          endpointUrl: '',
                          method: 'POST',
                          authHeader: 'X-Api-Key',
                          authValue: '',
                          batchSize: 50,
                          enabled: true
                        })
                      }
                      className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Destino
                    </button>
                  )}
                </div>

                {syncTargets.length === 0 && !editingTarget && (
                  <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2 bg-muted/10">
                    <Radio className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">Nenhum destino de API cadastrado ainda</p>
                    <p className="text-[11px] max-w-md mx-auto">
                      Cadastre o endpoint do <strong>Espaço Ágil</strong> (ex: <code>https://espacoagil.com.br/api/v1/knowledge/docs</code>) ou o novo backend local na VM para abastecer o chat.
                    </p>
                  </div>
                )}

                {syncTargets.map((target) => (
                  <div
                    key={target.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all flex items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={target.enabled}
                        onChange={(e) => handleToggleTargetEnabled(target, e.target.checked)}
                        className="rounded border-border mt-1 accent-primary cursor-pointer"
                        title="Ativar/desativar sincronização com este destino"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span className="truncate">{target.name}</span>
                          <span className="text-[10px] font-mono bg-muted/80 border border-border/60 px-1.5 py-0.5 rounded font-bold text-foreground">
                            {target.method || 'POST'}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                              target.syncMode === 'articles'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                                : target.syncMode === 'chunks'
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {target.syncMode === 'articles'
                              ? 'Artigos KB'
                              : target.syncMode === 'chunks'
                              ? 'Chunks RAG'
                              : 'Artigos + Chunks'}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate" title={target.endpointUrl}>
                          {target.endpointUrl}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                          <span>Lote: <strong>{target.batchSize || 50}</strong></span>
                          {target.authHeader && (
                            <span>Auth: <strong>{target.authHeader}</strong> ({target.authValue ? 'definida' : 'sem chave'})</span>
                          )}
                          {target.lastSyncedAt && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Último envio: {new Date(target.lastSyncedAt).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncNow(target.id)}
                        disabled={isSyncing || !hasIndex}
                        className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Enviar para este destino agora"
                      >
                        <Send className="w-3 h-3" /> Enviar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTarget(target)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Editar configuração"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTarget(target.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                        title="Remover destino"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulário Elegante de Destino */}
              {editingTarget && (
                <form onSubmit={handleSaveTarget} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-primary/15 pb-2.5">
                    <h5 className="text-xs font-bold text-foreground">
                      {editingTarget.id ? 'Editar Destino de API' : 'Novo Destino de API'}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setEditingTarget(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Nome Identificador</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Espaço Ágil Legado ou Backend VM"
                        value={editingTarget.name || ''}
                        onChange={(e) => setEditingTarget({ ...editingTarget, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Método HTTP</label>
                      <select
                        value={editingTarget.method || 'POST'}
                        onChange={(e) => setEditingTarget({ ...editingTarget, method: e.target.value as 'POST' | 'PUT' })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">URL do Endpoint de Ingestão</label>
                    <input
                      type="url"
                      required
                      placeholder="Ex: https://espacoagil.com.br/api/v1/knowledge/docs"
                      value={editingTarget.endpointUrl || ''}
                      onChange={(e) => setEditingTarget({ ...editingTarget, endpointUrl: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Seletor Visual de Modo de Sincronização (Cockpit Card Radio) */}
                  <div className="space-y-1.5 pt-0.5">
                    <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                      <span>Modo de Sincronização</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Define o destino dos dados</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTarget({ ...editingTarget, syncMode: 'all' })}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          (editingTarget.syncMode || 'all') === 'all'
                            ? 'bg-primary/10 border-primary shadow-xs'
                            : 'bg-background/60 border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span>Ambos</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Artigos completos na Base de Conhecimento vinculados aos Chunks para RAG.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingTarget({ ...editingTarget, syncMode: 'articles' })}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          editingTarget.syncMode === 'articles'
                            ? 'bg-primary/10 border-primary shadow-xs'
                            : 'bg-background/60 border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Artigos KB</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Apenas documentos completos para leitura e catálogo no Espaço Ágil.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingTarget({ ...editingTarget, syncMode: 'chunks' })}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          editingTarget.syncMode === 'chunks'
                            ? 'bg-primary/10 border-primary shadow-xs'
                            : 'bg-background/60 border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Chunks RAG</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Apenas trechos vetorizados para busca semântica do assistente neural.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Cabeçalho de Autenticação</label>
                      <input
                        type="text"
                        placeholder="X-Api-Key ou Authorization"
                        value={editingTarget.authHeader || 'X-Api-Key'}
                        onChange={(e) => setEditingTarget({ ...editingTarget, authHeader: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Token / API Key</label>
                      <input
                        type="password"
                        placeholder="Insira o segredo ou API key"
                        value={editingTarget.authValue || ''}
                        onChange={(e) => setEditingTarget({ ...editingTarget, authValue: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Tamanho do Lote</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={editingTarget.batchSize || 50}
                        onChange={(e) => setEditingTarget({ ...editingTarget, batchSize: Number(e.target.value) })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTarget(null)}
                      className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-sm cursor-pointer transition active:scale-95"
                    >
                      Salvar Destino
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="p-3.5 border-t border-border/80 bg-muted/30 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowSyncModal(false);
                  setEditingTarget(null);
                  setSyncResults(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações de Documentação & LLM */}
      <DocSettingsModal
        isOpen={showDocSettingsModal}
        onClose={() => setShowDocSettingsModal(false)}
        status={status}
        onOpenModelHelp={() => setShowModelHelp(true)}
        docFolders={docFolders}
        indexProjectsDocs={indexProjectsDocs}
        autoReindexOnChange={autoReindexOnChange}
        isAddingFolder={isAddingFolder}
        onToggleIndexProjects={handleToggleIndexProjects}
        onToggleAutoReindex={handleToggleAutoReindex}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        confluenceSources={confluenceSources}
        onSaveConfluenceSource={async (source) => {
          let updated: ConfluenceSourceConfig[];
          if (confluenceSources.some((s) => s.id === source.id)) {
            updated = confluenceSources.map((s) => (s.id === source.id ? source : s));
          } else {
            updated = [...confluenceSources, source];
          }
          setConfluenceSources(updated);
          await window.electronAPI?.saveSettings({ confluenceSources: updated });
        }}
        onDeleteConfluenceSource={handleDeleteConfluenceSource}
        onToggleConfluenceEnabled={handleToggleConfluenceEnabled}
        onTestConfluenceConnection={async (source) => {
          const tester = window.electronAPI?.testConfluenceConnection;
          if (!tester) {
            return { success: false, message: 'API não disponível.' };
          }
          return await tester(source);
        }}
        jiraSources={jiraSources}
        onSaveJiraSource={async (source) => {
          let updated: JiraSourceConfig[];
          if (jiraSources.some((s) => s.id === source.id)) {
            updated = jiraSources.map((s) => (s.id === source.id ? source : s));
          } else {
            updated = [...jiraSources, source];
          }
          setJiraSources(updated);
          await window.electronAPI?.saveSettings({ jiraSources: updated });
        }}
        onDeleteJiraSource={handleDeleteJiraSource}
        onToggleJiraEnabled={handleToggleJiraEnabled}
        onTestJiraConnection={async (source) => {
          const tester = window.electronAPI?.testJiraConnection;
          if (!tester) {
            return { success: false, message: 'API não disponível.' };
          }
          return await tester(source);
        }}
        llmProviders={llmProviders}
        activeLlmProviderId={activeLlmProviderId}
        onSaveLlmProvider={handleSaveLlmProvider}
        onDeleteLlmProvider={handleDeleteLlmProvider}
        onSetActiveLlmProvider={handleSetActiveLlmProvider}
        onTestLlmConnection={handleTestLlmConnection}
      />

      <OnboardingTour
        steps={DOCS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={DOCS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
