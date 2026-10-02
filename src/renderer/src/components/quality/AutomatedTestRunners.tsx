import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Edit2,
  Terminal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderOpen,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  RotateCcw,
  Sliders,
  History,
  FileCode2,
  Globe,
  Send,
  Zap,
  Check
} from 'lucide-react';
import {
  AppSettings,
  TestRunnerConfig,
  TestExecutionResult,
  TestRunnerType,
  DEFAULT_TEST_RUNNER_PRESETS,
  TestRunnerPreset
} from '../../../../shared/types';
import { QualityValidationItem } from '../../utils/qualityPageUtils';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';

interface AutomatedTestRunnersProps {
  settings: AppSettings | null;
  validationItems: QualityValidationItem[];
  onSyncWithValidationMatrix?: (runnerId: string, result: TestExecutionResult) => void;
  onNavigate?: (tab: string) => void;
}

const TYPE_ICONS: Record<TestRunnerType, React.ReactNode> = {
  maven: <FileCode2 className="w-4 h-4 text-orange-400" />,
  playwright: <Globe className="w-4 h-4 text-emerald-400" />,
  cypress: <Globe className="w-4 h-4 text-teal-400" />,
  newman: <Send className="w-4 h-4 text-amber-400" />,
  custom: <Terminal className="w-4 h-4 text-blue-400" />
};

