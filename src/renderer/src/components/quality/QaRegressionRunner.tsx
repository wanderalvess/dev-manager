import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  RefreshCw,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  FileCode,
  FileCode2,
  Search,
  ChevronDown,
  ChevronRight,
  Code2,
  Filter,
  Layers,
  Cpu,
  Terminal,
  Plus,
  Trash2,
  Table
} from 'lucide-react';
import {
  AppSettings,
  DatabaseConnectionConfig,
  QaExecutionResult,
  QaRegressionTemplate,
  QaStepExecutionResult
} from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import {
  autoExtractVariablesFromJson,
  filterStepResults,
  buildJiraEvidenceClipboardText,
  generateMarkdownEvidence
} from '../../utils/qaRegressionRendererUtils';

interface QaRegressionRunnerProps {
  settings: AppSettings | null;
  onNavigate?: (tab: string) => void;
  onOpenTemplatesManager?: () => void;
}

export const QaRegressionRunner: React.FC<QaRegressionRunnerProps> = ({
  settings,
  onNavigate,
  onOpenTemplatesManager
}) => {
  const [templates, setTemplates] = useState<QaRegressionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [rawJson, setRawJson] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [newVarKey, setNewVarKey] = useState<string>('');
  const [newVarVal, setNewVarVal] = useState<string>('');
  const [issueKey, setIssueKey] = useState<string>('DDWMISSI-T966');
  const [activeInputTab, setActiveInputTab] = useState<'json' | 'vars'>('json');

  // Estado da Execução
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<QaExecutionResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [stepSqlModal, setStepSqlModal] = useState<{ title: string; sql: string } | null>(null);
  const [rowsModal, setRowsModal] = useState<{ title: string; rows: any[] } | null>(null);

  // Filtros de resultados
  const [resultFilter, setResultFilter] = useState<'all' | 'failed' | 'passed'>('all');
  const [resultSearch, setResultSearch] = useState<string>('');

  const { copy, copiedKey } = useCopyToClipboard(2000);

  // Conexões de banco disponíveis
  const dbConnections = useMemo(() => {
    return settings?.databaseConnections || [];
  }, [settings]);

  const oracleConnections = useMemo(() => {
    return dbConnections.filter((c) => c.type === 'oracle');
  }, [dbConnections]);

  // Carrega templates salvos
  const loadTemplates = useCallback(async () => {
    try {
      if (api?.qaListTemplates) {
        const list = await api.qaListTemplates();
        setTemplates(list);
        if (list.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(list[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Falha ao listar templates de regressivo:', err);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Template selecionado atualmente
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Inicializa conexão padrão (Oracle se houver)
  useEffect(() => {
    if (!selectedConnectionId) {
      if (oracleConnections.length > 0) {
        setSelectedConnectionId(oracleConnections[0].id);
      } else if (dbConnections.length > 0) {
        setSelectedConnectionId(dbConnections[0].id);
      }
    }
  }, [oracleConnections, dbConnections, selectedConnectionId]);

  // Atualiza variáveis padrão quando o template muda
  useEffect(() => {
    if (selectedTemplate) {
      const def = selectedTemplate.defaultVariables || {};
      const strMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(def)) {
        strMap[k] = String(v);
      }
      setVariables(strMap);

      if (selectedTemplate.sampleJson && !rawJson) {
        setRawJson(selectedTemplate.sampleJson);
      }
    }
  }, [selectedTemplate]);

  // Auto-preenche variáveis a partir do JSON
  const handleAutoExtractVariables = () => {
    if (!rawJson.trim()) {
      showToast('Cole primeiro o payload JSON da API ou PDV.', 'info');
      return;
    }
    const detected = autoExtractVariablesFromJson(rawJson);
    const keysCount = Object.keys(detected).length;
    if (keysCount > 0) {
      setVariables((prev) => ({ ...prev, ...detected }));
      showToast(`${keysCount} variáveis mapeadas automaticamente do JSON!`, 'success');
    } else {
      showToast('Nenhum parâmetro conhecido foi encontrado no JSON informado.', 'info');
    }
  };

  const handleLoadSampleJson = () => {
    if (selectedTemplate?.sampleJson) {
      setRawJson(selectedTemplate.sampleJson);
      const detected = autoExtractVariablesFromJson(selectedTemplate.sampleJson);
      setVariables((prev) => ({ ...prev, ...detected }));
      showToast('Payload JSON de exemplo carregado!', 'success');
    } else {
      showToast('Este template não possui JSON de exemplo configurado.', 'info');
    }
  };

  // Executa o teste
  const handleRunSuite = async () => {
    if (!selectedTemplate) {
      showToast('Selecione um cenário de teste para executar.', 'info');
      return;
    }
    if (!selectedConnectionId) {
      showToast('Selecione uma conexão Oracle para executar as queries.', 'info');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

    try {
      if (api?.qaExecuteSuite) {
        const result = await api.qaExecuteSuite({
          templateId: selectedTemplate.id,
          connectionId: selectedConnectionId,
          rawJson: rawJson.trim() ? rawJson : undefined,
          variables
        });

        setExecutionResult(result);

        // Expande passos com falhas por padrão
        const failedIds = new Set<string>();
        result.stepResults.forEach((s) => {
          if (!s.success) failedIds.add(s.stepId);
        });
        setExpandedSteps(failedIds.size > 0 ? failedIds : new Set(result.stepResults.map((s) => s.stepId)));

        if (result.success) {
          showToast(`Suite concluída! Todas as ${result.totalAssertions} asserções passaram.`, 'success');
        } else {
          showToast(
            `Validação concluída com divergências: ${result.failedAssertions} asserção(ões) falharam.`,
            'error'
          );
        }
      }
    } catch (err: any) {
      showToast(`Falha ao executar validação regressiva: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const expandAllSteps = () => {
    if (executionResult) {
      setExpandedSteps(new Set(executionResult.stepResults.map((s) => s.stepId)));
    }
  };

  const collapseAllSteps = () => {
    setExpandedSteps(new Set());
  };

  const handleCopyMarkdownReport = () => {
    if (!executionResult) return;
    const md = generateMarkdownEvidence(executionResult, {
      issueKey: issueKey.trim() || undefined,
      includeSql: true
    });
    copy(md, 'markdown-report');
    showToast('Evidência formatada em Markdown copiada com sucesso!', 'success');
  };

  const handleCopyJiraMarkup = () => {
    if (!executionResult) return;
    const markup = buildJiraEvidenceClipboardText(executionResult, issueKey.trim() || undefined);
    copy(markup, 'jira-markup');
    showToast('Tabela formatada para Jira copiada para a área de transferência!', 'success');
  };

  // Passos filtrados para exibição
  const filteredSteps = useMemo(() => {
    if (!executionResult) return [];
    return filterStepResults(executionResult.stepResults, resultFilter, resultSearch);
  }, [executionResult, resultFilter, resultSearch]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Barra Superior de Configuração & Parâmetros */}
      <div className="px-4 py-2.5 border-b border-border bg-card space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Seletor de Conexão */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" />
              Banco:
            </span>
            {dbConnections.length > 0 ? (
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="bg-background border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px]"
              >
                {dbConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type.toUpperCase()}) {c.host ? `— ${c.host}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Nenhuma conexão cadastrada</span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('database')}
                    className="underline font-bold hover:text-amber-400 cursor-pointer ml-1"
                  >
                    Cadastrar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seletor de Cenário / Template */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Cenário:
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="bg-background border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-md truncate"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.steps.length} passos) {t.category ? `[${t.category}]` : ''}
                </option>
              ))}
            </select>

            {onOpenTemplatesManager && (
              <button
                type="button"
                onClick={onOpenTemplatesManager}
                className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir Gerenciador de Templates para criar ou editar queries"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Gerenciar Templates</span>
              </button>
            )}
          </div>

          {/* Botão de Execução Principal */}
          <button
            type="button"
            onClick={handleRunSuite}
            disabled={isRunning || !selectedConnectionId || !selectedTemplate}
            className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executando Queries no Oracle...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar Validação Regressiva</span>
              </>
            )}
          </button>
        </div>

        {/* Descrição do Template Ativo */}
        {selectedTemplate?.description && (
          <p className="text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-2.5 py-0.5 font-mono">
            {selectedTemplate.description}
          </p>
        )}
      </div>

      {/* Conteúdo Principal Dividido: Painel de Inputs vs Resultados */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Painel Lateral de Entrada de Dados (JSON / Variáveis) */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border bg-card/60 flex flex-col shrink-0 overflow-hidden">
          {/* Tabs de Input — Estilo IDE Tab */}
          <div className="flex items-center border-b border-border bg-card px-2 gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveInputTab('json')}
              className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeInputTab === 'json'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Payload JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputTab('vars')}
              className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeInputTab === 'vars'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Binds &amp; Variáveis</span>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                {Object.keys(variables).length}
              </span>
            </button>
          </div>

          {/* Conteúdo da Tab JSON */}
          {activeInputTab === 'json' && (
            <div className="flex-1 flex flex-col p-3 overflow-hidden gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Payload JSON da API ou PDV:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleJson}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                    title="Preenche com o JSON de exemplo do template"
                  >
                    <FileCode2 className="w-3 h-3 text-primary" />
                    <span>Exemplo</span>
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={handleAutoExtractVariables}
                    className="text-[11px] text-foreground font-semibold hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Extrai parâmetros como codFilial e numCupom automaticamente do JSON"
                  >
                    <Cpu className="w-3 h-3 text-emerald-500" />
                    <span>Mapear Binds</span>
                  </button>
                </div>
              </div>

              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder='{\n  "codFilial": "1",\n  "numCupom": 4387,\n  "vlTotal": 768.7,\n  ...\n}'
                className="flex-1 w-full bg-background border border-border rounded-md p-2.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* Conteúdo da Tab Variáveis Manuais */}
          {activeInputTab === 'vars' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* Formulário Inline para Adicionar Binds */}
              <div className="p-2 rounded-md border border-border bg-background/50 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Adicionar Parâmetro de Bind:
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-mono text-xs font-bold">:</span>
                    <input
                      type="text"
                      value={newVarKey}
                      onChange={(e) => setNewVarKey(e.target.value)}
                      placeholder="codFilial"
                      className="w-full bg-card border border-border rounded pl-5 pr-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <input
                    type="text"
                    value={newVarVal}
                    onChange={(e) => setNewVarVal(e.target.value)}
                    placeholder="Valor"
                    className="flex-1 bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newVarKey.trim()) {
                        setVariables((prev) => ({ ...prev, [newVarKey.trim()]: newVarVal.trim() }));
                        setNewVarKey('');
                        setNewVarVal('');
                      }
                    }}
                    disabled={!newVarKey.trim()}
                    className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Adicionar variável"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {Object.keys(variables).length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                  Nenhum bind configurado.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(variables).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 bg-card border border-border rounded-md px-2.5 py-1.5">
                      <span className="font-mono text-xs font-semibold text-primary min-w-[85px] truncate" title={`:${k}`}>
                        :{k}
                      </span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariables((prev) => ({ ...prev, [k]: val }));
                        }}
                        className="bg-background border border-border rounded px-2 py-0.5 text-xs font-mono text-foreground flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVariables((prev) => {
                            const next = { ...prev };
                            delete next[k];
                            return next;
                          });
                        }}
                        className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer transition-colors"
                        title="Remover variável"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Painel Principal de Resultados da Execução */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {!executionResult && !isRunning && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="max-w-md w-full border border-border rounded-lg bg-card p-6 space-y-4 text-left">
                <div className="flex items-center gap-2.5 text-foreground border-b border-border pb-3">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Console de Regressão Oracle
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    {selectedTemplate ? (
                      <>
                        Cenário selecionado: <b className="text-foreground font-mono">{selectedTemplate.name}</b> ({selectedTemplate.steps.length} queries).
                      </>
                    ) : (
                      'Nenhum cenário selecionado.'
                    )}
                  </p>
                  <p>
                    Binds carregados: <span className="font-mono text-foreground font-semibold">{Object.keys(variables).length}</span> parâmetros prontos para interpolação.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSuite}
                  disabled={!selectedConnectionId || !selectedTemplate}
                  className="w-full py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar Bateria de Testes</span>
                </button>
              </div>
            </div>
          )}

          {isRunning && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1 font-mono">
                Executando Bateria de Asserções...
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Consultando tabelas do WinThor no banco Oracle e avaliando a conformidade de cada coluna.
              </p>
            </div>
          )}

          {executionResult && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Inspection Strip — Cabeçalho Técnico de Diagnóstico */}
              <div className="px-4 py-2.5 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Badge de Status Técnico */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5 border ${
                      executionResult.success
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {executionResult.success ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>CONFORME (100%)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>DIVERGÊNCIA DETECTADA</span>
                      </>
                    )}
                  </span>

                  {/* Telemetria com tabular-nums */}
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono">
                    <span>
                      Total: <b className="text-foreground tabular-nums">{executionResult.totalAssertions}</b>
                    </span>
                    <span className="text-border">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Pass: <span className="tabular-nums">{executionResult.passedAssertions}</span>
                    </span>
                    <span className="text-border">|</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Fail: <span className="tabular-nums">{executionResult.failedAssertions}</span>
                    </span>
                    {executionResult.warningAssertions > 0 && (
                      <>
                        <span className="text-border">|</span>
                        <span className="text-amber-500 font-semibold">
                          Warn: <span className="tabular-nums">{executionResult.warningAssertions}</span>
                        </span>
                      </>
                    )}
                    <span className="text-border">|</span>
                    <span className="text-muted-foreground tabular-nums">
                      {executionResult.durationMs}ms
                    </span>
                  </div>
                </div>

                {/* Ações de Evidência para Jira */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-background border border-border rounded-md px-2 py-1 text-xs">
                    <span className="text-muted-foreground mr-1.5 font-mono text-[11px]">Issue:</span>
                    <input
                      type="text"
                      value={issueKey}
                      onChange={(e) => setIssueKey(e.target.value)}
                      placeholder="DDWMISSI-T..."
                      className="bg-transparent border-none text-foreground font-mono font-bold text-xs focus:outline-none w-28 uppercase"
                      title="Chave da issue no Jira (ex: DDWMISSI-T966)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyMarkdownReport}
                    className="px-2.5 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar relatório completo com queries e tabelas em Markdown"
                  >
                    {copiedKey === 'markdown-report' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span>Copiar Markdown</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJiraMarkup}
                    className="px-2.5 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar tabela formatada em markup clássico do Jira"
                  >
                    {copiedKey === 'jira-markup' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Table className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span>Jira Table</span>
                  </button>
                </div>
              </div>

              {/* Barra de Filtros e Busca de Passos */}
              <div className="px-4 py-2 border-b border-border bg-card/60 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setResultFilter('all')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      resultFilter === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos ({executionResult.stepResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter('failed')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      resultFilter === 'failed'
                        ? 'bg-rose-600 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Com Divergências ({executionResult.stepResults.filter((s) => !s.success).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter('passed')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      resultFilter === 'passed'
                        ? 'bg-emerald-600 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Aprovados ({executionResult.stepResults.filter((s) => s.success).length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                      placeholder="Filtrar por tabela ou coluna..."
                      className="bg-background border border-border rounded-md pl-8 pr-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={expandAllSteps}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    Expandir
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={collapseAllSteps}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    Recolher
                  </button>
                </div>
              </div>

              {/* Lista dos Passos e Asserções */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {filteredSteps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-mono">
                    Nenhum passo corresponde aos filtros selecionados.
                  </div>
                ) : (
                  filteredSteps.map((step) => {
                    const isExpanded = expandedSteps.has(step.stepId);
                    return (
                      <div
                        key={step.stepId}
                        className={`border rounded-md bg-card overflow-hidden transition-colors ${
                          step.success
                            ? 'border-border border-l-4 border-l-emerald-500'
                            : 'border-border border-l-4 border-l-rose-500'
                        }`}
                      >
                        {/* Header do Passo */}
                        <div
                          onClick={() => toggleStepExpanded(step.stepId)}
                          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/30 select-none"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}

                            {step.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}

                            {step.tableName && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-muted text-foreground border border-border shrink-0">
                                {step.tableName}
                              </span>
                            )}

                            <span className="text-xs font-semibold text-foreground truncate">
                              {step.stepTitle}
                            </span>

                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0 font-mono tabular-nums">
                              {step.rowCount} reg • {step.executionTimeMs}ms
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 ml-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() =>
                                setStepSqlModal({
                                  title: step.stepTitle,
                                  sql: step.interpolatedQuery || step.query
                                })
                              }
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 border border-border"
                              title="Visualizar query SQL executada com binds preenchidos"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>SQL</span>
                            </button>

                            {step.rows && step.rows.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRowsModal({
                                    title: `${step.stepTitle} (Linhas Retornadas)`,
                                    rows: step.rows || []
                                  })
                                }
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 border border-border"
                                title="Visualizar registros retornados pelo banco"
                              >
                                <Table className="w-3 h-3" />
                                <span>Dados ({step.rows.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Corpo com Tabela de Asserções */}
                        {isExpanded && (
                          <div className="border-t border-border px-3.5 py-2.5 bg-background/50">
                            {step.error ? (
                              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
                                <b className="font-bold">Erro na Execução da Query:</b> {step.error}
                              </div>
                            ) : step.assertions.length === 0 ? (
                              <p className="text-xs text-muted-foreground font-mono italic">
                                Nenhuma asserção configurada para este passo. {step.rowCount} registro(s) obtido(s).
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-border text-[11px] font-mono text-muted-foreground uppercase">
                                      <th className="py-1 px-2 w-48">Coluna / Campo</th>
                                      <th className="py-1 px-2 w-40">Esperado</th>
                                      <th className="py-1 px-2 w-40">Retornado no Banco</th>
                                      <th className="py-1 px-2 w-24 text-center">Status</th>
                                      <th className="py-1 px-2">Detalhes / Motivo</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                                    {step.assertions.map((ass) => (
                                      <tr
                                        key={ass.assertionId}
                                        className={
                                          ass.status === 'failed'
                                            ? 'bg-rose-500/5'
                                            : ass.status === 'warning'
                                              ? 'bg-amber-500/5'
                                              : 'hover:bg-muted/20'
                                        }
                                      >
                                        <td className="py-1.5 px-2 font-semibold text-foreground">
                                          {ass.column}
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground">
                                          {ass.expectedDisplay}
                                        </td>
                                        <td className="py-1.5 px-2 font-semibold text-foreground">
                                          {ass.actualDisplay}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase inline-block border ${
                                              ass.status === 'passed'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                : ass.status === 'failed'
                                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                            }`}
                                          >
                                            {ass.status === 'passed'
                                              ? 'OK'
                                              : ass.status === 'failed'
                                                ? 'DIVERG'
                                                : 'ALERTA'}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-[11px] font-sans text-muted-foreground">
                                          {ass.message || '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Visualizar Query SQL */}
      {stepSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl flex flex-col max-h-[85vh] shadow-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-xs text-foreground flex items-center gap-2 font-mono">
                <Code2 className="w-3.5 h-3.5 text-primary" />
                <span>Consulta SQL — {stepSqlModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setStepSqlModal(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <pre className="p-3 rounded-md bg-background border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {stepSqlModal.sql}
              </pre>
            </div>
            <div className="px-4 py-2.5 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  copy(stepSqlModal.sql, 'modal-sql');
                  showToast('SQL copiado!', 'success');
                }}
                className="px-3 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                Copiar SQL
              </button>
              <button
                type="button"
                onClick={() => setStepSqlModal(null)}
                className="px-3 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Visualizar Dados Retornados (Linhas) */}
      {rowsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-3xl flex flex-col max-h-[85vh] shadow-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-xs text-foreground flex items-center gap-2 font-mono">
                <Table className="w-3.5 h-3.5 text-primary" />
                <span>{rowsModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRowsModal(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <pre className="p-3 rounded-md bg-background border border-border font-mono text-[11px] text-foreground overflow-x-auto leading-relaxed">
                {JSON.stringify(rowsModal.rows, null, 2)}
              </pre>
            </div>
            <div className="px-4 py-2.5 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setRowsModal(null)}
                className="px-3 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer"
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
