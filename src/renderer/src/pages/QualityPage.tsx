import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Ban,
  Search,
  Plus,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  Grid,
  ScrollText,
  Compass,
  Trash2
} from 'lucide-react';
import {
  QualityValidationItem,
  ValidationItemStatus,
  ValidationCategory,
  calculateQualityMetrics,
  filterValidationItems,
  generateQualityMarkdownReport,
  getDefaultValidationItems,
  ROADMAP_PLANNED_ITEMS
} from '../utils/qualityPageUtils';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { showToast } from '../components/ToastHost';
import { AppSettings, TestExecutionResult } from '../../../shared/types';
import { QaRegressionRunner } from '../components/quality/QaRegressionRunner';
import { QaRegressionTemplatesManager } from '../components/quality/QaRegressionTemplatesManager';
import { AutomatedTestRunners } from '../components/quality/AutomatedTestRunners';
import { TautAutomationPanel } from '../components/quality/TautAutomationPanel';
import { Zap } from 'lucide-react';

const STORAGE_KEY_VALIDATION = 'devManager:quality:validationItemsV1';
const STORAGE_KEY_RELEASE = 'devManager:quality:releaseVersion';

interface QualityPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

type TabMode = 'taut' | 'matrix' | 'runners' | 'regression' | 'readiness' | 'roadmap';

