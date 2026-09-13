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
  Eye,
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
  Cpu
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
  JiraSourceConfig
} from '../../../shared/types';
import { MarkdownReader } from '../components/MarkdownReader';

interface DocsPageProps {
  onNavigateToSettings?: () => void;
}

const PHASE_LABELS: Record<DocsIndexProgress['phase'], string> = {
  'loading-model': 'Carregando modelo de IA (pode baixar na primeira vez)...',
  scanning: 'Descobrindo projetos e arquivos de documentação...',
  embedding: 'Processando documentos...',
  saving: 'Salvando índice...',
  done: 'Indexação concluída.'
};

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateToSettings }) => {
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
  const [isTestingConfluenceId, setIsTestingConfluenceId] = useState<string | null>(null);
  const [confluenceTestResults, setConfluenceTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fontes Jira (input do RAG — issues viram "documentos", mesmo padrão do Confluence acima)
  const [jiraSources, setJiraSources] = useState<JiraSourceConfig[]>([]);
  const [editingJiraSource, setEditingJiraSource] = useState<Partial<JiraSourceConfig> | null>(null);
  const [isTestingJiraId, setIsTestingJiraId] = useState<string | null>(null);
  const [jiraTestResults, setJiraTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

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

  const handleSaveConfluenceSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfluenceSource?.name || !editingConfluenceSource?.baseUrl || !editingConfluenceSource?.authToken) return;

    const sourceToSave: ConfluenceSourceConfig = {
      id: editingConfluenceSource.id || `confluence_${Date.now()}`,
      name: editingConfluenceSource.name.trim(),
      baseUrl: editingConfluenceSource.baseUrl.trim(),
      spaceKey: editingConfluenceSource.spaceKey?.trim() || undefined,
      authToken: editingConfluenceSource.authToken.trim(),
      authEmail: editingConfluenceSource.authEmail?.trim() || undefined,
      enabled: editingConfluenceSource.enabled !== undefined ? editingConfluenceSource.enabled : true
    };

    let updated: ConfluenceSourceConfig[];
    if (editingConfluenceSource.id) {
      updated = confluenceSources.map((s) => (s.id === editingConfluenceSource.id ? sourceToSave : s));
    } else {
      updated = [...confluenceSources, sourceToSave];
    }

    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
    setEditingConfluenceSource(null);
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

  const handleTestConfluenceConnection = async (source: ConfluenceSourceConfig) => {
    if (!window.electronAPI?.testConfluenceConnection) return;
    setIsTestingConfluenceId(source.id);
    try {
      const res = await window.electronAPI.testConfluenceConnection(source);
      setConfluenceTestResults((prev) => ({ ...prev, [source.id]: res }));
    } catch (err: any) {
      setConfluenceTestResults((prev) => ({
        ...prev,
        [source.id]: { success: false, message: err?.message || 'Falha ao testar conexão.' }
      }));
    } finally {
      setIsTestingConfluenceId(null);
    }
  };

  const handleSaveJiraSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJiraSource?.name || !editingJiraSource?.baseUrl || !editingJiraSource?.authToken) return;

    const sourceToSave: JiraSourceConfig = {
      id: editingJiraSource.id || `jira_${Date.now()}`,
      name: editingJiraSource.name.trim(),
      baseUrl: editingJiraSource.baseUrl.trim(),
      projectKey: editingJiraSource.projectKey?.trim() || undefined,
      jql: editingJiraSource.jql?.trim() || undefined,
      authToken: editingJiraSource.authToken.trim(),
      enabled: editingJiraSource.enabled !== undefined ? editingJiraSource.enabled : true
    };

    let updated: JiraSourceConfig[];
    if (editingJiraSource.id) {
      updated = jiraSources.map((s) => (s.id === editingJiraSource.id ? sourceToSave : s));
    } else {
      updated = [...jiraSources, sourceToSave];
    }

    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
    setEditingJiraSource(null);
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

  const handleTestJiraConnection = async (source: JiraSourceConfig) => {
    if (!window.electronAPI?.testJiraConnection) return;
    setIsTestingJiraId(source.id);
    try {
      const res = await window.electronAPI.testJiraConnection(source);
      setJiraTestResults((prev) => ({ ...prev, [source.id]: res }));
    } catch (err: any) {
      setJiraTestResults((prev) => ({
        ...prev,
        [source.id]: { success: false, message: err?.message || 'Falha ao testar conexão.' }
      }));
    } finally {
      setIsTestingJiraId(null);
    }
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

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!window.electronAPI || !query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
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

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
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
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Busca semântica local (RAG) sobre o README/docs dos projetos e das pastas adicionais configuradas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              title="Gerenciar e enviar documentos vetorizados para APIs externas (ex: Espaço Ágil)"
            >
              <Send className="w-3.5 h-3.5 text-primary" />
              <span>Sincronizações ({syncTargets.filter((t) => t.enabled).length})</span>
            </button>

            <button
              onClick={handleReindex}
              disabled={isIndexing}
              className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
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

      {/* Fontes de Documentação & Pastas */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0 space-y-3.5">
        {/* Toggle para varrer projetos Git */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Buscar documentação dentro dos Projetos Git</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  indexProjectsDocs
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}
              >
                {indexProjectsDocs ? 'Ativado' : 'Desativado'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {indexProjectsDocs
                ? 'O indexador vasculhará todos os repositórios da Pasta de Projetos além das pastas abaixo.'
                : 'Desativado: o Dev Manager indexa exclusivamente as pastas informadas abaixo, sem vasculhar os projetos Git.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={indexProjectsDocs}
              onChange={(e) => handleToggleIndexProjects(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Toggle para auto-reindex ao detectar mudanças nas pastas locais */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Reindexar automaticamente ao detectar mudanças</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  autoReindexOnChange
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}
              >
                {autoReindexOnChange ? 'Ativado' : 'Desativado'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {autoReindexOnChange
                ? 'O Dev Manager observa as pastas locais indexadas e reindexa sozinho quando um arquivo muda, avisando por notificação quando terminar.'
                : 'Desativado: a reindexação só acontece quando você clica em "Reindexar" manualmente.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={autoReindexOnChange}
              onChange={(e) => handleToggleAutoReindex(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Lista de Pastas de Documentação */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Pastas de Documentação</h3>
              <p className="text-[11px] text-muted-foreground">
                Pastas contendo documentações (.md, .txt, .pdf, .docx) organizadas por projetos ou manuais centrais.
              </p>
            </div>
            <button
              onClick={handleAddFolder}
              disabled={isAddingFolder}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar pasta de docs</span>
            </button>
          </div>

          {docFolders.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-border rounded-xl bg-card/40">
              <p className="text-[11px] text-muted-foreground">
                Nenhuma pasta de documentação configurada. Clique em "Adicionar pasta de docs" para indicar de onde buscar as documentações.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {docFolders.map((folder) => (
                <li
                  key={folder.path}
                  className="flex items-center justify-between gap-2 text-xs bg-card border border-border/80 rounded-lg px-3 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-foreground truncate">{folder.path}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folder.path)}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                    title="Remover pasta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fontes Confluence */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Fontes Confluence</h3>
              <p className="text-[11px] text-muted-foreground">
                Espaços do Confluence (Cloud ou Server) indexados como documentação, via token de API.
              </p>
            </div>
            <button
              onClick={() => setEditingConfluenceSource({ enabled: true })}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo espaço Confluence</span>
            </button>
          </div>

          {confluenceSources.length === 0 && !editingConfluenceSource ? (
            <div className="text-center py-4 border border-dashed border-border rounded-xl bg-card/40">
              <p className="text-[11px] text-muted-foreground">Nenhuma fonte Confluence configurada.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {confluenceSources.map((source) => (
                <li key={source.id} className="bg-card border border-border/80 rounded-lg px-3 py-1.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(e) => handleToggleConfluenceEnabled(source, e.target.checked)}
                        className="text-primary focus:ring-0 shrink-0"
                      />
                      <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="font-semibold text-foreground truncate">{source.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{source.baseUrl}</span>
                      {source.spaceKey && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0">
                          {source.spaceKey}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTestConfluenceConnection(source)}
                        disabled={isTestingConfluenceId === source.id}
                        className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        {isTestingConfluenceId === source.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Testar'}
                      </button>
                      <button
                        onClick={() => setEditingConfluenceSource(source)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfluenceSource(source.id)}
                        className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {confluenceTestResults[source.id] && (
                    <div
                      className={`text-[10px] px-1.5 py-1 rounded-md ${
                        confluenceTestResults[source.id].success
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {confluenceTestResults[source.id].message}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editingConfluenceSource && (
            <form
              onSubmit={handleSaveConfluenceSource}
              className="mt-2 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">
                  {editingConfluenceSource.id ? 'Editar Fonte Confluence' : 'Nova Fonte Confluence'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingConfluenceSource(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Wiki Interno"
                    value={editingConfluenceSource.name || ''}
                    onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Space Key (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: PRO (todo o Confluence se vazio)"
                    value={editingConfluenceSource.spaceKey || ''}
                    onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, spaceKey: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground">URL Base do Confluence</label>
                <input
                  type="url"
                  required
                  placeholder="https://empresa.atlassian.net ou https://confluence.empresa.com"
                  value={editingConfluenceSource.baseUrl || ''}
                  onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, baseUrl: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">
                    E-mail (Confluence Cloud — deixe vazio para Server/PAT)
                  </label>
                  <input
                    type="email"
                    placeholder="voce@empresa.com"
                    value={editingConfluenceSource.authEmail || ''}
                    onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, authEmail: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Token de API / PAT</label>
                  <input
                    type="password"
                    required
                    placeholder="Token"
                    value={editingConfluenceSource.authToken || ''}
                    onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, authToken: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Token fica salvo em texto plano nas configurações locais, mesmo padrão dos destinos de sincronização acima.
              </p>
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition text-[11px]"
              >
                Salvar Fonte
              </button>
            </form>
          )}
        </div>

        {/* Fontes Jira */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Fontes Jira</h3>
              <p className="text-[11px] text-muted-foreground">
                Projetos/JQLs do Jira indexados como documentação — cada issue vira um "documento".
              </p>
            </div>
            <button
              onClick={() => setEditingJiraSource({ enabled: true })}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo projeto Jira</span>
            </button>
          </div>

          {jiraSources.length === 0 && !editingJiraSource ? (
            <div className="text-center py-4 border border-dashed border-border rounded-xl bg-card/40">
              <p className="text-[11px] text-muted-foreground">Nenhuma fonte Jira configurada.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {jiraSources.map((source) => (
                <li key={source.id} className="bg-card border border-border/80 rounded-lg px-3 py-1.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(e) => handleToggleJiraEnabled(source, e.target.checked)}
                        className="text-primary focus:ring-0 shrink-0"
                      />
                      <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-foreground truncate">{source.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{source.baseUrl}</span>
                      {source.projectKey && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0">
                          {source.projectKey}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTestJiraConnection(source)}
                        disabled={isTestingJiraId === source.id}
                        className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        {isTestingJiraId === source.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Testar'}
                      </button>
                      <button
                        onClick={() => setEditingJiraSource(source)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteJiraSource(source.id)}
                        className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {jiraTestResults[source.id] && (
                    <div
                      className={`text-[10px] px-1.5 py-1 rounded-md ${
                        jiraTestResults[source.id].success
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {jiraTestResults[source.id].message}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editingJiraSource && (
            <form
              onSubmit={handleSaveJiraSource}
              className="mt-2 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">
                  {editingJiraSource.id ? 'Editar Fonte Jira' : 'Nova Fonte Jira'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingJiraSource(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Projeto PRO"
                    value={editingJiraSource.name || ''}
                    onChange={(e) => setEditingJiraSource({ ...editingJiraSource, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Project Key (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: PRO"
                    value={editingJiraSource.projectKey || ''}
                    onChange={(e) => setEditingJiraSource({ ...editingJiraSource, projectKey: e.target.value })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground">URL Base do Jira</label>
                <input
                  type="url"
                  required
                  placeholder="https://empresa.atlassian.net ou https://jira.empresa.com"
                  value={editingJiraSource.baseUrl || ''}
                  onChange={(e) => setEditingJiraSource({ ...editingJiraSource, baseUrl: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground">JQL customizado (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: project = PRO AND status != Done ORDER BY updated DESC"
                  value={editingJiraSource.jql || ''}
                  onChange={(e) => setEditingJiraSource({ ...editingJiraSource, jql: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground">Token de API / PAT (Bearer)</label>
                <input
                  type="password"
                  required
                  placeholder="Token"
                  value={editingJiraSource.authToken || ''}
                  onChange={(e) => setEditingJiraSource({ ...editingJiraSource, authToken: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Token fica salvo em texto plano nas configurações locais, mesmo padrão das fontes Confluence acima.
              </p>
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition text-[11px]"
              >
                Salvar Fonte
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
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
            disabled={isSearching || !query.trim() || !hasIndex}
            className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
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
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Pasta de Projetos</span>
              </button>
            )}
          </div>
        )}

        {/* MODO BUSCA ATIVA */}
        {hasIndex && hasSearched && query.trim() && (
          <div className="space-y-2.5">
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
          <div className="space-y-3">
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
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="cockpit-card rounded-xl p-3 border border-border shadow-xs flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="text-xs font-semibold text-foreground truncate" title={file.title}>
                          {file.title.split(/[\\/]/).pop()}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" title={file.title}>
                        {file.title} · {file.chunkCount} {file.chunkCount === 1 ? 'trecho' : 'trechos'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenPreview(file.id, file.title)}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                        title="Ler documento formatado"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ler</span>
                      </button>
                      <button
                        onClick={() => handleOpenInEditor(file.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Abrir no editor padrão"
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
                ))}
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
    </div>
  );
};
