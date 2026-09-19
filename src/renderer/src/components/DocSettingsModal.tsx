import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  Globe,
  Layers,
  Settings,
  RefreshCw,
  Sparkles,
  Bot,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Sliders,
  Cpu,
  RotateCcw,
  Zap,
  Server,
  GitBranch,
  Copy,
  ExternalLink,
  Download
} from 'lucide-react';
import {
  DocFolderConfig,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  LlmProviderConfig,
  LlmProviderType,
  LlmTestResult,
  DocsIndexStatus
} from '../../../shared/types';

type TabType = 'folders' | 'sources' | 'llm';

interface DocSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Status de Indexação e Ajuda
  status?: DocsIndexStatus | null;
  onOpenModelHelp?: () => void;
  // Pastas locais e Git
  docFolders: DocFolderConfig[];
  indexProjectsDocs: boolean;
  autoReindexOnChange: boolean;
  isAddingFolder?: boolean;
  onToggleIndexProjects: (checked: boolean) => Promise<void>;
  onToggleAutoReindex: (checked: boolean) => Promise<void>;
  onAddFolder: () => Promise<void>;
  onRemoveFolder: (path: string) => Promise<void>;
  // Confluence
  confluenceSources: ConfluenceSourceConfig[];
  onSaveConfluenceSource: (source: ConfluenceSourceConfig) => Promise<void>;
  onDeleteConfluenceSource: (id: string) => Promise<void>;
  onToggleConfluenceEnabled: (source: ConfluenceSourceConfig, enabled: boolean) => Promise<void>;
  onTestConfluenceConnection: (source: ConfluenceSourceConfig) => Promise<{ success: boolean; message: string }>;
  // Jira
  jiraSources: JiraSourceConfig[];
  onSaveJiraSource: (source: JiraSourceConfig) => Promise<void>;
  onDeleteJiraSource: (id: string) => Promise<void>;
  onToggleJiraEnabled: (source: JiraSourceConfig, enabled: boolean) => Promise<void>;
  onTestJiraConnection: (source: JiraSourceConfig) => Promise<{ success: boolean; message: string }>;
  // LLM
  llmProviders: LlmProviderConfig[];
  activeLlmProviderId?: string;
  onSaveLlmProvider: (provider: LlmProviderConfig) => Promise<void>;
  onDeleteLlmProvider: (id: string) => Promise<void>;
  onSetActiveLlmProvider: (id: string) => Promise<void>;
  onTestLlmConnection: (provider: LlmProviderConfig) => Promise<LlmTestResult>;
}

const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente técnico especialista no ecossistema WinThor ERP e nas documentações internas da TOTVS. Responda de maneira clara, direta e objetiva, citando os arquivos e módulos de origem sempre que relevante.';

const PROVIDER_PRESETS: Array<{
  type: LlmProviderType;
  label: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  requiresApiKey: boolean;
}> = [
  {
    type: 'openai',
    label: 'OpenAI',
    name: 'OpenAI Oficial',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.5-preview', 'o3-mini'],
    requiresApiKey: true
  },
  {
    type: 'gemini',
    label: 'Google Gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    requiresApiKey: true
  },
  {
    type: 'anthropic',
    label: 'Anthropic Claude',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    requiresApiKey: true
  },
  {
    type: 'ollama',
    label: 'Ollama (Local)',
    name: 'Ollama Local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'deepseek-r1:8b', 'qwen2.5-coder', 'mistral'],
    requiresApiKey: false
  },
  {
    type: 'custom',
    label: 'OpenAI-Compatible / Custom',
    name: 'Endpoint Customizado',
    baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'default',
    models: [],
    requiresApiKey: false
  }
];

