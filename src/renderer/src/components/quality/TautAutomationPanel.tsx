import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderOpen,
  Terminal,
  Database,
  ExternalLink,
  Layers,
  Sparkles,
  FileCode2,
  Search,
  Check,
  Copy,
  Sliders,
  Send,
  Zap,
  ShieldCheck,
  Tag,
  Settings
} from 'lucide-react';
import {
  AppSettings,
  TautProjectStatus,
  TautCoverageReport,
  TautSpecSummary,
  TautCsvIntakeResult,
  TestExecutionResult
} from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface TautAutomationPanelProps {
  settings: AppSettings | null;
  onNavigateToSettings?: () => void;
}

const MODULE_TAGS = [
  { id: 'winthor-pedido-venda', label: 'Pedido de Venda', group: 'Comercial' },
  { id: 'winthor-venda', label: 'Venda / PDV', group: 'Comercial' },
  { id: 'winthor-tributacao', label: 'Tributação / Fiscal', group: 'Fiscal' },
  { id: 'winthor-integracao-matcon', label: 'MatCon (Materiais)', group: 'Integrações' },
  { id: 'winthor-estoque-vtex', label: 'Estoque VTEX', group: 'Estoque' },
  { id: 'winthor-filial', label: 'Filiais', group: 'Cadastros' },
  { id: 'winthor-integracao-cliente', label: 'Clientes', group: 'Cadastros' },
  { id: 'winthor-integracao-precos', label: 'Preços', group: 'Comercial' },
  { id: 'winthor-integracao-cadastros', label: 'Cadastros Gerais', group: 'Cadastros' },
  { id: 'winthor-ferramenta-usuario', label: 'Usuário & Permissões', group: 'Admin' },
  { id: 'winthor-compras-produto', label: 'Compras & Produto', group: 'Suprimentos' },
  { id: 'winthor-faturamento', label: 'Faturamento', group: 'Fiscal' },
  { id: 'layout', label: 'Layouts WSH / Contrato', group: 'WSH' }
];