export const QualityPage: React.FC<QualityPageProps> = ({ onNavigate, settingsVersion }) => {
  const [tabMode, setTabMode] = useState<TabMode>('matrix');
  const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((st) => setSettings(st)).catch(() => {});
    }
  }, [settingsVersion]);

  const qualitySources = settings?.qualitySources || [];
  const activeQualitySource = qualitySources.find((s) =>
    settings?.activeQualitySourceId ? s.id === settings.activeQualitySourceId : s.enabled
  );

  const [releaseVersion, setReleaseVersion] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_RELEASE) || 'v1.24.0';
    } catch {
      return 'v1.24.0';
    }
  });

  const [items, setItems] = useState<QualityValidationItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VALIDATION);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return getDefaultValidationItems();
  });

  // Salva itens no localStorage quando modificados
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VALIDATION, JSON.stringify(items));
    } catch {
      // localStorage indisponível
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RELEASE, releaseVersion);
    } catch {
      // localStorage indisponível
    }
  }, [releaseVersion]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal para adicionar item
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState<ValidationCategory>('routine');
  const [newNotes, setNewNotes] = useState('');

  const { copy, copiedKey } = useCopyToClipboard(2000);
  const metrics = useMemo(() => calculateQualityMetrics(items), [items]);

  const filteredItems = useMemo(
    () => filterValidationItems(items, searchTerm, statusFilter, categoryFilter),
    [items, searchTerm, statusFilter, categoryFilter]
  );

  const handleStatusChange = useCallback((id: string, newStatus: ValidationItemStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Cenário removido com sucesso.', 'info');
  }, []);

  const handleResetDefaults = useCallback(() => {
    if (window.confirm('Deseja restaurar os cenários de teste padrão de exemplo?')) {
      const defaults = getDefaultValidationItems();
      setItems(defaults);
      showToast('Cenários restaurados para o padrão.', 'info');
    }
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget.trim()) return;

    const newItem: QualityValidationItem = {
      id: `val-${Date.now()}`,
      title: newTitle.trim(),
      targetName: newTarget.trim(),
      category: newCategory,
      status: 'pending',
      notes: newNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    setItems((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewTarget('');
    setNewNotes('');
    setIsAddModalOpen(false);
    showToast('Novo cenário de validação adicionado.', 'success');
  };

  const handleCopyReport = () => {
    const report = generateQualityMarkdownReport({
      releaseVersion,
      metrics,
      items
    });
    copy(report, 'report');
    showToast('Relatório de homologação copiado em Markdown!', 'success');
  };

  const handleSyncWithValidationMatrix = useCallback(
    (runnerId: string, result: TestExecutionResult) => {
      const linkedIds = result.linkedValidationItemIds || [];
      if (linkedIds.length === 0) {
        showToast('Nenhum cenário da matriz vinculado a este runner.', 'info');
        return;
      }

      const newStatus: ValidationItemStatus = result.status === 'passed' ? 'passed' : 'failed';
      let updatedCount = 0;

      setItems((prev) =>
        prev.map((item) => {
          if (linkedIds.includes(item.id)) {
            updatedCount++;
            const runInfo = `[Auto-Runner ${result.runnerName}] Executado em ${new Date(
              result.executedAt
            ).toLocaleTimeString()} - Status: ${result.status.toUpperCase()} (${result.passedCount} passaram, ${result.failedCount} falharam)`;
            return {
              ...item,
              status: newStatus,
              notes: item.notes ? `${item.notes}\n${runInfo}` : runInfo,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        })
      );

      showToast(
        `${updatedCount} cenário(s) da Matriz atualizado(s) para "${newStatus === 'passed' ? 'Aprovado' : 'Falha'}"!`,
        newStatus === 'passed' ? 'success' : 'error'
      );
    },
    []
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Top Header / Banner do Módulo */}
      <div className="border-b border-border bg-card px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <CheckCheck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Central de Qualidade &amp; Homologação
                </h2>
                {activeQualitySource ? (
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-medium bg-muted text-foreground border border-border flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Fonte: {activeQualitySource.name} ({activeQualitySource.type})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('settings')}
                    className="px-2 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                    title="Configurar conexões com Zephyr Scale, Jira ou Azure DevOps"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Conectar Zephyr / Jira</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Planejamento de testes, critérios de aceite, matriz de validação e prontidão de entregas.
              </p>
            </div>
          </div>
        </div>

        {/* Ações Rápidas de Topo */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center bg-background border border-border rounded-md px-2.5 py-1 text-xs">
            <span className="text-muted-foreground mr-1.5 font-mono text-[11px]">Release:</span>
            <input
              type="text"
              value={releaseVersion}
              onChange={(e) => setReleaseVersion(e.target.value)}
              placeholder="v1.24.0"
              className="bg-transparent border-none text-foreground font-mono font-bold text-xs focus:outline-none w-20"
              title="Identificador da versão / release em homologação"
            />
          </div>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Copiar relatório estruturado em Markdown para colar no Teams, Azure DevOps ou Jira"
          >
            {copiedKey === 'report' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span>Exportar Relatório</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cenário</span>
          </button>
        </div>
      </div>

      {/* Sub-navegação interna */}
      <div className="border-b border-border bg-card px-6 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setTabMode('taut')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'taut'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automação TAUT (Cypress)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
              QA Hub
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabMode('matrix')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'matrix'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Matriz de Validação</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-background/20 font-mono">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabMode('runners')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'runners'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Runners</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground">
              Automação
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTabMode('regression');
              setIsTemplatesManagerOpen(false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'regression'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Validador Regressivo</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
              Oracle QA
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabMode('readiness')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'readiness'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Painel de Prontidão (PO)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                metrics.readinessScore >= 80
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'bg-amber-500/15 text-amber-500 font-semibold'
              }`}
            >
              {metrics.readinessScore}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabMode('roadmap')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              tabMode === 'roadmap'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Roadmap &amp; Demandas</span>
          </button>
        </div>

        {/* Atalhos para Ecossistema de Testes */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="text-[11px] font-mono text-muted-foreground">Atalhos:</span>
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('routines')}
                className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                title="Abrir Catálogo de Rotinas"
              >
                <Grid className="w-3 h-3 text-primary" />
                <span>Rotinas</span>
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={() => onNavigate('database')}
                className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                title="Abrir Database Studio para consultar massa de dados"
              >
                <Database className="w-3 h-3 text-emerald-500" />
                <span>Banco</span>
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={() => onNavigate('logs')}
                className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                title="Acompanhar Logs em Tempo Real"
              >
                <ScrollText className="w-3 h-3 text-amber-500" />
                <span>Logs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {tabMode === 'taut' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <TautAutomationPanel
            settings={settings}
            onNavigateToSettings={() => onNavigate?.('settings')}
          />
        </div>
      ) : tabMode === 'runners' ? (
        <AutomatedTestRunners
          settings={settings}
          validationItems={items}
          onSyncWithValidationMatrix={handleSyncWithValidationMatrix}
          onNavigate={onNavigate}
        />
      ) : tabMode === 'regression' ? (
        isTemplatesManagerOpen ? (
          <QaRegressionTemplatesManager
            onBack={() => setIsTemplatesManagerOpen(false)}
          />
        ) : (
          <QaRegressionRunner
            settings={settings}
            onNavigate={onNavigate}
            onOpenTemplatesManager={() => setIsTemplatesManagerOpen(true)}
          />
        )
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* TELEMETRY STRIP UNIFICADO */}
        <div className="border border-border rounded-md bg-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block">Total Cenários</span>
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">{metrics.total}</div>
          </div>
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aprovados
            </span>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{metrics.passed}</div>
          </div>
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Em Teste
            </span>
            <div className="text-lg font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">{metrics.inProgress}</div>
          </div>
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Falhas / Bugs
            </span>
            <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{metrics.failed}</div>
          </div>
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Ban className="w-3 h-3" /> Bloqueados
            </span>
            <div className="text-lg font-bold font-mono tabular-nums text-amber-500">{metrics.blocked}</div>
          </div>
          <div className="p-3 space-y-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary block">Taxa de Sucesso</span>
            <div className="text-lg font-bold font-mono tabular-nums text-primary">{metrics.passRate}%</div>
          </div>
        </div>

        {/* ABA: MATRIZ DE VALIDAÇÃO */}
        {tabMode === 'matrix' && (
          <div className="space-y-4">
            {qualitySources.length === 0 && (
              <div className="p-3.5 rounded-md bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Conecte suas fontes de teste reais (<strong className="text-foreground">Zephyr Scale, Zephyr Squad, Jira ou Azure Test Plans</strong>) para sincronizar planos e cenários de homologação automaticamente.
                  </span>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('settings')}
                    className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    Configurar Integrações
                  </button>
                )}
              </div>
            )}

            {/* Barra de Filtro e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cenário, rotina, alvo ou anotações..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/50 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-muted border border-border text-foreground cursor-pointer focus:outline-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Teste</option>
                  <option value="passed">Aprovado</option>
                  <option value="failed">Falha</option>
                  <option value="blocked">Bloqueado</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-muted border border-border text-foreground cursor-pointer focus:outline-none"
                >
                  <option value="all">Todas Categorias</option>
                  <option value="routine">Rotinas Delphi</option>
                  <option value="service">Serviços / Karaf</option>
                  <option value="api">APIs REST</option>
                  <option value="e2e">Fluxos E2E</option>
                </select>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  title="Restaurar cenários padrão de teste"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-border cursor-pointer transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista / Tabela da Matriz */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Cenário / Teste</th>
                      <th className="px-4 py-3">Alvo / Componente</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Notas &amp; Critérios</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum cenário de teste encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value as ValidationItemStatus)}
                              className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer focus:outline-none ${
                                item.status === 'passed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : item.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : item.status === 'in_progress'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : item.status === 'blocked'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              <option value="pending">⚪ Pendente</option>
                              <option value="in_progress">⏳ Em Teste</option>
                              <option value="passed">✅ Aprovado</option>
                              <option value="failed">❌ Falha / Bug</option>
                              <option value="blocked">⛔ Bloqueado</option>
                            </select>
                          </td>

                          <td className="px-4 py-3 font-semibold text-foreground">
                            {item.title}
                          </td>

                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                            {item.targetName}
                          </td>

                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                              {item.category === 'routine'
                                ? 'Rotina Delphi'
                                : item.category === 'service'
                                ? 'Serviço Karaf'
                                : item.category === 'api'
                                ? 'API REST'
                                : 'Fluxo E2E'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={item.notes}>
                            {item.notes || '—'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-rose-400 text-muted-foreground transition cursor-pointer"
                              title="Remover cenário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PAINEL DE PRONTIDÃO (PO) */}
        {tabMode === 'readiness' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card Semáforo de Liberação */}
            <div className="lg:col-span-1 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-black text-foreground">Semáforo de Liberação</h3>
                <span className="text-[10px] font-mono text-muted-foreground">Critérios PO</span>
              </div>

              <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border-4 text-3xl font-black ${
                    metrics.readinessScore >= 80
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : metrics.readinessScore >= 50
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-rose-500 bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {metrics.readinessScore}%
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {metrics.readinessScore >= 80
                    ? 'Release Pronta para Produção 🚀'
                    : metrics.readinessScore >= 50
                    ? 'Atenção: Testes em Andamento ⚠️'
                    : 'Bloqueado: Correções Necessárias ⛔'}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {metrics.failed > 0
                    ? `Existem ${metrics.failed} falhas registradas que precisam de resolução pela equipe de desenvolvimento antes da entrega.`
                    : metrics.pending > 0
                    ? `Restam ${metrics.pending} cenários pendentes de execução pela equipe de QA.`
                    : 'Todos os testes foram executados com sucesso sem impedimentos técnicos.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="font-bold text-foreground text-[11px] uppercase tracking-wider">Recomendações para o PO:</div>
                <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                  <li>Validar os critérios de aceite junto às áreas de negócio.</li>
                  <li>Conferir logs de homologação na aba <strong className="text-foreground">Logs</strong> antes da subida.</li>
                  <li>Acionar desenvolvedores pelo Azure DevOps caso haja bugs abertos.</li>
                </ul>
              </div>
            </div>

            {/* Checklist de Homologação */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-black text-foreground">Distribuição e Cobertura</h3>
                <span className="text-[10px] font-mono text-muted-foreground">{metrics.total} itens mapeados</span>
              </div>

              <div className="space-y-3">
                {/* Barra de progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Progresso Global dos Testes</span>
                    <span className="text-foreground font-mono">{metrics.passRate}% concluído</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(metrics.passed / (metrics.total || 1)) * 100}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title="Aprovados"
                    />
                    <div
                      style={{ width: `${(metrics.inProgress / (metrics.total || 1)) * 100}%` }}
                      className="bg-cyan-500 h-full transition-all"
                      title="Em Andamento"
                    />
                    <div
                      style={{ width: `${(metrics.blocked / (metrics.total || 1)) * 100}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title="Bloqueados"
                    />
                    <div
                      style={{ width: `${(metrics.failed / (metrics.total || 1)) * 100}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title="Falhas"
                    />
                  </div>
                </div>

                {/* Status por categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-foreground">Rotinas Delphi</span>
                    <p className="text-[11px] text-muted-foreground">
                      Executáveis locais testados diretamente com suporte a dados do Oracle.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-foreground">Serviços &amp; Bundles Karaf</span>
                    <p className="text-[11px] text-muted-foreground">
                      Saúde dos bundles OSGi e portas de comunicação ativas.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-foreground">APIs de Integração</span>
                    <p className="text-[11px] text-muted-foreground">
                      Validadores de contratos e respostas de microsserviços.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-foreground">Fluxos End-to-End</span>
                    <p className="text-[11px] text-muted-foreground">
                      Jornadas completas do usuário cobrindo ponta a ponta.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: ROADMAP & FUTURAS DEMANDAS */}
        {tabMode === 'roadmap' && (
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-muted/40 border border-border flex items-start gap-3">
              <Compass className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                  Evolução do Módulo de Qualidade para QA e Product Owners
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Esta é a primeira etapa da expansão do Dev Manager para atender o time de Qualidade e Gestão de Produto.
                  Os recursos abaixo estão mapeados e preparados para receber suas novas demandas e refinamentos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ROADMAP_PLANNED_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-md bg-card border border-border space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                        {item.tag}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                          item.status === 'in_progress'
                            ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.status === 'in_progress' ? 'Em Construção' : 'Mapeado'}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Foco: <strong className="text-foreground">{item.targetRole}</strong></span>
                    <span className="text-primary font-semibold">Próxima Etapa</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Modal Adicionar Cenário */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-lg border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Novo Cenário de Teste</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Título do Cenário</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Validar emissão de nota com desconto..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Alvo / Componente</label>
                <input
                  type="text"
                  required
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="Ex: Rotina 1402, Karaf, API de Pagamento..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ValidationCategory)}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="routine">Rotina Delphi</option>
                  <option value="service">Serviço / Karaf</option>
                  <option value="api">API REST</option>
                  <option value="e2e">Fluxo E2E</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Notas / Critérios de Aceite (Opcional)</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Descreva os passos essenciais ou o resultado esperado..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  Adicionar Cenário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