export const DocSettingsModal: React.FC<DocSettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onOpenModelHelp,
  docFolders,
  indexProjectsDocs,
  autoReindexOnChange,
  isAddingFolder = false,
  onToggleIndexProjects,
  onToggleAutoReindex,
  onAddFolder,
  onRemoveFolder,
  confluenceSources,
  onSaveConfluenceSource,
  onDeleteConfluenceSource,
  onToggleConfluenceEnabled,
  onTestConfluenceConnection,
  jiraSources,
  onSaveJiraSource,
  onDeleteJiraSource,
  onToggleJiraEnabled,
  onTestJiraConnection,
  llmProviders,
  activeLlmProviderId,
  onSaveLlmProvider,
  onDeleteLlmProvider,
  onSetActiveLlmProvider,
  onTestLlmConnection
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('folders');

  // Estado de edição Confluence
  const [editingConfluenceSource, setEditingConfluenceSource] = useState<Partial<ConfluenceSourceConfig> | null>(null);
  const [isTestingConfluenceId, setIsTestingConfluenceId] = useState<string | null>(null);
  const [confluenceTestResults, setConfluenceTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Estado de edição Jira
  const [editingJiraSource, setEditingJiraSource] = useState<Partial<JiraSourceConfig> | null>(null);
  const [isTestingJiraId, setIsTestingJiraId] = useState<string | null>(null);
  const [jiraTestResults, setJiraTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Estado de edição LLM
  const [editingLlmProvider, setEditingLlmProvider] = useState<Partial<LlmProviderConfig> | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<LlmTestResult | null>(null);
  const [llmSaveSuccess, setLlmSaveSuccess] = useState(false);

  // Auxiliares de Pastas
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

  const getFolderDisplayTitle = (folder: DocFolderConfig) => {
    if (folder.label && folder.label.trim()) return folder.label.trim();
    const normalized = folder.path.replace(/\\/g, '/').replace(/\/+$/, '');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
    }
    return parts[parts.length - 1] || folder.path;
  };

  // Atalho Esc para fechar modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handlers Confluence
  const handleSaveConfluence = async (e: React.FormEvent) => {
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

    await onSaveConfluenceSource(sourceToSave);
    setEditingConfluenceSource(null);
  };

  const handleTestConfluence = async (source: ConfluenceSourceConfig) => {
    setIsTestingConfluenceId(source.id);
    try {
      const res = await onTestConfluenceConnection(source);
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

  // Handlers Jira
  const handleSaveJira = async (e: React.FormEvent) => {
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

    await onSaveJiraSource(sourceToSave);
    setEditingJiraSource(null);
  };

  const handleTestJira = async (source: JiraSourceConfig) => {
    setIsTestingJiraId(source.id);
    try {
      const res = await onTestJiraConnection(source);
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

  // Handlers LLM
  const handleSelectPreset = (preset: (typeof PROVIDER_PRESETS)[0]) => {
    setEditingLlmProvider((prev) => ({
      ...prev,
      provider: preset.type,
      name: prev?.name || preset.name,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      temperature: prev?.temperature ?? 0.3,
      maxTokens: prev?.maxTokens ?? 2048,
      systemPrompt: prev?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      enabled: prev?.enabled !== undefined ? prev.enabled : true
    }));
    setLlmTestResult(null);
  };

  const handleStartNewLlmProvider = () => {
    const defaultPreset = PROVIDER_PRESETS[0];
    setEditingLlmProvider({
      id: `llm_${Date.now()}`,
      name: 'OpenAI Oficial',
      provider: 'openai',
      baseUrl: defaultPreset.baseUrl,
      model: defaultPreset.defaultModel,
      apiKey: '',
      temperature: 0.3,
      maxTokens: 2048,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      enabled: true
    });
    setLlmTestResult(null);
  };

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLlmProvider?.name || !editingLlmProvider?.model) return;

    const providerToSave: LlmProviderConfig = {
      id: editingLlmProvider.id || `llm_${Date.now()}`,
      name: editingLlmProvider.name.trim(),
      provider: editingLlmProvider.provider || 'openai',
      baseUrl: editingLlmProvider.baseUrl?.trim() || '',
      apiKey: editingLlmProvider.apiKey?.trim() || '',
      model: editingLlmProvider.model.trim(),
      temperature: editingLlmProvider.temperature ?? 0.3,
      maxTokens: editingLlmProvider.maxTokens ?? 2048,
      systemPrompt: editingLlmProvider.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
      enabled: editingLlmProvider.enabled !== undefined ? editingLlmProvider.enabled : true
    };

    await onSaveLlmProvider(providerToSave);
    setLlmSaveSuccess(true);
    setTimeout(() => setLlmSaveSuccess(false), 3000);
    setEditingLlmProvider(null);
  };

  const handleTestLlm = async () => {
    if (!editingLlmProvider) return;
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const mockConfig: LlmProviderConfig = {
        id: editingLlmProvider.id || 'test',
        name: editingLlmProvider.name || 'Teste',
        provider: editingLlmProvider.provider || 'openai',
        baseUrl: editingLlmProvider.baseUrl || '',
        apiKey: editingLlmProvider.apiKey || '',
        model: editingLlmProvider.model || 'gpt-4o-mini',
        temperature: editingLlmProvider.temperature ?? 0.3,
        maxTokens: editingLlmProvider.maxTokens ?? 2048,
        systemPrompt: editingLlmProvider.systemPrompt || '',
        enabled: true
      };
      const result = await onTestLlmConnection(mockConfig);
      setLlmTestResult(result);
    } catch (err: any) {
      setLlmTestResult({
        success: false,
        message: `Falha na requisição de teste: ${err?.message || err}`
      });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const activeProvider = llmProviders.find((p) => (activeLlmProviderId ? p.id === activeLlmProviderId : p.enabled));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header com estilo Cockpit */}
        <div className="p-4 px-5 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Configurações de Documentação & IA
                </h3>
                <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Cockpit RAG
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Fontes locais, repositórios Git, integrações Atlassian e Copilot de Linguagem (LLM).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de Navegação Estilo Cockpit */}
        <div className="flex border-b border-border bg-muted/20 px-5 pt-2.5 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('folders')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'folders'
                ? 'border-amber-500 text-foreground bg-card shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <FolderOpen className={`w-3.5 h-3.5 ${activeTab === 'folders' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span>Pastas Locais & Git</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-semibold">
              {docFolders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'sources'
                ? 'border-sky-500 text-foreground bg-card shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${activeTab === 'sources' ? 'text-sky-500' : 'text-muted-foreground'}`} />
            <span>Confluence & Jira</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-semibold">
              {confluenceSources.length + jiraSources.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('llm')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'llm'
                ? 'border-primary text-foreground bg-card shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'llm' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>Assistente IA / LLM</span>
            {activeProvider && activeProvider.enabled && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeProvider.model}</span>
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ========================================================================= */}
          {/* ABA 1: PASTAS LOCAIS & GIT                                                */}
          {/* ========================================================================= */}
          {activeTab === 'folders' && (
            <div className="space-y-4">
              {/* Card de Telemetria do Motor de Vetorização Local (Embeddings / RAG) */}
              <div className="p-3.5 rounded-xl border border-border/90 bg-muted/25 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Motor de Vetorização Local (Embeddings)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25 font-bold">
                        FastEmbed AllMiniLML6V2 (384d)
                      </span>
                      {status && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                            !status.isTextOnly
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !status.isTextOnly ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          <span>{!status.isTextOnly ? 'Neural Ativo' : 'Modo Textual'}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Executado <strong>100% localmente</strong> no seu computador via ONNX. Acionado pelo botão <strong>Reindexar</strong> ou pelo <strong>Watchdog</strong>.
                    </p>
                  </div>
                </div>
                {onOpenModelHelp && (
                  <button
                    type="button"
                    onClick={onOpenModelHelp}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-auto sm:ml-0"
                    title="Instruções para download e instalação manual offline do modelo em redes corporativas"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalação offline</span>
                  </button>
                )}
              </div>

              {/* Painel Cockpit: Escopo de Indexação Automática */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card Toggle Git */}
                <div className="p-3.5 rounded-xl border border-border/90 bg-card hover:border-border transition-colors shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <GitBranch className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Repositórios Git
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={indexProjectsDocs}
                        onClick={() => onToggleIndexProjects(!indexProjectsDocs)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          indexProjectsDocs ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        title={indexProjectsDocs ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            indexProjectsDocs ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Vasculha arquivos README e pastas docs/ em todos os projetos Git clonados no Dev Manager.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => onToggleIndexProjects(!indexProjectsDocs)}
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90 active:scale-95 ${
                        indexProjectsDocs
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                          : 'bg-muted/80 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                      }`}
                      title={indexProjectsDocs ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          indexProjectsDocs ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <span>{indexProjectsDocs ? 'Indexação Ativa' : 'Desativado (clique para ativar)'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Toggle Auto Reindex */}
                <div className="p-3.5 rounded-xl border border-border/90 bg-card hover:border-border transition-colors shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Watchdog Automático
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoReindexOnChange}
                        onClick={() => onToggleAutoReindex(!autoReindexOnChange)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          autoReindexOnChange ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        title={autoReindexOnChange ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            autoReindexOnChange ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Monitora o sistema de arquivos e reindexa trechos semanticamente em segundo plano ao salvar.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => onToggleAutoReindex(!autoReindexOnChange)}
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90 active:scale-95 ${
                        autoReindexOnChange
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                          : 'bg-muted/80 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                      }`}
                      title={autoReindexOnChange ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          autoReindexOnChange ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <span>{autoReindexOnChange ? 'Watchdog Ativo' : 'Apenas Manual (clique para ativar)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Pastas Locais de Documentação */}
              <div className="p-4 rounded-xl border border-border/90 bg-card space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        <span>Pastas Locais Dedicadas</span>
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {docFolders.length} {docFolders.length === 1 ? 'pasta' : 'pastas'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Diretórios fora do Git contendo manuais, especificações ou guias (.md, .txt, .pdf, .docx).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onAddFolder}
                    disabled={isAddingFolder}
                    className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar pasta de docs</span>
                  </button>
                </div>

                {docFolders.length === 0 ? (
                  <div className="text-center py-7 px-4 border border-dashed border-border/80 rounded-xl bg-muted/10 space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/60">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Nenhuma pasta local configurada</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                        Adicione diretórios dedicados de documentação para que seus arquivos sejam indexados no RAG.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onAddFolder}
                      disabled={isAddingFolder}
                      className="mt-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Selecionar Pasta no Computador</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docFolders.map((folder) => (
                      <div
                        key={folder.path}
                        className="group p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 group-hover:scale-105 transition-transform">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground truncate">
                                {getFolderDisplayTitle(folder)}
                              </span>
                              <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60 shrink-0">
                                Pasta Local
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5" title={folder.path}>
                              {folder.path}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyFolderPath(folder.path)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            title={copiedFolderPath === folder.path ? 'Caminho copiado!' : 'Copiar caminho completo'}
                          >
                            {copiedFolderPath === folder.path ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenFolderInExplorer(folder.path)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            title="Revelar pasta no Explorador de Arquivos"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFolder(folder.path)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                            title="Remover pasta da indexação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: CONFLUENCE & JIRA                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              {/* Confluence */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-500" />
                      <span>Espaços Confluence</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Páginas do Confluence indexadas como documentação local para busca.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConfluenceSource({ enabled: true })}
                    className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo espaço Confluence</span>
                  </button>
                </div>

                {confluenceSources.length === 0 && !editingConfluenceSource ? (
                  <div className="text-center py-5 border border-dashed border-border rounded-xl bg-muted/20">
                    <Globe className="w-6 h-6 mx-auto text-sky-500/50 mb-1" />
                    <p className="text-xs font-semibold text-foreground">Nenhum espaço Confluence configurado</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Conecte sua wiki técnica da Atlassian para indexar páginas e especificações.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {confluenceSources.map((source) => (
                      <li key={source.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/80 transition-all space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={source.enabled}
                              onChange={(e) => onToggleConfluenceEnabled(source, e.target.checked)}
                              className="text-primary focus:ring-0 shrink-0 accent-primary cursor-pointer"
                            />
                            <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span className="font-semibold text-foreground truncate">{source.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{source.baseUrl}</span>
                            {source.spaceKey && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0 font-bold">
                                {source.spaceKey}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTestConfluence(source)}
                              disabled={isTestingConfluenceId === source.id}
                              className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                            >
                              {isTestingConfluenceId === source.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Testar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingConfluenceSource(source)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteConfluenceSource(source.id)}
                              className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {confluenceTestResults[source.id] && (
                          <div
                            className={`text-[10px] px-2 py-1 rounded-md ${
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

                {/* Formulário Confluence */}
                {editingConfluenceSource && (
                  <form onSubmit={handleSaveConfluence} className="mt-2 p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {editingConfluenceSource.id ? 'Editar Espaço Confluence' : 'Novo Espaço Confluence'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingConfluenceSource(null)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">Nome Identificador</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Wiki Interno"
                          value={editingConfluenceSource.name || ''}
                          onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, name: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">Space Key (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: PRO (vazio = todos os espaços)"
                          value={editingConfluenceSource.spaceKey || ''}
                          onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, spaceKey: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">E-mail (Cloud — deixe vazio para Server)</label>
                        <input
                          type="email"
                          placeholder="voce@empresa.com"
                          value={editingConfluenceSource.authEmail || ''}
                          onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, authEmail: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">Token de API / PAT</label>
                        <input
                          type="password"
                          required
                          placeholder="Token de Acesso"
                          value={editingConfluenceSource.authToken || ''}
                          onChange={(e) => setEditingConfluenceSource({ ...editingConfluenceSource, authToken: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition text-xs cursor-pointer shadow-xs active:scale-95"
                      >
                        Salvar Espaço Confluence
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Jira */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>Projetos & Issues Jira</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Issues do Jira indexadas como documentos técnicos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingJiraSource({ enabled: true })}
                    className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo projeto Jira</span>
                  </button>
                </div>

                {jiraSources.length === 0 && !editingJiraSource ? (
                  <div className="text-center py-5 border border-dashed border-border rounded-xl bg-muted/20">
                    <Layers className="w-6 h-6 mx-auto text-blue-500/50 mb-1" />
                    <p className="text-xs font-semibold text-foreground">Nenhum projeto Jira configurado</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adicione projetos ou filtros JQL para transformar issues e requisitos em base de busca técnica.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {jiraSources.map((source) => (
                      <li key={source.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/80 transition-all space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={source.enabled}
                              onChange={(e) => onToggleJiraEnabled(source, e.target.checked)}
                              className="text-primary focus:ring-0 shrink-0 accent-primary cursor-pointer"
                            />
                            <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-semibold text-foreground truncate">{source.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{source.baseUrl}</span>
                            {source.projectKey && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0 font-bold">
                                {source.projectKey}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTestJira(source)}
                              disabled={isTestingJiraId === source.id}
                              className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                            >
                              {isTestingJiraId === source.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Testar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingJiraSource(source)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteJiraSource(source.id)}
                              className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {jiraTestResults[source.id] && (
                          <div
                            className={`text-[10px] px-2 py-1 rounded-md ${
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

                {/* Formulário Jira */}
                {editingJiraSource && (
                  <form onSubmit={handleSaveJira} className="mt-2 p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {editingJiraSource.id ? 'Editar Projeto Jira' : 'Novo Projeto Jira'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingJiraSource(null)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">Nome Identificador</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Projeto WinThor Core"
                          value={editingJiraSource.name || ''}
                          onChange={(e) => setEditingJiraSource({ ...editingJiraSource, name: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground">Project Key (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: WIN (opcional)"
                          value={editingJiraSource.projectKey || ''}
                          onChange={(e) => setEditingJiraSource({ ...editingJiraSource, projectKey: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground">JQL Customizado (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: project = WIN AND status != Done ORDER BY updated DESC"
                        value={editingJiraSource.jql || ''}
                        onChange={(e) => setEditingJiraSource({ ...editingJiraSource, jql: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground">Token de API / PAT (Bearer)</label>
                      <input
                        type="password"
                        required
                        placeholder="Token de Acesso"
                        value={editingJiraSource.authToken || ''}
                        onChange={(e) => setEditingJiraSource({ ...editingJiraSource, authToken: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition text-xs cursor-pointer shadow-xs active:scale-95"
                      >
                        Salvar Projeto Jira
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: ASSISTENTE IA / LLM                                                */}
          {/* ========================================================================= */}
          {activeTab === 'llm' && (
            <div className="space-y-4">
              {/* Painel de Provedor Ativo / Lista */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Provedores de IA / LLM (BYOK)</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Conecte seu modelo de linguagem para sintetizar respostas com base na documentação indexada (RAG).
                    </p>
                  </div>
                  {!editingLlmProvider && (
                    <button
                      type="button"
                      onClick={handleStartNewLlmProvider}
                      className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Configurar Provedor</span>
                    </button>
                  )}
                </div>

                {/* Lista de Provedores Salvos */}
                {llmProviders.length === 0 && !editingLlmProvider ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-xl bg-muted/20">
                    <Bot className="w-8 h-8 mx-auto text-muted-foreground/50 mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Nenhum provedor de IA cadastrado</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adicione seu provedor preferido (OpenAI, Gemini, Claude, Ollama ou customizado).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {llmProviders.map((p) => {
                      const isActive = activeLlmProviderId ? p.id === activeLlmProviderId : p.enabled;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-primary/5 border-primary/40 shadow-xs'
                              : 'bg-muted/30 border-border/80 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onSetActiveLlmProvider(p.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
                                  : 'bg-muted text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80'
                              }`}
                              title={isActive ? 'Provedor ativo para o RAG' : 'Clique para ativar este provedor'}
                            >
                              {isActive ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativo</span>
                                </>
                              ) : (
                                <span>Ativar</span>
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-semibold">
                                  {p.model}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {p.baseUrl || (p.provider === 'gemini' ? 'Google API' : 'Padrão')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingLlmProvider(p)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                              title="Editar configuração"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLlmProvider(p.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                              title="Remover provedor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Feedback de salvamento */}
              {llmSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Configuração do modelo de IA salva com sucesso!</span>
                </div>
              )}

              {/* Formulário de Configuração / Edição de LLM */}
              {editingLlmProvider && (
                <form
                  onSubmit={handleSaveLlm}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 shadow-xs animate-in fade-in-0"
                >
                  <div className="flex items-center justify-between border-b border-primary/15 pb-2.5">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                      <span>{editingLlmProvider.id ? 'Editar Provedor de IA' : 'Novo Provedor de IA'}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setEditingLlmProvider(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Seletor Rápido de Presets / Provedores */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground">Provedores Recomendados</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {PROVIDER_PRESETS.map((preset) => {
                        const isSelected = (editingLlmProvider.provider || 'openai') === preset.type;
                        return (
                          <button
                            key={preset.type}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                                : 'bg-background/80 border-border text-foreground hover:border-primary/40'
                            }`}
                          >
                            <div className="text-xs truncate">{preset.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nome e Modelo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Nome Identificador</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: OpenAI ChatGPT ou Ollama Local"
                        value={editingLlmProvider.name || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Nome do Modelo (Model ID)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, llama3.2"
                        value={editingLlmProvider.model || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, model: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Sugestões de Modelos Rápidos */}
                  {(() => {
                    const matchedPreset = PROVIDER_PRESETS.find(
                      (p) => p.type === (editingLlmProvider.provider || 'openai')
                    );
                    if (matchedPreset && matchedPreset.models.length > 0) {
                      return (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold">Modelos sugeridos:</span>
                          {matchedPreset.models.map((mod) => (
                            <button
                              key={mod}
                              type="button"
                              onClick={() => setEditingLlmProvider({ ...editingLlmProvider, model: mod })}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border cursor-pointer transition ${
                                editingLlmProvider.model === mod
                                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                  : 'bg-background hover:bg-muted text-foreground border-border'
                              }`}
                            >
                              {mod}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Base URL e API Key */}
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>URL Base da API (Endpoint)</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {editingLlmProvider.provider === 'ollama' ? 'Padrão local Ollama' : 'Compatível com OpenAI'}
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://api.openai.com/v1 ou http://localhost:11434/v1"
                        value={editingLlmProvider.baseUrl || ''}
                        onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, baseUrl: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground">Chave de API / Token</label>
                        <span className="text-[10px] text-muted-foreground">
                          {editingLlmProvider.provider === 'ollama'
                            ? 'Opcional para Ollama local'
                            : 'Fica salva localmente nas configurações'}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={
                            editingLlmProvider.provider === 'ollama'
                              ? 'Não necessária para Ollama'
                              : 'sk-... ou token de autenticação'
                          }
                          value={editingLlmProvider.apiKey || ''}
                          onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, apiKey: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Parâmetros Avançados: Temperatura e Max Tokens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground">Temperatura</label>
                        <span className="text-[10px] font-mono text-primary font-bold">
                          {editingLlmProvider.temperature ?? 0.3}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editingLlmProvider.temperature ?? 0.3}
                        onChange={(e) =>
                          setEditingLlmProvider({ ...editingLlmProvider, temperature: parseFloat(e.target.value) })
                        }
                        className="w-full accent-primary cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Preciso (0.0)</span>
                        <span>Equilibrado (0.3)</span>
                        <span>Criativo (1.0)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Limite Máximo de Tokens</label>
                      <input
                        type="number"
                        min={256}
                        max={8192}
                        step={256}
                        value={editingLlmProvider.maxTokens ?? 2048}
                        onChange={(e) =>
                          setEditingLlmProvider({ ...editingLlmProvider, maxTokens: parseInt(e.target.value) || 2048 })
                        }
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Prompt de Sistema */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-foreground">Instruções de Sistema (RAG Context)</label>
                      <button
                        type="button"
                        onClick={() => setEditingLlmProvider({ ...editingLlmProvider, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                        className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Restaurar padrão WinThor
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={editingLlmProvider.systemPrompt || ''}
                      onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, systemPrompt: e.target.value })}
                      placeholder="Instruções para orientar o assistente sobre o domínio do projeto..."
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                    />
                  </div>

                  {/* Resultado do Teste */}
                  {llmTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        llmTestResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}
                    >
                      {llmTestResult.success ? (
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">
                          {llmTestResult.success ? 'Conexão Estabelecida!' : 'Falha no Teste de Conexão'}
                          {llmTestResult.latencyMs !== undefined && (
                            <span className="ml-2 text-[10px] font-mono font-normal opacity-80">
                              ({llmTestResult.latencyMs}ms)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5">{llmTestResult.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Ações do Formulário */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-primary/15">
                    <button
                      type="button"
                      onClick={handleTestLlm}
                      disabled={isTestingLlm || !editingLlmProvider.model}
                      className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingLlm ? 'animate-spin' : ''}`} />
                      <span>{isTestingLlm ? 'Testando Conexão...' : 'Testar Conexão'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingLlmProvider(null)}
                        className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs cursor-pointer transition active:scale-95"
                      >
                        Salvar Provedor
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal com Telemetria e Ações */}
        <div className="p-3.5 px-5 border-t border-border bg-muted/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">
              {docFolders.length} {docFolders.length === 1 ? 'pasta local' : 'pastas locais'} ·{' '}
              {confluenceSources.length + jiraSources.length} integrações Atlassian
              {activeProvider && activeProvider.enabled && ` · IA: ${activeProvider.name}`}
            </span>
            <span className="sm:hidden">
              {docFolders.length} locais · {confluenceSources.length + jiraSources.length} cloud
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 rounded-xl transition cursor-pointer"
            >
              Fechar (Esc)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