const META_TAGS = [
  { id: 'esteira', label: 'Esteira CI', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'critico', label: 'Crítico', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { id: 'regressao', label: 'Regressão', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'contrato', label: 'Contrato (Schema)', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: '-develop', label: 'Excluir Develop (-develop)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
];

export const TautAutomationPanel: React.FC<TautAutomationPanelProps> = ({
  settings,
  onNavigateToSettings
}) => {
  const [projectStatus, setProjectStatus] = useState<TautProjectStatus | null>(null);
  const [coverageReport, setCoverageReport] = useState<TautCoverageReport | null>(null);
  const [specs, setSpecs] = useState<TautSpecSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCoverage, setLoadingCoverage] = useState<boolean>(false);
  const [syncingEnv, setSyncingEnv] = useState<boolean>(false);

  // Execução de Testes
  const [selectedTags, setSelectedTags] = useState<string[]>(['esteira', '-develop']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [customSpecInput, setCustomSpecInput] = useState<string>('');
  const [apiUrlMode, setApiUrlMode] = useState<'v39' | 'legacy'>('v39');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeOutput, setActiveOutput] = useState<string>('');
  const [lastExecutionResult, setLastExecutionResult] = useState<TestExecutionResult | null>(null);

  // Intake CSV
  const [csvFileName, setCsvFileName] = useState<string>('Insumo/pedido.csv');
  const [processingIntake, setProcessingIntake] = useState<boolean>(false);
  const [intakeResult, setIntakeResult] = useState<TautCsvIntakeResult | null>(null);

  // Filtro de Cobertura
  const [coverageSearch, setCoverageSearch] = useState<string>('');
  const [coverageStatusFilter, setCoverageStatusFilter] = useState<'all' | 'automated' | 'pending'>('all');

  // Sub-abas do painel
  const [activeSubTab, setActiveSubTab] = useState<'runner' | 'coverage' | 'specs' | 'intake'>('runner');

  const { copy: copyToClipboard, copiedKey } = useCopyToClipboard(2000);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Carrega status inicial
  const loadProjectData = async () => {
    setLoading(true);
    try {
      if (api.tautGetStatus) {
        const st = await api.tautGetStatus();
        setProjectStatus(st);
      }
      if (api.tautListSpecs) {
        const list = await api.tautListSpecs();
        setSpecs(list || []);
      }
    } catch (err: any) {
      console.warn('[TautAutomationPanel] Erro ao carregar projeto:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoverage = async () => {
    setLoadingCoverage(true);
    try {
      if (api.tautGetCoverage) {
        const cov = await api.tautGetCoverage();
        setCoverageReport(cov);
      }
    } catch (err: any) {
      showToast(`Erro ao analisar cobertura: ${err.message}`, 'error');
    } finally {
      setLoadingCoverage(false);
    }
  };

  useEffect(() => {
    loadProjectData();
    loadCoverage();
  }, [settings?.tautProjectPath]);

  // Listener para chunks de console em tempo real
  useEffect(() => {
    if (api.onTautChunk) {
      const unsub = api.onTautChunk((data) => {
        setActiveOutput((prev) => prev + data.chunk);
        if (terminalBottomRef.current) {
          terminalBottomRef.current.scrollTop = terminalBottomRef.current.scrollHeight;
        }
      });
      return () => {
        unsub?.();
      };
    }
  }, []);

  // Sincronizar .env com a conexão Oracle ativa
  const handleSyncEnv = async () => {
    setSyncingEnv(true);
    try {
      if (api.tautSyncEnv) {
        const res = await api.tautSyncEnv();
        showToast(res.message, 'success');
        loadProjectData();
      }
    } catch (err: any) {
      showToast(`Falha ao sincronizar .env: ${err.message}`, 'error');
    } finally {
      setSyncingEnv(false);
    }
  };

  // Toggle de tags
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Monta a string final de tags para o Cypress
  const effectiveTagsString = useMemo(() => {
    const list = [...selectedTags];
    if (customTagInput.trim()) {
      customTagInput.split(',').forEach((t) => {
        const clean = t.trim();
        if (clean && !list.includes(clean)) list.push(clean);
      });
    }
    return list.join(',');
  }, [selectedTags, customTagInput]);

  // Disparo de Testes Headless
  const handleRunTests = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveOutput('');
    setLastExecutionResult(null);

    try {
      if (api.tautRunTests) {
        const res = await api.tautRunTests({
          tags: effectiveTagsString || undefined,
          spec: customSpecInput.trim() || undefined,
          apiUrlMode,
          openInteractive: false
        });
        setLastExecutionResult(res);
        if (res.status === 'passed') {
          showToast(`Suíte TAUT concluída com sucesso! (${res.passedCount} testes aprovados)`, 'success');
        } else if (res.status === 'aborted') {
          showToast('Execução do Cypress cancelada.', 'info');
        } else {
          showToast(`Suíte finalizada com falhas (${res.failedCount} falhas de ${res.totalTests}).`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Erro ao disparar Cypress: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Abrir Cypress com interface gráfica (cy:open)
  const handleOpenInteractive = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveOutput('');
    try {
      if (api.tautRunTests) {
        showToast('Iniciando Cypress em modo interativo...', 'info');
        await api.tautRunTests({
          apiUrlMode,
          openInteractive: true
        });
      }
    } catch (err: any) {
      showToast(`Falha ao abrir Cypress: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Abortar execução
  const handleAbort = async () => {
    try {
      if (api.tautAbortTests) {
        await api.tautAbortTests();
        showToast('Solicitação de cancelamento enviada.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao abortar', 'error');
    }
  };

  // Processar Intake CSV
  const handleProcessIntake = async () => {
    if (!csvFileName.trim()) return;
    setProcessingIntake(true);
    try {
      if (api.tautProcessIntake) {
        const res = await api.tautProcessIntake(csvFileName.trim());
        setIntakeResult(res);
        showToast(`Intake gerado para ${res.module} (${res.scenariosCount} cenários)!`, 'success');
      }
    } catch (err: any) {
      showToast(`Erro ao processar CSV: ${err.message}`, 'error');
    } finally {
      setProcessingIntake(false);
    }
  };

  // Filtragem dos itens de cobertura
  const filteredCoverageItems = useMemo(() => {
    if (!coverageReport) return [];
    return coverageReport.items.filter((item) => {
      const matchSearch =
        !coverageSearch ||
        item.key.toLowerCase().includes(coverageSearch.toLowerCase()) ||
        (item.filePath && item.filePath.toLowerCase().includes(coverageSearch.toLowerCase()));

      const matchStatus =
        coverageStatusFilter === 'all' ||
        item.status === coverageStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [coverageReport, coverageSearch, coverageStatusFilter]);

  return (
    <div className="space-y-4">
      {/* 1. Header do Projeto & Status de Integração */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Testes Automatizados (Cypress / TAUT) — Automação de API &amp; Integração
              </h2>
              {projectStatus?.exists ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Online
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Não Localizado
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-2xl">
              Diretório: {projectStatus?.projectPath || 'Detectando...'}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                title="Configurar diretório do projeto TAUT nas Configurações"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Pasta</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncEnv}
              disabled={syncingEnv || !projectStatus?.exists}
              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              title="Gera ou atualiza as variáveis de ambiente (.env) do TAUT com a conexão Oracle ativa no Dev Manager"
            >
              <Database className={`w-3.5 h-3.5 ${syncingEnv ? 'animate-spin' : ''}`} />
              <span>Sincronizar .env com Oracle Ativo</span>
            </button>

            <button
              type="button"
              onClick={loadProjectData}
              disabled={loading}
              className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 transition cursor-pointer"
              title="Recarregar integridade do projeto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerta quando o projeto não for localizado */}
        {!projectStatus?.exists && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                O repositório de <strong>testes automatizados (Cypress)</strong> não foi encontrado no caminho configurado nem na pasta de projetos.
              </span>
            </div>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-amber-700 dark:text-amber-300 transition cursor-pointer shrink-0"
              >
                Definir nas Configurações →
              </button>
            )}
          </div>
        )}

        {/* Badges de Verificação Técnica do Projeto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Framework E2E</span>
            <div className="font-semibold text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Cypress {projectStatus?.cypressVersion || '15.6.0'}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Arquivo de Configuração</span>
            <div className="font-semibold text-foreground flex items-center gap-1">
              {projectStatus?.hasCypressConfig ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>cypress.config.ts</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ausente</span>
                </>
              )}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Banco Oracle (.env)</span>
            <div className="font-semibold text-foreground truncate" title={projectStatus?.envVariables?.oracleConnectString || 'Não configurado'}>
              {projectStatus?.envVariables?.hasOracleConnectString ? (
                <span className="text-emerald-400 font-mono text-[11px]">
                  {projectStatus.envVariables.oracleConnectString}
                </span>
              ) : (
                <span className="text-amber-400">Pendente</span>
              )}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground">URL Base WTA (.env)</span>
            <div className="font-semibold text-foreground truncate" title={projectStatus?.envVariables?.baseUrl || 'Não configurado'}>
              <span className="font-mono text-[11px] text-foreground">
                {projectStatus?.envVariables?.baseUrl || 'http://localhost:8889'}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5 col-span-2 sm:col-span-4 lg:col-span-1">
            <span className="text-[10px] text-muted-foreground">Suítes Cadastradas</span>
            <div className="font-semibold text-foreground">
              {specs.length} specs ({specs.reduce((acc, s) => acc + s.testCount, 0)} testes)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navegação de Sub-Abas do Painel */}
      <div className="flex items-center space-x-1.5 border-b border-border/70 pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('runner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'runner'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Disparador & Tags</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('coverage')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'coverage'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cobertura Zephyr Scale</span>
          {coverageReport && (
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary-foreground/20">
              {coverageReport.coveragePercentage}%
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('specs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'specs'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Catálogo de Specs ({specs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('intake')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'intake'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Orquestrador de Intake CSV (IA)</span>
        </button>
      </div>

      {/* 3. CONTEÚDO DA SUB-ABA: RUNNER & TAGS */}
      {activeSubTab === 'runner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Coluna Esquerda: Seletor de Tags e Controles (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Meta Tags (Esteira, Crítico, Regressão, Contrato) */}
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Filtro de Meta-Tags (@cypress/grep)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Clique para alternar</span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {META_TAGS.map((meta) => {
                  const isSelected = selectedTags.includes(meta.id);
                  return (
                    <button
                      key={meta.id}
                      type="button"
                      onClick={() => toggleTag(meta.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                        isSelected
                          ? `${meta.color} font-bold ring-1 ring-primary/40`
                          : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {isSelected ? `✓ ${meta.label}` : meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Módulos do WinThor */}
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Módulos de Negócio (Serviços WTA)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Selecione para focar</span>
              </label>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {MODULE_TAGS.map((mod) => {
                  const isSelected = selectedTags.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleTag(mod.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold border-primary shadow-xs'
                          : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                      }`}
                      title={`Tag: ${mod.id} (${mod.group})`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parâmetros Avançados de Execução */}
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Parâmetros de Execução</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] text-muted-foreground">Filtro de Tags Combinado:</label>
                  <input
                    type="text"
                    value={effectiveTagsString}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="ex: critico,winthor-pedido-venda,-develop"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground">Filtro de Arquivo Spec (Opcional):</label>
                  <input
                    type="text"
                    value={customSpecInput}
                    onChange={(e) => setCustomSpecInput(e.target.value)}
                    placeholder="cypress/e2e/api/Pedido/**/*"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">Modo de URL (API_URL_MODE):</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setApiUrlMode('v39')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        apiUrlMode === 'v39'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      v39 (Atual)
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiUrlMode('legacy')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        apiUrlMode === 'legacy'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      legacy
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleRunTests}
                  disabled={isRunning || !projectStatus?.exists}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Executando...' : 'Rodar Headless'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInteractive}
                  disabled={isRunning || !projectStatus?.exists}
                  className="w-full sm:w-auto py-2 px-3 rounded-lg bg-card hover:bg-muted text-foreground border border-border/70 hover:border-border text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 whitespace-nowrap disabled:opacity-50"
                  title="Abre o Cypress Runner Interativo com navegador (cy:open)"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span>Abrir cy:open</span>
                </button>

                {isRunning && (
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="w-full sm:w-auto py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                    title="Interromper execução do processo Cypress"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Console Terminal em Tempo Real (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col h-[520px] rounded-xl bg-card border border-border shadow-xs overflow-hidden">
            {/* Header do Terminal */}
            <div className="px-3 py-2 bg-muted/60 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Console de Execução Cypress</span>
                {isRunning && (
                  <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>AO VIVO</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                {activeOutput && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeOutput, 'cypress-output')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Copiar log completo"
                  >
                    {copiedKey === 'cypress-output' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveOutput('')}
                  disabled={!activeOutput}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition cursor-pointer disabled:opacity-40"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Corpo do Terminal com Log em Streaming */}
            <div
              ref={terminalBottomRef}
              className="flex-1 p-3 font-mono text-[11px] leading-relaxed bg-[#0B0F17] text-slate-200 overflow-y-auto select-text whitespace-pre-wrap"
            >
              {activeOutput ? (
                activeOutput
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 select-none">
                  <Play className="w-8 h-8 opacity-30" />
                  <p className="text-xs">Nenhuma execução em andamento.</p>
                  <p className="text-[10px] text-slate-600">
                    Selecione as tags ou arquivos de teste à esquerda e clique em &quot;Rodar Headless&quot;.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé com Resumo da Execução (se finalizada) */}
            {lastExecutionResult && (
              <div className="px-3 py-2 bg-muted/40 border-t border-border/60 flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Total:</span>
                    <strong>{lastExecutionResult.totalTests}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span>Aprovados:</span>
                    <span>{lastExecutionResult.passedCount}</span>
                  </span>
                  {lastExecutionResult.failedCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <span>Falhas:</span>
                      <span>{lastExecutionResult.failedCount}</span>
                    </span>
                  )}
                  {lastExecutionResult.skippedCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <span>Ignorados:</span>
                      <span>{lastExecutionResult.skippedCount}</span>
                    </span>
                  )}
                </div>

                <div className="text-muted-foreground">
                  Duração: {(lastExecutionResult.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA SUB-ABA: COBERTURA ZEPHYR */}
      {activeSubTab === 'coverage' && (
        <div className="space-y-4">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-xs text-muted-foreground">Total de Cenários no Zephyr</span>
              <div className="text-2xl font-extrabold text-foreground font-mono">
                {coverageReport?.totalScenarios || 0}
              </div>
              <p className="text-[10px] text-muted-foreground">Extraídos dos arquivos .csv em /Insumo</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-xs text-muted-foreground">Cenários Automatizados</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono flex items-center gap-2">
                <span>{coverageReport?.automatedCount || 0}</span>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-emerald-500/80">Cobertos em arquivos .cy.ts</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-xs text-muted-foreground">Cenários Pendentes</span>
              <div className="text-2xl font-extrabold text-amber-400 font-mono flex items-center gap-2">
                <span>{coverageReport?.pendingCount || 0}</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-amber-500/80">Aguardando implementação</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-xs text-muted-foreground">Índice de Cobertura</span>
              <div className="text-2xl font-extrabold text-primary font-mono">
                {coverageReport?.coveragePercentage || 0}%
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, coverageReport?.coveragePercentage || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Cenários com Busca e Filtros */}
          <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={coverageSearch}
                  onChange={(e) => setCoverageSearch(e.target.value)}
                  placeholder="Filtrar por ID (DDWMISSI-TXXXX) ou arquivo..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setCoverageStatusFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      coverageStatusFilter === 'all'
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Todos ({coverageReport?.items.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverageStatusFilter('automated')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      coverageStatusFilter === 'automated'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Automatizados ({coverageReport?.automatedCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverageStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      coverageStatusFilter === 'pending'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Pendentes ({coverageReport?.pendingCount || 0})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadCoverage}
                  disabled={loadingCoverage}
                  className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold border border-border/70 flex items-center space-x-1.5 transition cursor-pointer"
                  title="Recalcula a cobertura lendo os arquivos CSV e specs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCoverage ? 'animate-spin' : ''}`} />
                  <span>Recalcular</span>
                </button>
              </div>
            </div>

            {/* Listagem em Tabela */}
            <div className="max-h-96 overflow-y-auto border border-border/60 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0 border-b border-border/60">
                  <tr>
                    <th className="py-2 px-3 font-semibold w-40">Chave Zephyr</th>
                    <th className="py-2 px-3 font-semibold w-32">Status</th>
                    <th className="py-2 px-3 font-semibold">Arquivo de Automação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCoverageItems.length > 0 ? (
                    filteredCoverageItems.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/30 transition">
                        <td className="py-2 px-3 font-mono font-bold text-foreground">
                          {item.key}
                        </td>
                        <td className="py-2 px-3">
                          {item.status === 'automated' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Automatizado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-md">
                          {item.filePath ? (
                            <span className="text-foreground">{item.filePath}</span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        Nenhum cenário correspondente aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTEÚDO DA SUB-ABA: CATÁLOGO DE SPECS */}
      {activeSubTab === 'specs' && (
        <div className="rounded-xl bg-card border border-border shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Arquivos de Teste no Cypress ({specs.length} arquivos)
            </h3>
            <span className="text-xs text-muted-foreground">
              Total de testes: <strong>{specs.reduce((acc, s) => acc + s.testCount, 0)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {specs.map((spec) => (
              <div
                key={spec.relativePath}
                className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary font-mono">
                    {spec.module}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {spec.testCount} {spec.testCount === 1 ? 'teste' : 'testes'}
                  </span>
                </div>

                <div className="font-mono text-xs font-semibold text-foreground truncate" title={spec.relativePath}>
                  {spec.specFile}
                </div>

                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {spec.relativePath}
                </div>

                {/* Tags do Spec */}
                {spec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {spec.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-muted text-muted-foreground border border-border/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. CONTEÚDO DA SUB-ABA: ORQUESTRADOR DE INTAKE CSV (IA) */}
      {activeSubTab === 'intake' && (
        <div className="rounded-xl bg-card border border-border shadow-xs p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-foreground">
                Orquestrador de Intake CSV — Subagente 0 (Agents.md)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lê o arquivo CSV exportado do Zephyr Scale em <code className="font-mono">Insumo/</code>, valida as 11 regras arquiteturais do projeto TAUT e gera o bloco estruturado de intake pronto para implementar com IA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <FileCode2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={csvFileName}
                onChange={(e) => setCsvFileName(e.target.value)}
                placeholder="ex: Insumo/pedido.csv ou pedido.csv"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleProcessIntake}
              disabled={processingIntake || !csvFileName.trim()}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${processingIntake ? 'animate-spin' : ''}`} />
              <span>{processingIntake ? 'Processando...' : 'Processar com IA'}</span>
            </button>
          </div>

          {/* Resultado do Intake */}
          {intakeResult && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              {/* Avisos e Bloqueantes */}
              {intakeResult.checklistBlockers.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>Bloqueantes Identificados (Impedem Implementação):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {intakeResult.checklistBlockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {intakeResult.checklistWarnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Avisos de Atenção:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {intakeResult.checklistWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bloco de Intake Estruturado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Bloco de Intake (Para Prompt de IA)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(intakeResult.intakeBlock, 'intake-block')}
                    className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedKey === 'intake-block' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Bloco</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-[#0B0F17] text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-border/50">
                  {intakeResult.intakeBlock}
                </pre>
              </div>

              {/* Plano de Implementação */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Plano de Construção das 4 Camadas</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(intakeResult.implementationPlan, 'plan-block')}
                    className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedKey === 'plan-block' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Plano</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-[#0B0F17] text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-border/50">
                  {intakeResult.implementationPlan}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