const TYPE_BADGES: Record<TestRunnerType, { label: string; badgeClass: string }> = {
  maven: { label: 'Maven / Java', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  playwright: { label: 'Playwright E2E', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cypress: { label: 'Cypress E2E', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  newman: { label: 'Newman API', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  custom: { label: 'Script Custom', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
};

export const AutomatedTestRunners: React.FC<AutomatedTestRunnersProps> = ({
  settings,
  validationItems,
  onSyncWithValidationMatrix,
  onNavigate
}) => {
  const [runners, setRunners] = useState<TestRunnerConfig[]>([]);
  const [history, setHistory] = useState<TestExecutionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Execução ativa
  const [runningRunnerId, setRunningRunnerId] = useState<string | null>(null);
  const [activeOutput, setActiveOutput] = useState<string>('');
  const [activeExecutionResult, setActiveExecutionResult] = useState<TestExecutionResult | null>(null);

  // Visualização de histórico ou output
  const [activeRightTab, setActiveRightTab] = useState<'console' | 'history'>('console');

  // Modal de edição / criação
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingRunner, setEditingRunner] = useState<Partial<TestRunnerConfig>>({
    name: '',
    type: 'maven',
    commandArgs: 'test',
    workingDir: '{PROJECTS_PATH}/',
    description: '',
    linkedValidationItemIds: []
  });

  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Carrega runners e histórico
  const loadData = async () => {
    setLoading(true);
    try {
      if (api.testRunnerList) {
        const list = await api.testRunnerList();
        setRunners(list || []);
      }
      if (api.testRunnerGetHistory) {
        const hist = await api.testRunnerGetHistory();
        setHistory(hist || []);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar runners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Streaming de chunk de output via WebSocket / IPC
  useEffect(() => {
    if (api.onTestRunnerChunk) {
      const unsub = api.onTestRunnerChunk((data) => {
        setActiveOutput((prev) => prev + data.chunk);
        if (terminalBottomRef.current) {
          terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
    return undefined;
  }, []);

  // Executar runner
  const handleExecute = async (runner: TestRunnerConfig) => {
    if (runningRunnerId) {
      showToast('Já existe uma execução em andamento.', 'info');
      return;
    }

    setRunningRunnerId(runner.id);
    setActiveOutput(`\x1b[36m[DevManager]\x1b[0m Iniciando execução do runner "${runner.name}" (${runner.type})...\n\n`);
    setActiveExecutionResult(null);
    setActiveRightTab('console');

    try {
      const result = await api.testRunnerExecute(runner.id);
      setActiveExecutionResult(result);
      if (result.status === 'passed') {
        showToast(`Runner "${runner.name}" finalizado com sucesso! (${result.passedCount} testes passaram)`, 'success');
      } else if (result.status === 'aborted') {
        showToast(`Execução de "${runner.name}" abortada pelo usuário.`, 'info');
      } else {
        showToast(`Runner "${runner.name}" falhou com ${result.failedCount} erro(s).`, 'error');
      }
      // Recarrega histórico
      if (api.testRunnerGetHistory) {
        const hist = await api.testRunnerGetHistory();
        setHistory(hist || []);
      }
    } catch (err: any) {
      showToast(`Erro ao executar runner: ${err.message}`, 'error');
      setActiveOutput((prev) => prev + `\n\nErro: ${err.message}\n`);
    } finally {
      setRunningRunnerId(null);
    }
  };

  // Abortar execução
  const handleAbort = async () => {
    try {
      await api.testRunnerAbort();
      showToast('Solicitação de abort cancelada enviada...', 'info');
    } catch (err: any) {
      showToast(`Falha ao abortar: ${err.message}`, 'error');
    }
  };

  // Adicionar preset
  const handleAddPreset = (preset: TestRunnerPreset) => {
    setEditingRunner({
      name: preset.name,
      type: preset.type,
      commandArgs: preset.defaultCommandArgs,
      workingDir: preset.suggestedWorkingDirPlaceholder,
      description: preset.description,
      linkedValidationItemIds: []
    });
    setIsEditorModalOpen(true);
  };

  // Salvar runner
  const handleSaveRunner = async () => {
    if (!editingRunner.name?.trim()) {
      showToast('Nome do runner é obrigatório.', 'error');
      return;
    }
    if (!editingRunner.workingDir?.trim()) {
      showToast('Diretório de trabalho é obrigatório.', 'error');
      return;
    }

    try {
      await api.testRunnerSave(editingRunner);
      showToast('Configuração de runner salva com sucesso!', 'success');
      setIsEditorModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Erro ao salvar runner: ${err.message}`, 'error');
    }
  };

  // Excluir runner
  const handleDeleteRunner = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o runner "${name}"?`)) return;

    try {
      await api.testRunnerDelete(id);
      showToast(`Runner "${name}" excluído.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(`Erro ao excluir: ${err.message}`, 'error');
    }
  };

  // Limpar histórico
  const handleClearHistory = async () => {
    if (!window.confirm('Deseja limpar todo o histórico de execuções de testes?')) return;
    try {
      await api.testRunnerClearHistory();
      setHistory([]);
      showToast('Histórico de testes limpo com sucesso.', 'info');
    } catch (err: any) {
      showToast(`Erro ao limpar histórico: ${err.message}`, 'error');
    }
  };

  // Sincronizar com Matriz
  const handleSyncWithMatrix = (runnerId: string, result: TestExecutionResult) => {
    if (onSyncWithValidationMatrix) {
      onSyncWithValidationMatrix(runnerId, result);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Coluna Esquerda: Lista de Runners & Presets */}
      <div className="w-full md:w-5/12 lg:w-4/12 border-r border-border/80 flex flex-col overflow-hidden bg-card/40">
        {/* Barra superior de ações */}
        <div className="p-4 border-b border-border/70 flex items-center justify-between gap-3 shrink-0 bg-card/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                Suítes &amp; Runners
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                {runners.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pipelines de teste locais com captura de saída
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRunner({
                name: '',
                type: 'maven',
                commandArgs: 'test',
                workingDir: '{PROJECTS_PATH}/',
                description: '',
                linkedValidationItemIds: []
              });
              setIsEditorModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Runner</span>
          </button>
        </div>

        {/* Presets de Início Rápido */}
        <div className="p-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>Modelos rápidos:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TEST_RUNNER_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className="px-2 py-1 rounded bg-background hover:bg-muted border border-border/70 text-[11px] font-mono text-foreground flex items-center gap-1.5 transition cursor-pointer hover:border-primary/50 shadow-2xs"
                title={preset.description}
              >
                {TYPE_ICONS[preset.type]}
                <span className="truncate max-w-[130px]">{preset.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Runners */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mb-2" />
              <span className="text-xs font-mono">Carregando suítes...</span>
            </div>
          ) : runners.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-border/80 rounded-xl bg-card/20">
              <Terminal className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold text-foreground">Nenhum runner cadastrado</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                Adicione um executor acima ou use um dos modelos rápidos para começar.
              </p>
            </div>
          ) : (
            runners.map((runner) => {
              const isRunning = runningRunnerId === runner.id;
              const badge = TYPE_BADGES[runner.type] || TYPE_BADGES.custom;

              return (
                <div
                  key={runner.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isRunning
                      ? 'border-primary/80 bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/70 bg-card hover:border-border hover:bg-card/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-muted/60 border border-border/60 shrink-0 mt-0.5">
                        {TYPE_ICONS[runner.type]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[160px]" title={runner.name}>
                            {runner.name}
                          </h4>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider font-semibold border ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {runner.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={runner.description}>
                            {runner.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRunner(runner);
                          setIsEditorModalOpen(true);
                        }}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer"
                        title="Editar runner"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRunner(runner.id, runner.name)}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Excluir runner"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes do comando e diretório */}
                  <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] space-y-1 font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate opacity-80" title={runner.workingDir}>
                        {runner.workingDir}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground/90 font-medium truncate">
                        {runner.type === 'maven'
                          ? `mvn ${runner.commandArgs || 'test'}`
                          : runner.type === 'playwright'
                          ? `npx playwright ${runner.commandArgs || 'test'}`
                          : runner.type === 'cypress'
                          ? `npx cypress ${runner.commandArgs || 'run'}`
                          : runner.type === 'newman'
                          ? `npx newman ${runner.commandArgs || 'run'}`
                          : `${runner.customCommand || ''} ${runner.commandArgs || ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Itens vinculados da matriz */}
                  {runner.linkedValidationItemIds && runner.linkedValidationItemIds.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <Layers className="w-3 h-3 text-primary" />
                      <span>
                        {runner.linkedValidationItemIds.length} cenário(s) da Matriz
                      </span>
                    </div>
                  )}

                  {/* Ação de execução */}
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={runningRunnerId !== null}
                      onClick={() => handleExecute(runner)}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98 ${
                        isRunning
                          ? 'bg-primary/15 text-primary border border-primary/30 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executando...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Executar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coluna Direita: Live Terminal & Histórico */}
      <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
        {/* Header do Terminal */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveRightTab('console')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeRightTab === 'console'
                  ? 'bg-zinc-800 text-zinc-100 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('history')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeRightTab === 'history'
                  ? 'bg-zinc-800 text-zinc-100 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico ({history.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {runningRunnerId && (
              <button
                type="button"
                onClick={handleAbort}
                className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
              >
                <Square className="w-3 h-3 fill-rose-300" />
                <span>Interromper</span>
              </button>
            )}

            {activeRightTab === 'console' && (
              <button
                type="button"
                onClick={() => setActiveOutput('')}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                title="Limpar console"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {activeRightTab === 'history' && history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2 py-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-[11px] font-mono transition cursor-pointer"
              >
                Limpar Registros
              </button>
            )}
          </div>
        </div>

        {/* Banner de Resultado Final da Execução */}
        {activeExecutionResult && activeRightTab === 'console' && (
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 font-mono text-xs ${
              activeExecutionResult.status === 'passed'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : activeExecutionResult.status === 'aborted'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {activeExecutionResult.status === 'passed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : activeExecutionResult.status === 'aborted' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="font-bold flex items-center gap-2">
                  <span>{activeExecutionResult.runnerName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded border border-current font-semibold">
                    {activeExecutionResult.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] opacity-75">
                    ({(activeExecutionResult.durationMs / 1000).toFixed(1)}s)
                  </span>
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  Total: {activeExecutionResult.totalTests} | Aprovados: {activeExecutionResult.passedCount} | Falhas:{' '}
                  {activeExecutionResult.failedCount} | Pulados: {activeExecutionResult.skippedCount}
                </div>
              </div>
            </div>

            {/* Sincronização com a Matriz de Validação */}
            {activeExecutionResult.linkedValidationItemIds &&
              activeExecutionResult.linkedValidationItemIds.length > 0 &&
              onSyncWithValidationMatrix && (
                <button
                  type="button"
                  onClick={() =>
                    handleSyncWithMatrix(activeExecutionResult.runnerId, activeExecutionResult)
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-100 flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sincronizar Matriz</span>
                </button>
              )}
          </div>
        )}

        {/* Conteúdo: Console ou Histórico */}
        {activeRightTab === 'console' ? (
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text whitespace-pre-wrap break-all text-zinc-300">
            {activeOutput ? (
              activeOutput
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Terminal className="w-8 h-8 mb-2 opacity-40" />
                <span>Nenhuma saída de execução. Clique em &quot;Executar Agora&quot; em um runner.</span>
              </div>
            )}
            <div ref={terminalBottomRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center p-8 text-zinc-500">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>Nenhum teste foi executado ainda.</span>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {item.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : item.status === 'aborted' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="font-bold text-zinc-200">{item.runnerName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.executedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-emerald-400">+{item.passedCount}</span>
                      <span className="text-rose-400">-{item.failedCount}</span>
                      <span className="text-zinc-500">~{item.skippedCount}</span>
                      <span className="text-zinc-400">{(item.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  {item.summaryMessage && (
                    <p className="mt-1.5 text-[11px] font-mono text-zinc-400 line-clamp-1">
                      {item.summaryMessage}
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOutput(item.output || '');
                        setActiveExecutionResult(item);
                        setActiveRightTab('console');
                      }}
                      className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Ver log completo
                    </button>

                    {item.linkedValidationItemIds &&
                      item.linkedValidationItemIds.length > 0 &&
                      onSyncWithValidationMatrix && (
                        <button
                          type="button"
                          onClick={() => handleSyncWithMatrix(item.runnerId, item)}
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Sincronizar com Matriz</span>
                        </button>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Runner */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  {editingRunner.id ? 'Configuração do Runner' : 'Novo Runner de Teste'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono p-1 rounded hover:bg-muted transition cursor-pointer"
              >
                ESC / ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                  Identificador / Nome:
                </label>
                <input
                  type="text"
                  value={editingRunner.name || ''}
                  onChange={(e) => setEditingRunner({ ...editingRunner, name: e.target.value })}
                  placeholder="Ex: Testes Unitários - Bundle Financeiro"
                  className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/80 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                    Framework / Tipo:
                  </label>
                  <select
                    value={editingRunner.type || 'maven'}
                    onChange={(e) => {
                      const type = e.target.value as TestRunnerType;
                      setEditingRunner({
                        ...editingRunner,
                        type,
                        commandArgs:
                          type === 'maven'
                            ? 'test'
                            : type === 'playwright'
                            ? 'test'
                            : type === 'cypress'
                            ? 'run'
                            : type === 'newman'
                            ? 'run ./tests/collection.json'
                            : ''
                      });
                    }}
                    className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary/80 font-mono text-xs cursor-pointer"
                  >
                    <option value="maven">Maven (JUnit / Karaf)</option>
                    <option value="playwright">Playwright E2E</option>
                    <option value="cypress">Cypress E2E</option>
                    <option value="newman">Newman (Postman CLI)</option>
                    <option value="custom">Script Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                    Argumentos CLI:
                  </label>
                  <input
                    type="text"
                    value={editingRunner.commandArgs || ''}
                    onChange={(e) => setEditingRunner({ ...editingRunner, commandArgs: e.target.value })}
                    placeholder="Ex: test ou verify"
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary/80"
                  />
                </div>
              </div>

              {editingRunner.type === 'custom' && (
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                    Comando Executável:
                  </label>
                  <input
                    type="text"
                    value={editingRunner.customCommand || ''}
                    onChange={(e) => setEditingRunner({ ...editingRunner, customCommand: e.target.value })}
                    placeholder="Ex: pytest ou npm run test"
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary/80"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                  Diretório de Trabalho:
                </label>
                <input
                  type="text"
                  value={editingRunner.workingDir || ''}
                  onChange={(e) => setEditingRunner({ ...editingRunner, workingDir: e.target.value })}
                  placeholder="Ex: {PROJECTS_PATH}/meu-projeto"
                  className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary/80"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block font-mono">
                  Variáveis: <code>{'{PROJECTS_PATH}'}</code>, <code>{'{KARAF_PATH}'}</code>
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                  Descrição (Opcional):
                </label>
                <input
                  type="text"
                  value={editingRunner.description || ''}
                  onChange={(e) => setEditingRunner({ ...editingRunner, description: e.target.value })}
                  placeholder="Ex: Validação das regras de negócio fiscais"
                  className="w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              {/* Vínculo com Itens da Matriz de Validação */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                  Vincular Cenários da Matriz:
                </label>
                <div className="max-h-28 overflow-y-auto border border-border/70 rounded-lg p-2 bg-background/50 space-y-1">
                  {validationItems.length === 0 ? (
                    <span className="text-muted-foreground text-[11px] font-mono">
                      Nenhum cenário cadastrado na Matriz de Validação.
                    </span>
                  ) : (
                    validationItems.map((valItem) => {
                      const isLinked = (editingRunner.linkedValidationItemIds || []).includes(valItem.id);
                      return (
                        <label
                          key={valItem.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/60 p-1 rounded text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={(e) => {
                              const current = editingRunner.linkedValidationItemIds || [];
                              const updated = e.target.checked
                                ? [...current, valItem.id]
                                : current.filter((id) => id !== valItem.id);
                              setEditingRunner({ ...editingRunner, linkedValidationItemIds: updated });
                            }}
                            className="rounded border-border text-primary focus:ring-0"
                          />
                          <span className="font-mono text-xs font-semibold text-foreground">
                            [{valItem.targetName}]
                          </span>
                          <span className="text-muted-foreground truncate">{valItem.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsEditorModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRunner}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
              >
                Salvar Runner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
