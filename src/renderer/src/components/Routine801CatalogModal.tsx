import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Server,
  Terminal,
  ChevronDown,
  ChevronUp,
  RotateCw,
  ArrowRight,
  Package,
  Info,
  Copy,
  Check,
  Layers2,
  Plus,
  Filter
} from 'lucide-react';
import {
  Routine801CatalogResponse,
  Routine801Feature,
  Routine801InstallResult
} from '../../../shared/types';
import {
  filterRoutine801Features,
  findRepositoryForFeatureUi,
  buildKarafInstallCommandsUi,
  extractVersionFamilies,
  inferFeatureMavenUrl
} from '../utils/routine801UiUtils';

interface Routine801CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Routine801CatalogModal: React.FC<Routine801CatalogModalProps> = ({ isOpen, onClose }) => {
  // Abas principais: 'updates' (Atualizações) | 'installs' (Instalações)
  const [activeTab, setActiveTab] = useState<'updates' | 'installs'>('updates');

  // Catálogos e estado de carregamento
  const [updatesCatalog, setUpdatesCatalog] = useState<Routine801CatalogResponse>({ repositorios: [], funcionalidades: [] });
  const [installsCatalog, setInstallsCatalog] = useState<Routine801CatalogResponse>({ repositorios: [], funcionalidades: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filtros rápidos
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [versionFilter, setVersionFilter] = useState<string>('ALL');

  // Seleção múltipla para instalação em lote
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, Routine801Feature>>({});
  const [batchVersionOverride, setBatchVersionOverride] = useState<string>('');

  // Inspector Drawer: artefato atualmente selecionado para inspeção técnica
  const [inspectedFeature, setInspectedFeature] = useState<Routine801Feature | null>(null);
  const [inspectedCustomVersion, setInspectedCustomVersion] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Instalação Direta de Versão Específica
  const [isDirectInstallOpen, setIsDirectInstallOpen] = useState<boolean>(false);
  const [directInstallNome, setDirectInstallNome] = useState<string>('winthor-atualizacao-dados');
  const [directInstallVersao, setDirectInstallVersao] = useState<string>('1.38.0.0');
  const [directInstallTipo, setDirectInstallTipo] = useState<'SERVICO' | 'ROTINA'>('SERVICO');
  const [directInstallAction, setDirectInstallAction] = useState<'install' | 'repo_add_only'>('install');

  // Execução e Telemetria em Tempo Real
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeVia, setExecuteVia] = useState<'karaf_cli' | 'api'>('karaf_cli');
  const [executingTargetName, setExecutingTargetName] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERRORS'>('ALL');
  const [lastResult, setLastResult] = useState<Routine801InstallResult | null>(null);

  // Configuração da URL do Servidor Karaf / WTA
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>('http://localhost:8889');
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionHealth, setConnectionHealth] = useState<{ ok: boolean; message: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Carrega configurações iniciais e consulta catálogo
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadInitialCatalog = async () => {
      let activeUrl = serverUrlInput;
      if (window.electronAPI?.getSettings) {
        try {
          const st = await window.electronAPI.getSettings();
          const configuredUrl = st.routine801Url || st.wtaUrl || 'http://localhost:8889';
          if (!cancelled) {
            setServerUrlInput(configuredUrl);
            activeUrl = configuredUrl;
          }
        } catch (e) {
          console.warn('[Rotina 801] Erro ao carregar configurações:', e);
        }
      }
      if (!cancelled) {
        fetchCatalogs(activeUrl);
      }
    };

    loadInitialCatalog();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Listener de streaming de logs do console Karaf
  useEffect(() => {
    if (!window.electronAPI?.onKarafLogChunk) return;
    const unsub = window.electronAPI.onKarafLogChunk((chunk: string) => {
      setConsoleLogs((prev) => {
        const next = [...prev, chunk];
        return next.length > 2500 ? next.slice(next.length - 2500) : next;
      });
    });
    return () => unsub();
  }, []);

  // Atalhos de teclado: Esc para fechar drawer ou modal, / para focar busca
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDirectInstallOpen) {
          setIsDirectInstallOpen(false);
        } else if (inspectedFeature) {
          setInspectedFeature(null);
        } else if (isConfigOpen) {
          setIsConfigOpen(false);
        } else if (isConsoleExpanded) {
          setIsConsoleExpanded(false);
        } else {
          onClose();
        }
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirectInstallOpen, inspectedFeature, isConfigOpen, isConsoleExpanded, onClose]);

  // Scroll automático do console
  useEffect(() => {
    if (isConsoleExpanded && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, isConsoleExpanded]);

  // Consulta catálogos no backend
  const fetchCatalogs = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || serverUrlInput).trim();
    setIsLoading(true);
    setErrorBanner(null);
    try {
      if (window.electronAPI?.routine801GetUpdates && window.electronAPI?.routine801GetInstallations) {
        const [updatesData, installsData] = await Promise.allSettled([
          window.electronAPI.routine801GetUpdates(targetUrl),
          window.electronAPI.routine801GetInstallations(targetUrl)
        ]);

        let hasSuccess = false;
        if (updatesData.status === 'fulfilled') {
          setUpdatesCatalog(updatesData.value);
          hasSuccess = true;
        } else {
          console.warn('[Rotina 801] Falha ao obter atualizações:', updatesData.reason);
        }

        if (installsData.status === 'fulfilled') {
          setInstallsCatalog(installsData.value);
          hasSuccess = true;
        } else {
          console.warn('[Rotina 801] Falha ao obter instalações:', installsData.reason);
        }

        if (!hasSuccess) {
          const detail =
            (installsData.status === 'rejected' && (installsData.reason?.message || String(installsData.reason))) ||
            (updatesData.status === 'rejected' && (updatesData.reason?.message || String(updatesData.reason))) ||
            'Não foi possível estabelecer conexão.';

          setErrorBanner(
            `Falha na comunicação com a Rotina 801 em ${targetUrl}: ${detail}. Verifique se o Karaf/WTA está em execução e se a porta está acessível.`
          );
          setConnectionHealth({ ok: false, message: detail });
        } else {
          setConnectionHealth({ ok: true, message: 'Conectado e respondendo' });
        }
      }
    } catch (err: any) {
      setErrorBanner(`Erro ao carregar catálogo: ${err?.message || err}`);
      setConnectionHealth({ ok: false, message: 'Erro de conexão' });
    } finally {
      setIsLoading(false);
    }
  };

  // Testa conexão com o servidor
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionHealth(null);
    try {
      if (window.electronAPI?.routine801CheckServer) {
        const res = await window.electronAPI.routine801CheckServer(serverUrlInput);
        setConnectionHealth({ ok: res.ok, message: res.message });
      }
    } catch (err: any) {
      setConnectionHealth({ ok: false, message: err?.message || 'Falha no teste de conexão.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Salva URL da Rotina 801
  const handleSaveServerUrl = async () => {
    try {
      if (window.electronAPI?.saveSettings && window.electronAPI?.getSettings) {
        const current = await window.electronAPI.getSettings();
        await window.electronAPI.saveSettings({ ...current, routine801Url: serverUrlInput.trim() });
      }
      setIsConfigOpen(false);
      fetchCatalogs(serverUrlInput.trim());
    } catch (err: any) {
      setErrorBanner(`Falha ao salvar URL: ${err?.message || err}`);
    }
  };

  // Copia texto com feedback visual
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Lista atual conforme aba ativa
  const currentCatalog = activeTab === 'updates' ? updatesCatalog : installsCatalog;
  const currentList = currentCatalog.funcionalidades;

  // Famílias ou linhas de versão detectadas dinamicamente no catálogo atual (ex: ['1.39', '1.38', '0.39'])
  const versionFamilies = useMemo(() => {
    return extractVersionFamilies(currentList);
  }, [currentList]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    return filterRoutine801Features(currentList, searchQuery, typeFilter, statusFilter, versionFilter);
  }, [currentList, searchQuery, typeFilter, statusFilter, versionFilter]);

  // Controles de seleção em lote
  const handleToggleSelectAll = () => {
    if (Object.keys(selectedFeatures).length === filteredList.length) {
      setSelectedFeatures({});
    } else {
      const next: Record<string, Routine801Feature> = {};
      for (const item of filteredList) {
        next[`${item.nome}@${item.versao}`] = item;
      }
      setSelectedFeatures(next);
    }
  };

  const handleToggleSelectItem = (item: Routine801Feature, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const key = `${item.nome}@${item.versao}`;
    setSelectedFeatures((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = item;
      }
      return next;
    });
  };

  const handleInspectFeature = (item: Routine801Feature) => {
    setInspectedFeature(item);
    setInspectedCustomVersion(item.versao || '');
  };

  // Executa instalação ou registro de repositórios (individual ou em lote)
  const handleExecute = async (
    featuresToInstall: Routine801Feature[],
    action: 'install' | 'repo_add_only' = 'install',
    versionOverride?: string
  ) => {
    if (!featuresToInstall || featuresToInstall.length === 0) return;

    setIsExecuting(true);
    setIsConsoleExpanded(true);
    setLastResult(null);
    setExecutingTargetName(
      featuresToInstall.length === 1 ? featuresToInstall[0].nome : `${featuresToInstall.length} artefato(s)`
    );

    try {
      if (window.electronAPI?.routine801InstallFeatures) {
        const res = await window.electronAPI.routine801InstallFeatures({
          funcionalidades: featuresToInstall,
          repositorios: currentCatalog.repositorios,
          action,
          targetVersionOverride: versionOverride,
          executeVia,
          serverUrl: serverUrlInput
        });
        setLastResult(res);

        if (res.success) {
          setSelectedFeatures({});
        }

        await fetchCatalogs();
      }
    } catch (err: any) {
      setErrorBanner(`Erro na execução: ${err?.message || err}`);
    } finally {
      setIsExecuting(false);
      setExecutingTargetName(null);
    }
  };

  // Executa instalação direta a partir do modal/painel de versão personalizada
  const handleDirectInstallExecute = async () => {
    if (!directInstallNome.trim()) {
      setErrorBanner('Informe o nome da feature para instalação.');
      return;
    }
    const customFeature: Routine801Feature = {
      nome: directInstallNome.trim(),
      versao: directInstallVersao.trim(),
      codigoRotina: 0,
      codigoModulo: 0,
      tipoProjeto: directInstallTipo,
      descricao: `${directInstallNome.trim()} (Instalação Direta)`,
      status: 'LIBERADO'
    };
    setIsDirectInstallOpen(false);
    await handleExecute([customFeature], directInstallAction);
  };

  // Feature sob inspeção com versão customizada pelo usuário se editada
  const inspectedEffectiveFeature = useMemo(() => {
    if (!inspectedFeature) return null;
    return {
      ...inspectedFeature,
      versao: (inspectedCustomVersion && inspectedCustomVersion.trim()) || inspectedFeature.versao
    };
  }, [inspectedFeature, inspectedCustomVersion]);

  // Informações técnicas do artefato selecionado no Inspector Drawer
  const inspectedRepo = useMemo(() => {
    if (!inspectedEffectiveFeature) return null;
    return findRepositoryForFeatureUi(inspectedEffectiveFeature, currentCatalog.repositorios);
  }, [inspectedEffectiveFeature, currentCatalog.repositorios]);

  const inspectedCommands = useMemo(() => {
    if (!inspectedEffectiveFeature) return null;
    return buildKarafInstallCommandsUi(inspectedEffectiveFeature, inspectedRepo, true);
  }, [inspectedEffectiveFeature, inspectedRepo]);

  // Logs filtrados
  const displayedLogs = useMemo(() => {
    if (logFilter === 'ERRORS') {
      return consoleLogs.filter(
        (l) => l.includes('[ERRO]') || l.includes('✖') || l.includes('Error') || l.includes('Exception')
      );
    }
    return consoleLogs;
  }, [consoleLogs, logFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-7xl h-[92vh] bg-card text-card-foreground border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* ========================================================================= */}
        {/* CABEÇALHO SUPERIOR (CONTROL PLANE OPERACIONAL) */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 border border-primary/25 text-primary">
              <Layers2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  Catálogo Oficial WinThor — Rotina 801
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded">
                  WTA Serviços
                </span>
                {connectionHealth && (
                  <button
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded border transition-colors hover:border-border"
                    title="Clique para gerenciar a URL de conexão"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionHealth.ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-muted-foreground text-[10px]">{serverUrlInput}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Instale e atualize pacotes OSGi oficiais com telemetria direta no Apache Karaf local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Modo de Instalação */}
            <div className="flex items-center bg-muted/70 p-0.5 rounded-md border border-border text-xs" title="Escolha o mecanismo de execução da instalação">
              <button
                type="button"
                onClick={() => setExecuteVia('karaf_cli')}
                className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  executeVia === 'karaf_cli'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Executa via Apache Karaf CLI (client.bat) com comandos OSGi em tempo real"
              >
                Console Karaf
              </button>
              <button
                type="button"
                onClick={() => setExecuteVia('api')}
                className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  executeVia === 'api'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Executa via API REST do WTA (/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias)"
              >
                API WTA
              </button>
            </div>

            <button
              onClick={() => setIsDirectInstallOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              title="Instalar ou registrar versão específica diretamente no Karaf"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Instalação Direta</span>
            </button>

            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                isConfigOpen
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-card border-border hover:bg-muted text-foreground'
              }`}
              title="Configurar URL do servidor WTA"
            >
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Conexão</span>
            </button>

            <button
              onClick={() => fetchCatalogs()}
              disabled={isLoading || isExecuting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 transition-colors"
              title="Sincronizar dados do servidor WTA"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin text-primary' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAINEL DE CONFIGURAÇÃO DE CONEXÃO (COLAPSÁVEL) */}
        {/* ========================================================================= */}
        {isConfigOpen && (
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="routine801-url-input" className="text-muted-foreground font-medium whitespace-nowrap">
                URL da Ferramenta Servidor (WTA):
              </label>
              <div className="flex flex-1 items-center gap-1.5 max-w-lg">
                <input
                  id="routine801-url-input"
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="http://localhost:8889"
                  className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setServerUrlInput('http://localhost:8889')}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Usar localhost:8889"
                >
                  localhost
                </button>
                <button
                  type="button"
                  onClick={() => setServerUrlInput('http://127.0.0.1:8889')}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Usar 127.0.0.1:8889 (IPv4 direto)"
                >
                  127.0.0.1
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
              </button>
              <button
                onClick={handleSaveServerUrl}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:opacity-90"
              >
                Salvar e Sincronizar
              </button>
            </div>
            {connectionHealth && (
              <div
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${
                  connectionHealth.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {connectionHealth.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{connectionHealth.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Banner de Erro Global */}
        {errorBanner && (
          <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/25 flex items-center justify-between text-xs text-rose-400 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-rose-400 hover:text-rose-300 underline text-xs ml-4"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BARRA DE FERRAMENTAS: ABAS + FILTROS TÉCNICOS */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-muted/10 shrink-0">
          {/* Segmented Controls para Abas */}
          <div className="inline-flex p-0.5 rounded-md bg-muted/50 border border-border">
            <button
              onClick={() => {
                setActiveTab('updates');
                setSelectedFeatures({});
              }}
              className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
                activeTab === 'updates'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 text-primary" />
              <span>Atualizações</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] tabular-nums bg-muted text-muted-foreground">
                {updatesCatalog.funcionalidades.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('installs');
                setSelectedFeatures({});
              }}
              className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
                activeTab === 'installs'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Instalações</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] tabular-nums bg-muted text-muted-foreground">
                {installsCatalog.funcionalidades.length}
              </span>
            </button>
          </div>

          {/* Filtros de Busca, Tipo e Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Input de Busca */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por rotina, nome ou módulo..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.2 text-[9px] font-mono text-muted-foreground bg-muted/60 border border-border rounded pointer-events-none">
                  /
                </kbd>
              )}
            </div>

            {/* Dropdown de Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="ROTINA">Apenas Rotinas</option>
              <option value="SERVICO">Apenas Serviços</option>
            </select>

            {/* Dropdown de Versão / Linha de Release */}
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              title="Filtrar por linha ou família de versão (ex: 1.39, 1.38, 0.39)"
            >
              <option value="ALL">Todas as Versões</option>
              {versionFamilies.map((fam) => (
                <option key={fam} value={fam}>
                  Versão {fam}.x
                </option>
              ))}
            </select>

            {/* Ação rápida para selecionar todos da versão filtrada */}
            {versionFilter !== 'ALL' && filteredList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const next: Record<string, Routine801Feature> = { ...selectedFeatures };
                  for (const item of filteredList) {
                    next[`${item.nome}@${item.versao}`] = item;
                  }
                  setSelectedFeatures(next);
                }}
                className="px-2 py-0.5 text-[11px] font-mono rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title={`Selecionar todos os ${filteredList.length} artefato(s) da versão ${versionFilter}.x`}
              >
                + Selecionar {filteredList.length} da v{versionFilter}.x
              </button>
            )}

            {/* Segmented Controls de Canal (P / H) */}
            <div className="inline-flex p-0.5 rounded-md bg-muted/50 border border-border text-[11px] font-mono">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-0.5 rounded transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-card text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('P')}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                  statusFilter === 'P'
                    ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-emerald-400'
                }`}
                title="Filtrar por Produção [P]"
              >
                <span className="font-bold">P</span> Produção
              </button>
              <button
                onClick={() => setStatusFilter('H')}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                  statusFilter === 'H'
                    ? 'bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30'
                    : 'text-muted-foreground hover:text-amber-400'
                }`}
                title="Filtrar por Homologação [H]"
              >
                <span className="font-bold">H</span> Homolog.
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ÁREA CENTRAL: TABELA TÉCNICA DE ALTA DENSIDADE + INSPECTOR DRAWER LATERAL */}
        {/* ========================================================================= */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Tabela Principal */}
          <div className="flex-1 overflow-y-auto">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 text-center">
                <Package className="w-10 h-10 text-muted-foreground/60 mb-2 stroke-1" />
                <p className="text-sm font-medium">Nenhum artefato encontrado</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {isLoading
                    ? 'Sincronizando dados com o servidor da Rotina 801...'
                    : searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || versionFilter !== 'ALL'
                      ? 'Nenhum artefato corresponde aos filtros atuais. Tente limpar os filtros de busca ou versão.'
                      : 'Nenhum pacote pendente para este catálogo no servidor Karaf.'}
                </p>
                {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || versionFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('ALL');
                      setStatusFilter('ALL');
                      setVersionFilter('ALL');
                    }}
                    className="mt-3 px-3 py-1 text-xs rounded border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-card border-b border-border text-muted-foreground uppercase tracking-wider text-[10px] font-mono select-none z-10">
                  <tr>
                    <th className="py-2 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={filteredList.length > 0 && Object.keys(selectedFeatures).length === filteredList.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                        title="Selecionar todos os filtrados"
                      />
                    </th>
                    <th className="py-2 px-2 w-16 text-center">Canal</th>
                    <th className="py-2 px-3 w-20">Tipo</th>
                    <th className="py-2 px-3">Rotina & Descrição</th>
                    <th className="py-2 px-3">Feature OSGi</th>
                    <th className="py-2 px-3 w-40">Versão</th>
                    <th className="py-2 pr-4 pl-3 w-40 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-foreground">
                  {filteredList.map((item) => {
                    const key = `${item.nome}@${item.versao}`;
                    const isSelected = !!selectedFeatures[key];
                    const isInspected = inspectedFeature?.nome === item.nome && inspectedFeature?.versao === item.versao;
                    const isLiberado = item.status === 'LIBERADO';

                    return (
                      <tr
                        key={key}
                        onClick={() => setInspectedFeature(item)}
                        className={`cursor-pointer transition-colors ${
                          isInspected
                            ? 'bg-primary/10 border-l-2 border-primary'
                            : isSelected
                              ? 'bg-muted/40'
                              : 'hover:bg-muted/30'
                        }`}
                      >
                        {/* Checkbox de Seleção */}
                        <td className="py-2 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectItem(item, e)}
                            className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Canal [P] Produção / [H] Homologação */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-5 text-[11px] font-mono font-bold rounded border ${
                              isLiberado
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                            }`}
                            title={isLiberado ? 'Canal Produção (Liberado oficial)' : 'Canal Homologação (Em validação)'}
                          >
                            {isLiberado ? 'P' : 'H'}
                          </span>
                        </td>

                        {/* Tipo de Projeto */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-medium rounded border ${
                              item.tipoProjeto === 'ROTINA'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {item.tipoProjeto || 'SERVIÇO'}
                          </span>
                        </td>

                        {/* Rotina e Descrição */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5 font-medium">
                            {item.codigoRotina > 0 && (
                              <span className="font-mono text-[11px] font-bold text-primary shrink-0">
                                {item.codigoRotina}
                              </span>
                            )}
                            <span className="truncate max-w-md">{item.descricao}</span>
                          </div>
                          {item.codigoModulo > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Módulo {item.codigoModulo}
                            </span>
                          )}
                        </td>

                        {/* Nome da Feature OSGi */}
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground select-all">
                          <span className="truncate max-w-[260px] inline-block">{item.nome}</span>
                        </td>

                        {/* Versão */}
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap tabular-nums">
                          {item.versaoAnterior ? (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground/70 line-through">{item.versaoAnterior}</span>
                              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                              <span className="text-emerald-400 font-medium">{item.versao}</span>
                            </div>
                          ) : (
                            <span className="text-foreground">{item.versao}</span>
                          )}
                        </td>

                        {/* Ações por linha */}
                        <td className="py-2 pr-4 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectedFeature(item)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Inspecionar metadados Maven e dependências"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleExecute([item])}
                              disabled={isExecuting}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                                activeTab === 'updates'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40'
                                  : 'bg-primary hover:opacity-90 text-primary-foreground border-primary/40'
                              } disabled:opacity-50`}
                            >
                              {activeTab === 'updates' ? 'Atualizar' : 'Instalar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ========================================================================= */}
          {/* INSPECTOR DRAWER LATERAL (SOB DEMANDA) */}
          {/* ========================================================================= */}
          {inspectedFeature && (
            <div className="w-[380px] lg:w-[420px] bg-card border-l border-border flex flex-col z-20 shadow-2xl animate-in slide-in-from-right-4 duration-150 overflow-hidden shrink-0">
              {/* Top bar do Drawer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                    Feature Inspector HUD
                  </span>
                </div>
                <button
                  onClick={() => setInspectedFeature(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                  title="Fechar painel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo Técnico */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Cabeçalho da Feature */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                        inspectedFeature.status === 'LIBERADO'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                      }`}
                    >
                      Canal: {inspectedFeature.status === 'LIBERADO' ? 'Produção [P]' : 'Homologação [H]'}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted text-muted-foreground border border-border">
                      {inspectedFeature.tipoProjeto || 'SERVIÇO'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground">
                    {inspectedFeature.codigoRotina > 0 && (
                      <span className="text-primary mr-1.5 font-mono">{inspectedFeature.codigoRotina} —</span>
                    )}
                    {inspectedFeature.descricao}
                  </h3>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5 select-all">
                    {inspectedFeature.nome}
                  </div>
                </div>

                {/* Bloco de Versão */}
                <div className="p-2.5 rounded-md border border-border bg-muted/30 font-mono text-[11px] space-y-2">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Versão do Artefato
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Catálogo WTA:</span>
                    <strong className="text-emerald-400">{inspectedFeature.versao}</strong>
                  </div>
                  {inspectedFeature.versaoAnterior && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Versão Instalada:</span>
                      <span className="line-through">{inspectedFeature.versaoAnterior}</span>
                    </div>
                  )}

                  {/* Input de Customização de Versão Alvo */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="inspected-version-input" className="text-[10px] text-muted-foreground">
                        Versão Alvo para Instalação / Registro:
                      </label>
                      {inspectedCustomVersion !== inspectedFeature.versao && (
                        <button
                          type="button"
                          onClick={() => setInspectedCustomVersion(inspectedFeature.versao)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Restaurar ({inspectedFeature.versao})
                        </button>
                      )}
                    </div>
                    <input
                      id="inspected-version-input"
                      type="text"
                      value={inspectedCustomVersion}
                      onChange={(e) => setInspectedCustomVersion(e.target.value)}
                      placeholder={inspectedFeature.versao}
                      className="w-full px-2 py-1 bg-background border border-input rounded text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      title="Edite para forçar qualquer versão desejada (ex: 1.38.0.2)"
                    />
                  </div>
                </div>

                {/* Coordenadas Maven (GAV) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Coordenadas Maven</span>
                    {inspectedRepo && (
                      <button
                        onClick={() =>
                          handleCopyText(
                            `${inspectedRepo.groupId}:${inspectedRepo.artifactId}:${inspectedRepo.version}`,
                            'gav'
                          )
                        }
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === 'gav' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'gav' ? 'Copiado!' : 'Copiar GAV'}</span>
                      </button>
                    )}
                  </div>

                  <div className="p-2 rounded border border-border bg-background font-mono text-[10px] text-foreground leading-relaxed select-all">
                    {inspectedRepo ? (
                      <>
                        <div><span className="text-muted-foreground">groupId:</span> {inspectedRepo.groupId}</div>
                        <div><span className="text-muted-foreground">artifactId:</span> {inspectedRepo.artifactId}</div>
                        <div><span className="text-muted-foreground">version:</span> {inspectedRepo.version}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">Repositório Maven resolvido dinamicamente pelo Karaf</span>
                    )}
                  </div>
                </div>

                {/* URL Canônica Maven */}
                {inspectedRepo?.featureMavenUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Repositório de Features</span>
                      <button
                        onClick={() => handleCopyText(inspectedRepo.featureMavenUrl!, 'mvnUrl')}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === 'mvnUrl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'mvnUrl' ? 'Copiado!' : 'Copiar URL'}</span>
                      </button>
                    </div>

                    <div className="p-2 rounded border border-border bg-background font-mono text-[10px] text-foreground break-all select-all">
                      {inspectedRepo.featureMavenUrl}
                    </div>
                  </div>
                )}

                {/* Comandos Karaf CLI */}
                {inspectedCommands && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Comandos Karaf CLI</span>
                      <button
                        onClick={() => handleCopyText(inspectedCommands.fullSnippet, 'cli')}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === 'cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'cli' ? 'Copiado!' : 'Copiar Comandos'}</span>
                      </button>
                    </div>

                    <div className="p-2 rounded border border-border bg-background font-mono text-[10px] text-primary break-all select-all space-y-1">
                      {inspectedCommands.repoCommand && (
                        <div>$ {inspectedCommands.repoCommand}</div>
                      )}
                      <div>$ {inspectedCommands.installCommand}</div>
                    </div>
                  </div>
                )}

                {/* Dependências Requeridas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Dependências Declaradas ({inspectedFeature.dependencias?.length || 0})
                    </span>
                  </div>

                  {!inspectedFeature.dependencias || inspectedFeature.dependencias.length === 0 ? (
                    <div className="p-2.5 rounded border border-border bg-muted/20 text-muted-foreground text-[11px] italic">
                      Nenhuma dependência externa explícita informada pela API da 801. O Karaf resolverá dependências OSGi em cascata.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {inspectedFeature.dependencias.map((dep, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded border border-border/80 bg-background font-mono text-[10px]"
                        >
                          <span className="truncate mr-2 text-foreground">{dep.featureName}</span>
                          <span className="text-muted-foreground shrink-0">{dep.version || '*'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ação no Rodapé do Drawer */}
              <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={() => setInspectedFeature(null)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Fechar
                </button>

                <button
                  onClick={() => inspectedEffectiveFeature && handleExecute([inspectedEffectiveFeature], 'repo_add_only')}
                  disabled={isExecuting}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                  title="Apenas adiciona o repositório Maven no Karaf (feature:repo-add) sem instalar"
                >
                  <Server className="w-3.5 h-3.5 text-primary" />
                  <span>Apenas Repositório</span>
                </button>

                <button
                  onClick={() => inspectedEffectiveFeature && handleExecute([inspectedEffectiveFeature], 'install')}
                  disabled={isExecuting}
                  className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
                    activeTab === 'updates'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-primary hover:opacity-90 text-primary-foreground'
                  } disabled:opacity-50`}
                >
                  {activeTab === 'updates' ? <RotateCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{activeTab === 'updates' ? 'Atualizar no Karaf' : 'Instalar no Karaf'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE AÇÕES EM LOTE FLUTUANTE (QUANDO HÁ ITENS SELECIONADOS) */}
        {/* ========================================================================= */}
        {Object.keys(selectedFeatures).length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-2.5 bg-primary/10 border-t border-primary/30 text-xs shrink-0 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-foreground">
                {Object.keys(selectedFeatures).length} artefato(s) selecionado(s)
              </span>
              <button
                onClick={() => setSelectedFeatures({})}
                className="text-muted-foreground hover:text-foreground underline text-xs"
              >
                Limpar seleção
              </button>

              {/* Opção para forçar versão específica na seleção em lote */}
              <div className="flex items-center gap-1.5 border-l border-border/80 pl-3">
                <span className="text-muted-foreground text-[11px] whitespace-nowrap">Versão Alvo:</span>
                <input
                  type="text"
                  value={batchVersionOverride}
                  onChange={(e) => setBatchVersionOverride(e.target.value)}
                  placeholder="Original ou ex: 1.38.0.0"
                  className="px-2 py-0.5 text-xs bg-background border border-input rounded text-foreground font-mono placeholder:text-muted-foreground/60 w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Se informado, sobrescreve a versão de todos os itens selecionados ao executar"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() =>
                  handleExecute(
                    Object.values(selectedFeatures),
                    'repo_add_only',
                    batchVersionOverride.trim() || undefined
                  )
                }
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                title="Apenas adiciona os repositórios Maven no Karaf (feature:repo-add) sem instalar"
              >
                <Server className="w-3.5 h-3.5 text-primary" />
                <span>Registrar Repositórios ({Object.keys(selectedFeatures).length})</span>
              </button>

              <button
                onClick={() =>
                  handleExecute(
                    Object.values(selectedFeatures),
                    'install',
                    batchVersionOverride.trim() || undefined
                  )
                }
                disabled={isExecuting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors ${
                  activeTab === 'updates'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-primary hover:opacity-90 text-primary-foreground'
                } disabled:opacity-50`}
              >
                {activeTab === 'updates' ? <RotateCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>
                  {activeTab === 'updates'
                    ? `Atualizar ${Object.keys(selectedFeatures).length} no Karaf`
                    : `Instalar ${Object.keys(selectedFeatures).length} no Karaf`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONSOLE / DECK DE TELEMETRIA REATIVO (EXPANSÍVEL) */}
        {/* ========================================================================= */}
        {isConsoleExpanded && (
          <div className="border-t border-border bg-background flex flex-col max-h-52 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
            {/* Header do Terminal */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted/30 text-xs">
              <div className="flex items-center gap-2 text-foreground font-mono">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-[11px]">Console Karaf — Execução da Rotina 801</span>
                {isExecuting && (
                  <span className="flex items-center gap-1.5 text-primary font-mono text-[10px] ml-2">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Processando {executingTargetName}...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded border border-border p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => setLogFilter('ALL')}
                    className={`px-1.5 py-0.2 rounded ${logFilter === 'ALL' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}
                  >
                    Todos ({consoleLogs.length})
                  </button>
                  <button
                    onClick={() => setLogFilter('ERRORS')}
                    className={`px-1.5 py-0.2 rounded ${logFilter === 'ERRORS' ? 'bg-rose-500/20 text-rose-400 font-medium' : 'text-muted-foreground'}`}
                  >
                    Erros
                  </button>
                </div>

                {consoleLogs.length > 0 && (
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="text-muted-foreground hover:text-foreground text-[10px]"
                  >
                    Limpar
                  </button>
                )}

                <button
                  onClick={() => setIsConsoleExpanded(false)}
                  className="text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-0.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Recolher</span>
                </button>
              </div>
            </div>

            {/* Linhas de Log */}
            <div className="p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-foreground/90 bg-background select-text flex-1">
              {displayedLogs.length === 0 ? (
                <div className="text-muted-foreground italic text-center py-4">
                  Nenhum log registrado para este filtro. Dispare uma instalação para acompanhar a telemetria do Karaf em tempo real.
                </div>
              ) : (
                displayedLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap ${
                      log.includes('[ERRO]') || log.includes('✖') || log.includes('Error')
                        ? 'text-rose-400 font-semibold'
                        : log.includes('✔') || log.includes('Sucesso') || log.includes('success')
                          ? 'text-emerald-400 font-medium'
                          : log.includes('[AVISO]') || log.includes('Warn')
                            ? 'text-amber-400'
                            : log.startsWith('$')
                              ? 'text-primary font-semibold'
                              : 'text-foreground/80'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RODAPÉ: TELEMETRIA OPERACIONAL & BOTÃO DE EXPANSÃO DO TERMINAL */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono">
              Total no catálogo: <strong className="text-foreground tabular-nums">{filteredList.length}</strong>
            </span>

            {lastResult && (
              <span
                className={`flex items-center gap-1 font-medium font-mono ${
                  lastResult.success ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {lastResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>
                  {lastResult.installedCount} instalado(s), {lastResult.failedCount} com falha
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border hover:bg-muted text-foreground transition-colors font-mono text-[11px]"
            >
              <Terminal className="w-3 h-3 text-primary" />
              <span>Terminal Karaf</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-muted text-muted-foreground">
                {consoleLogs.length}
              </span>
              {isConsoleExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL / PAINEL DE INSTALAÇÃO DIRETA DE VERSÃO ESPECÍFICA */}
        {/* ========================================================================= */}
        {isDirectInstallOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
            <div className="bg-card text-card-foreground border border-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 border border-primary/20 text-primary">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold">Instalação Direta de Pacote (Versão Específica)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDirectInstallOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Adicione e instale qualquer pacote ou versão específica no Apache Karaf local (ex: serviços da release <code className="text-primary font-mono font-bold">1.38.*</code>, <code className="text-primary font-mono font-bold">1.39.*</code> ou <code className="text-primary font-mono font-bold">0.39.*</code>), com resolução automática de repositório Maven.
                </p>

                {/* Nome da Feature */}
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground block">
                    Nome da Feature OSGi:
                  </label>
                  <input
                    type="text"
                    value={directInstallNome}
                    onChange={(e) => setDirectInstallNome(e.target.value)}
                    placeholder="ex: winthor-atualizacao-dados"
                    className="w-full px-3 py-1.5 bg-background border border-input rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    list="common-winthor-features"
                  />
                  <datalist id="common-winthor-features">
                    <option value="winthor-atualizacao-dados" />
                    <option value="winthor-ferramenta-servidor" />
                    <option value="winthor-autocadastro-cliente-fidelidade" />
                    <option value="winthor-central-notificacao" />
                    <option value="winthor-expedicao-painel-operacao" />
                    <option value="winthor-fin-1531" />
                    <option value="winthor-fin-805" />
                  </datalist>
                </div>

                {/* Versão e Tipo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground block">
                      Versão Específica:
                    </label>
                    <input
                      type="text"
                      value={directInstallVersao}
                      onChange={(e) => setDirectInstallVersao(e.target.value)}
                      placeholder="ex: 1.38.0.2 ou 1.39.1.6"
                      className="w-full px-3 py-1.5 bg-background border border-input rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground block">
                      Tipo de Projeto:
                    </label>
                    <select
                      value={directInstallTipo}
                      onChange={(e) => setDirectInstallTipo(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="SERVICO">SERVIÇO (br.com.pcsist.winthor.servico)</option>
                      <option value="ROTINA">ROTINA (br.com.pcsist.winthor.rotina)</option>
                    </select>
                  </div>
                </div>

                {/* Ação */}
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground block">
                    Ação a Executar:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectInstallAction('install')}
                      className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                        directInstallAction === 'install'
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold text-foreground">Registrar e Instalar</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Executa repo-add e feature:install -r -u
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirectInstallAction('repo_add_only')}
                      className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                        directInstallAction === 'repo_add_only'
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold text-foreground">Apenas Registrar Repo</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Executa apenas feature:repo-add
                      </div>
                    </button>
                  </div>
                </div>

                {/* Preview dos comandos gerados */}
                <div className="p-2.5 rounded border border-border bg-muted/30 font-mono text-[10px] space-y-1">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Preview dos Comandos Karaf:</div>
                  <div className="text-primary truncate">
                    $ feature:repo-add mvn:br.com.pcsist.winthor.{directInstallTipo === 'ROTINA' ? 'rotina' : 'servico'}/{directInstallNome.trim()}-features/{directInstallVersao.trim()}/xml/features
                  </div>
                  {directInstallAction === 'install' && (
                    <div className="text-primary truncate">
                      $ feature:install -r -u {directInstallNome.trim()}/{directInstallVersao.trim()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setIsDirectInstallOpen(false)}
                  className="px-3 py-1.5 rounded border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDirectInstallExecute}
                  disabled={!directInstallNome.trim() || !directInstallVersao.trim()}
                  className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  Executar no Karaf
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
