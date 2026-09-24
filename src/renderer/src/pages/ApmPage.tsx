import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Search,
  Copy,
  Check,
  Sparkles,
  X,
  ChevronRight,
  ChevronDown,
  Database,
  AlertCircle,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  LayoutDashboard,
  Clock,
  Filter
} from 'lucide-react';
import { ApmDashboardView } from '../components/ApmDashboardView';
import {
  TraceSummary,
  TraceDetails,
  TraceSpan,
  TraceSpanTreeNode,
  ObservabilityOverview,
  ApmFilter,
  DEFAULT_APM_OTLP_PORT
} from '../../../shared/types';
import { api } from '../services/apiBridge';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { showToast } from '../components/ToastHost';
import {
  FilterPreset,
  LatencyBracket,
  buildApmSetupSnippets,
  computeLatencySpectrum,
  computeTimeBudget,
  filterTraces,
  findNextTraceId,
  formatSpanErrorForClipboard,
  getMethodBadgeClass,
  getStatusBadgeClass,
  mergeLiveTraces,
  splitSqlTokens
} from '../utils/apmUiUtils';

interface ApmPageProps {
  isActive?: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToDatabase?: () => void;
}

type DetailTab = 'waterfall' | 'attributes' | 'sql' | 'error';

// Um lote do Java Agent (até 512 spans) gera uma notificação por trace; acumular por esse intervalo
// e aplicar tudo de uma vez evita re-renderizar a tabela centenas de vezes por lote.
const LIVE_TRACE_FLUSH_MS = 400;

export const ApmPage: React.FC<ApmPageProps> = ({ isActive = true, onNavigateToDatabase }) => {
  // Dados principais
  const [overview, setOverview] = useState<ObservabilityOverview | null>(null);
  const [rawTraces, setRawTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetails, setTraceDetails] = useState<TraceDetails | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // Modo de visualização: Dashboard de Métricas vs Traces Explorer
  const [viewMode, setViewMode] = useState<'dashboard' | 'traces'>('dashboard');

  // Estados de controle e captura
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [limit] = useState<number>(250);
  const [activePreset, setActivePreset] = useState<FilterPreset>('ALL');
  const [latencyBracket, setLatencyBracket] = useState<LatencyBracket>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [detailTab, setDetailTab] = useState<DetailTab>('waterfall');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [setupTab, setSetupTab] = useState<'karaf' | 'curl' | 'node'>('karaf');

  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(2000);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // Espelho síncrono do trace aberto, lido por respostas assíncronas e pela assinatura em tempo real
  const selectedTraceIdRef = useRef<string | null>(null);

  // Carregar lista de traces e overview do backend
  const refreshData = useCallback(async () => {
    if (!api?.getApmOverview || !api?.getApmTraces) return;

    try {
      const serviceName = selectedService !== 'ALL' ? selectedService : undefined;
      const filter: ApmFilter = {
        limit,
        serviceName,
        search: searchText.trim() || undefined,
        hasError: activePreset === 'ERRORS' ? true : undefined,
        minDurationMs: activePreset === 'SLOW' ? 1000 : undefined,
        hasDatabaseQuery: activePreset === 'DB' ? true : undefined
      };

      // O overview (faixa de métricas e dashboard) segue só o serviço: com o filtro "Erros" ativo,
      // a taxa de erro do cabeçalho viraria 100% e deixaria de descrever o tráfego real
      const [ov, tr] = await Promise.all([api.getApmOverview({ serviceName }), api.getApmTraces(filter)]);

      setOverview(ov);
      setRawTraces(tr);
    } catch (err) {
      console.warn('[ApmPage] Falha ao atualizar dados de telemetria:', err);
    }
  }, [limit, selectedService, searchText, activePreset]);

  // Polling em background quando a gravação estiver ativa
  useEffect(() => {
    if (!isActive) return;
    refreshData();

    if (!isRecording) return;
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [isActive, isRecording, refreshData]);

  // Carregar detalhes do trace selecionado
  const loadTraceDetails = useCallback(async (traceId: string, options?: { keepSelectedSpan?: boolean }) => {
    if (!api?.getApmTraceDetails) return;
    try {
      const details = await api.getApmTraceDetails(traceId);
      // Resposta atrasada de um trace que já foi fechado ou trocado (navegação rápida por teclado)
      if (selectedTraceIdRef.current !== traceId) return;
      setTraceDetails(details);
      if (!options?.keepSelectedSpan) {
        setSelectedSpanId(details?.rootTree[0]?.span.spanId ?? null);
      }
    } catch (err) {
      console.warn('[ApmPage] Erro ao carregar detalhes do trace:', err);
    }
  }, []);

  const openTrace = useCallback(
    (traceId: string) => {
      selectedTraceIdRef.current = traceId;
      setSelectedTraceId(traceId);
      loadTraceDetails(traceId);
    },
    [loadTraceDetails]
  );

  const closeTrace = useCallback(() => {
    selectedTraceIdRef.current = null;
    setSelectedTraceId(null);
    setTraceDetails(null);
    setSelectedSpanId(null);
  }, []);

  // Inscrição em tempo real para novos traces via WebSocket / IPC
  useEffect(() => {
    if (!isActive || !isRecording || !api?.onApmNewTrace) return;

    const pending = new Map<string, TraceSummary>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      const batch = Array.from(pending.values());
      pending.clear();
      setRawTraces((prev) => mergeLiveTraces(prev, batch, limit));

      // Spans atrasados (ex.: o raiz chega depois dos filhos) atualizam o trace que está aberto
      const openTraceId = selectedTraceIdRef.current;
      if (openTraceId && batch.some((t) => t.traceId === openTraceId)) {
        loadTraceDetails(openTraceId, { keepSelectedSpan: true });
      }
    };

    const unsubscribe = api.onApmNewTrace((newTrace) => {
      pending.set(newTrace.traceId, newTrace);
      if (!flushTimer) flushTimer = setTimeout(flush, LIVE_TRACE_FLUSH_MS);
    });

    return () => {
      unsubscribe?.();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [isActive, isRecording, limit, loadTraceDetails]);

  const handleSelectTrace = (traceId: string) => {
    if (selectedTraceId === traceId) {
      closeTrace();
    } else {
      openTrace(traceId);
    }
  };

  // Filtragem combinada client-side (busca, presets, bracket de latência e serviço)
  const displayedTraces = useMemo(() => {
    return filterTraces(rawTraces, {
      searchText,
      preset: activePreset,
      latencyBracket,
      selectedService
    });
  }, [rawTraces, searchText, activePreset, latencyBracket, selectedService]);

  // Atalhos de teclado (Up/Down/j/k navegam traces, '/' foca busca, 'Esc' fecha drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive =
        document.activeElement === searchInputRef.current ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (selectedTraceId) {
          closeTrace();
        } else if (isSetupModalOpen) {
          setIsSetupModalOpen(false);
        }
        return;
      }

      // Navegação por teclado nas linhas de traces
      if (!isInputActive && displayedTraces.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          const nextId = findNextTraceId(displayedTraces, selectedTraceId, 'next');
          if (nextId && nextId !== selectedTraceId) {
            openTrace(nextId);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          const prevId = findNextTraceId(displayedTraces, selectedTraceId, 'prev');
          if (prevId && prevId !== selectedTraceId) {
            openTrace(prevId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTraceId, isSetupModalOpen, displayedTraces, openTrace, closeTrace]);

  // Gerar dados demo
  const handleGenerateDemo = async () => {
    if (!api?.generateApmDemo) return;
    try {
      const res = await api.generateApmDemo();
      showToast(`${res.generatedTraces} requisições de demonstração simuladas com sucesso!`, 'success');
      refreshData();
    } catch {
      showToast('Falha ao simular requisições de demonstração.', 'error');
    }
  };

  // Limpar buffer
  const handleClear = async () => {
    if (!api?.clearApmTraces) return;
    try {
      await api.clearApmTraces();
      setRawTraces([]);
      closeTrace();
      showToast('Buffer de telemetria limpo.', 'info');
      refreshData();
    } catch {
      showToast('Falha ao limpar buffer.', 'error');
    }
  };

  // Span atualmente inspecionado no drawer (padrão: o span raiz do waterfall)
  const activeSpan = useMemo<TraceSpan | null>(() => {
    if (!traceDetails?.spans) return null;
    if (selectedSpanId) {
      const found = traceDetails.spans.find((s) => s.spanId === selectedSpanId);
      if (found) return found;
    }
    return traceDetails.rootTree[0]?.span || traceDetails.spans[0] || null;
  }, [traceDetails, selectedSpanId]);

  // Spans com erro, os que trazem exceção/stacktrace primeiro: costumam ser a causa raiz
  // (ex.: SQLException no span JDBC), enquanto o span HTTP só informa o 500
  const errorSpans = useMemo<TraceSpan[]>(() => {
    if (!traceDetails?.spans) return [];
    const withError = traceDetails.spans.filter((s) => s.statusCode === 'ERROR' || !!s.statusMessage || !!s.exception);
    return [...withError].sort((a, b) => Number(!!b.exception) - Number(!!a.exception));
  }, [traceDetails]);

  const hasSqlTab = !!traceDetails?.spans.some((s) => !!s.dbStatement);
  const hasErrorTab = !!traceDetails?.summary.hasError || errorSpans.length > 0;
  // Ao trocar de trace, uma aba que não existe no novo trace (SQL/Erro) volta para o waterfall
  const visibleDetailTab: DetailTab =
    (detailTab === 'sql' && !hasSqlTab) || (detailTab === 'error' && !hasErrorTab) ? 'waterfall' : detailTab;

  const receiverPort = overview?.receiverStatus.port || DEFAULT_APM_OTLP_PORT;
  const setupSnippets = useMemo(() => buildApmSetupSnippets(receiverPort), [receiverPort]);

  // Duração máxima na lista atual para cálculo da microbarra proporcional
  const maxListDuration = useMemo(() => {
    if (displayedTraces.length === 0) return 100;
    return Math.max(...displayedTraces.map((t) => t.durationMs), 10);
  }, [displayedTraces]);

  // Espectro de distribuição de latência (Signature: Micro-Histograma interativo)
  const latencySpectrum = useMemo(() => {
    return computeLatencySpectrum(rawTraces);
  }, [rawTraces]);

  // Análise de Orçamento de Tempo (Time Budget) do Trace Selecionado
  const timeBudget = useMemo(() => {
    return computeTimeBudget(traceDetails);
  }, [traceDetails]);

  // Lista de serviços únicos para dropdown
  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    if (overview?.services) {
      overview.services.forEach((s) => set.add(s.serviceName));
    }
    rawTraces.forEach((t) => {
      if (t.serviceName) set.add(t.serviceName);
    });
    return Array.from(set);
  }, [overview, rawTraces]);

  // Alterna filtro de espectro de latência ao clicar no gráfico ou chips
  const toggleLatencyBracket = (bracket: LatencyBracket) => {
    setLatencyBracket((prev) => (prev === bracket ? 'ALL' : bracket));
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      {/* 1. Faixa de Comando e Telemetria Integrada (Compact Telemetry Ribbon - h-11) */}
      <header className="h-11 px-3 border-b border-border bg-card/75 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0 text-xs">
        {/* Lado Esquerdo: Status do Receptor & Métricas Chave */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {/* Status OTLP */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono shrink-0 ${
              overview?.receiverStatus.listening
                ? 'bg-emerald-500/15 dark:bg-emerald-950/30 border-emerald-500/30 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/15 dark:bg-rose-950/30 border-rose-500/30 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
            }`}
            title={
              overview?.receiverStatus.listening
                ? `Receptor OpenTelemetry (OTLP/HTTP) escutando em :${overview.receiverStatus.port}`
                : `Receptor OTLP inativo: ${overview?.receiverStatus.error || 'Porta ocupada'}`
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                overview?.receiverStatus.listening ? 'bg-emerald-500 dark:bg-emerald-400 radar-live' : 'bg-rose-500 dark:bg-rose-400'
              }`}
            />
            <span className="font-semibold">:{receiverPort}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-sans font-medium">OTLP</span>
          </div>

          <div className="h-4 w-[1px] bg-border shrink-0" />

          {/* Chips de Métricas Essenciais */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] shrink-0 tabular-nums">
            <span className="text-muted-foreground">
              RPS:{' '}
              <strong className="text-foreground">{overview?.requestsPerSecond.toFixed(1) || '0.0'}</strong>
            </span>
            <span className="text-border">•</span>
            <span className="text-muted-foreground">
              p95:{' '}
              <strong
                className={
                  (overview?.p95LatencyMs || 0) > 1000
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : (overview?.p95LatencyMs || 0) > 400
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {Math.round(overview?.p95LatencyMs || 0)}ms
              </strong>
            </span>
            <span className="text-border">•</span>
            <span className="text-muted-foreground">
              Erros:{' '}
              <strong
                className={
                  (overview?.errorRate || 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {overview?.errorRate || 0}%
              </strong>
            </span>
            <span className="text-border">•</span>
            <span
              className="text-muted-foreground"
              title={
                overview?.receiverStatus.droppedSpans
                  ? `${overview.receiverStatus.droppedSpans} spans descartados por exceder o limite de spans por trace`
                  : 'Traces mantidos em memória (os mais antigos são descartados ao atingir o limite)'
              }
            >
              Buffer:{' '}
              <strong className="text-foreground">
                {overview?.receiverStatus.bufferSize ?? rawTraces.length} / {overview?.receiverStatus.maxBufferSize || 5000}
              </strong>
              {!!overview?.receiverStatus.droppedSpans && (
                <strong className="ml-1 text-amber-600 dark:text-amber-400">
                  (−{overview.receiverStatus.droppedSpans} spans)
                </strong>
              )}
            </span>
          </div>
        </div>

        {/* Centro: Alternador de Visualização (Dashboard vs Traces Explorer) */}
        <div className="flex items-center p-0.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-800/60 border border-border/50 text-[11px] font-medium shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'dashboard'
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sky-500" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('traces')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'traces'
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Traces Explorer</span>
            {rawTraces.length > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-muted text-muted-foreground">
                {rawTraces.length}
              </span>
            )}
          </button>
        </div>

        {/* Lado Direito: Ações & Gravação */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dica de navegação por teclado */}
          <div className="hidden 2xl:flex items-center gap-1 text-[10px] text-muted-foreground/70 font-mono">
            <span className="px-1 py-0.5 rounded bg-muted/60 border border-border/60">↑/↓</span>
            <span>navegar</span>
            <span className="px-1 py-0.5 rounded bg-muted/60 border border-border/60 ml-1">/</span>
            <span>buscar</span>
          </div>

          {/* Botão de Gravação ao Vivo */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            title={isRecording ? 'Pausar captura em tempo real' : 'Retomar captura em tempo real'}
            className={`h-7 px-2.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isRecording
                ? 'bg-rose-500/15 dark:bg-rose-950/40 border-rose-500/30 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 dark:hover:bg-rose-900/40'
                : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {isRecording ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-ping" />
                <Pause className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Gravar</span>
              </>
            )}
          </button>

          {/* Botão Simular Tráfego */}
          <button
            type="button"
            onClick={handleGenerateDemo}
            title="Simula requisições das APIs do WinThor, consultas Oracle e falhas para teste"
            className="h-7 px-2.5 rounded border border-border bg-card hover:bg-muted text-foreground text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">Simular Tráfego</span>
          </button>

          {/* Limpar */}
          <button
            type="button"
            onClick={handleClear}
            title="Limpar todos os traces coletados em memória"
            className="h-7 px-2 rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-rose-400 cursor-pointer transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Botão Como Conectar */}
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            title="Instruções para conectar o Karaf ou outras aplicações no receptor OpenTelemetry"
            className="h-7 px-2.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <Terminal className="w-3 h-3" />
            <span>Como Conectar</span>
          </button>
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <ApmDashboardView
          overview={overview}
          onFilterByEndpoint={(route) => {
            setSearchText(route);
            setViewMode('traces');
          }}
          onSelectTrace={(traceId) => {
            openTrace(traceId);
            setViewMode('traces');
          }}
          onNavigateToDatabase={onNavigateToDatabase}
          onGenerateDemo={handleGenerateDemo}
        />
      ) : (
        <>
          {/* 2. Barra de Filtros, Espectro de Latência Interativo e Busca Rápida (h-10) */}
          <div className="h-10 px-3 border-b border-border bg-card/40 flex items-center justify-between gap-3 shrink-0 text-xs">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filtrar rota, traceId ou serviço... (Pressione /)"
            className="w-full h-7 pl-8 pr-7 bg-background/90 border border-border rounded text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary transition"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Pílulas de Filtro Rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActivePreset('ALL');
              setLatencyBracket('ALL');
            }}
            className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
              activePreset === 'ALL' && latencyBracket === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({rawTraces.length})
          </button>

          <button
            type="button"
            onClick={() => setActivePreset((prev) => (prev === 'ERRORS' ? 'ALL' : 'ERRORS'))}
            className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
              activePreset === 'ERRORS'
                ? 'bg-rose-500/20 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-400 dark:border-rose-700 font-semibold shadow-xs'
                : 'bg-card border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            Erros
          </button>

          <button
            type="button"
            onClick={() => setActivePreset((prev) => (prev === 'SLOW' ? 'ALL' : 'SLOW'))}
            className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
              activePreset === 'SLOW'
                ? 'bg-amber-500/20 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-400 dark:border-amber-700 font-semibold shadow-xs'
                : 'bg-card border-border text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            Lentos (&gt;1s)
          </button>

          <button
            type="button"
            onClick={() => setActivePreset((prev) => (prev === 'DB' ? 'ALL' : 'DB'))}
            className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
              activePreset === 'DB'
                ? 'bg-sky-500/20 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-400 dark:border-sky-700 font-semibold shadow-xs'
                : 'bg-card border-border text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400'
            }`}
          >
            Com SQL
          </button>
        </div>

        {/* Espectro de Latência Interativo (Signature Element) */}
        <div
          className={`hidden xl:flex items-center gap-2 px-2.5 py-0.5 rounded border text-[11px] font-mono shrink-0 transition ${
            latencyBracket !== 'ALL'
              ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40'
              : 'bg-muted/20 border-border/60 text-muted-foreground'
          }`}
          title="Clique em uma faixa de latência para filtrar a tabela"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
            <Filter className="w-2.5 h-2.5" />
            <span>Espectro:</span>
          </span>

          {/* Micro-Histograma Interativo */}
          <div className="w-28 h-2.5 rounded-full bg-muted/60 overflow-hidden flex cursor-pointer p-[1px] gap-0.5">
            <div
              style={{ width: `${Math.max(4, latencySpectrum.fastPct)}%` }}
              onClick={() => toggleLatencyBracket('FAST')}
              className={`h-full rounded-xs transition-all ${
                latencyBracket === 'FAST' ? 'bg-emerald-400 ring-2 ring-emerald-300' : 'bg-emerald-500/80 hover:bg-emerald-400'
              }`}
              title={`< 100ms: ${latencySpectrum.fast} (${latencySpectrum.fastPct.toFixed(0)}%) - Clique para filtrar`}
            />
            <div
              style={{ width: `${Math.max(4, latencySpectrum.normalPct)}%` }}
              onClick={() => toggleLatencyBracket('NORMAL')}
              className={`h-full rounded-xs transition-all ${
                latencyBracket === 'NORMAL' ? 'bg-sky-400 ring-2 ring-sky-300' : 'bg-sky-500/80 hover:bg-sky-400'
              }`}
              title={`100 - 400ms: ${latencySpectrum.normal} (${latencySpectrum.normalPct.toFixed(0)}%) - Clique para filtrar`}
            />
            <div
              style={{ width: `${Math.max(4, latencySpectrum.slowPct)}%` }}
              onClick={() => toggleLatencyBracket('SLOW')}
              className={`h-full rounded-xs transition-all ${
                latencyBracket === 'SLOW' ? 'bg-amber-400 ring-2 ring-amber-300' : 'bg-amber-500/80 hover:bg-amber-400'
              }`}
              title={`400 - 1000ms: ${latencySpectrum.slow} (${latencySpectrum.slowPct.toFixed(0)}%) - Clique para filtrar`}
            />
            <div
              style={{ width: `${Math.max(4, latencySpectrum.criticalPct)}%` }}
              onClick={() => toggleLatencyBracket('CRITICAL')}
              className={`h-full rounded-xs transition-all ${
                latencyBracket === 'CRITICAL' ? 'bg-rose-400 ring-2 ring-rose-300' : 'bg-rose-500/80 hover:bg-rose-400'
              }`}
              title={`> 1000ms: ${latencySpectrum.critical} (${latencySpectrum.criticalPct.toFixed(0)}%) - Clique para filtrar`}
            />
          </div>

          {/* Chips clicáveis do espectro */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => toggleLatencyBracket('FAST')}
              className={`px-1 rounded cursor-pointer transition ${
                latencyBracket === 'FAST'
                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/50'
                  : 'text-emerald-700 dark:text-emerald-400 hover:underline'
              }`}
              title="Filtrar < 100ms"
            >
              {latencySpectrum.fast}
            </button>
            <span className="text-border">/</span>
            <button
              type="button"
              onClick={() => toggleLatencyBracket('NORMAL')}
              className={`px-1 rounded cursor-pointer transition ${
                latencyBracket === 'NORMAL'
                  ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300 font-bold border border-sky-500/50'
                  : 'text-sky-700 dark:text-sky-400 hover:underline'
              }`}
              title="Filtrar 100 - 400ms"
            >
              {latencySpectrum.normal}
            </button>
            <span className="text-border">/</span>
            <button
              type="button"
              onClick={() => toggleLatencyBracket('SLOW')}
              className={`px-1 rounded cursor-pointer transition ${
                latencyBracket === 'SLOW'
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/50'
                  : 'text-amber-700 dark:text-amber-400 hover:underline'
              }`}
              title="Filtrar 400 - 1000ms"
            >
              {latencySpectrum.slow}
            </button>
            <span className="text-border">/</span>
            <button
              type="button"
              onClick={() => toggleLatencyBracket('CRITICAL')}
              className={`px-1 rounded cursor-pointer transition ${
                latencyBracket === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-500/50'
                  : 'text-rose-700 dark:text-rose-400 font-bold hover:underline'
              }`}
              title="Filtrar > 1000ms"
            >
              {latencySpectrum.critical}
            </button>
            {latencyBracket !== 'ALL' && (
              <button
                type="button"
                onClick={() => setLatencyBracket('ALL')}
                className="ml-1 text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Dropdown de Serviço */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden md:inline">Serviço:</span>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="h-7 px-2 bg-background border border-border rounded text-[11px] font-mono text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
          >
            <option value="ALL">Todos os Serviços</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Área Principal: Master-Detail (Tabela de Traces + Split Drawer de Análise) */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Painel Esquerdo: Tabela de Traces de Alta Densidade */}
        <section
          aria-label="Lista de Traces"
          className={`h-full flex flex-col overflow-hidden transition-all duration-200 ${
            selectedTraceId ? 'w-[56%] border-r border-border' : 'w-full'
          }`}
        >
          <div className="flex-1 overflow-auto">
            {displayedTraces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
                  <Activity className="w-7 h-7 radar-live" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  {rawTraces.length === 0 ? 'Aguardando telemetria OpenTelemetry' : 'Nenhum trace para os filtros aplicados'}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {rawTraces.length === 0 ? (
                    <>
                      Envie spans OTLP/HTTP para{' '}
                      <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono text-[11px]">
                        {setupSnippets.tracesUrl}
                      </code>
                    </>
                  ) : (
                    'Tente remover o filtro de busca ou alterar o espectro de latência para visualizar outros traces.'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateDemo}
                    className="h-8 px-3.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simular Tráfego</span>
                  </button>
                  {rawTraces.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsSetupModalOpen(true)}
                      className="h-8 px-3 rounded border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition cursor-pointer"
                    >
                      Instruções de Conexão
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText('');
                        setActivePreset('ALL');
                        setLatencyBracket('ALL');
                        setSelectedService('ALL');
                      }}
                      className="h-8 px-3 rounded border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition cursor-pointer"
                    >
                      Resetar Filtros
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                <thead className="sticky top-0 z-10 bg-card border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-16 text-center">Status</th>
                    <th className="py-2 px-2.5 w-16">Método</th>
                    <th className="py-2 px-3">Rota / Endpoint</th>
                    <th className="py-2 px-2.5 w-28 hidden lg:table-cell">Serviço</th>
                    <th className="py-2 px-3 w-36">Duração</th>
                    <th className="py-2 px-2.5 w-16 text-center hidden md:table-cell">Spans</th>
                    <th className="py-2 px-3 w-24 text-right">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {displayedTraces.map((trace) => {
                    const isSelected = trace.traceId === selectedTraceId;
                    const durationRatio = Math.max(2, Math.min(100, (trace.durationMs / maxListDuration) * 100));

                    return (
                      <tr
                        key={trace.traceId}
                        onClick={() => handleSelectTrace(trace.traceId)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 hover:bg-primary/20'
                            : trace.hasError
                            ? 'bg-rose-500/10 hover:bg-rose-500/15'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        {/* Status Code */}
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${getStatusBadgeClass(
                              trace.httpStatusCode,
                              trace.hasError
                            )}`}
                          >
                            {trace.httpStatusCode || (trace.hasError ? 'ERR' : 'OK')}
                          </span>
                        </td>

                        {/* Método HTTP */}
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${getMethodBadgeClass(
                              trace.httpMethod
                            )}`}
                          >
                            {trace.httpMethod || 'HTTP'}
                          </span>
                        </td>

                        {/* Rota / Nome */}
                        <td className="py-1.5 px-3 truncate max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">
                              {trace.httpRoute || trace.rootSpanName}
                            </span>
                            {trace.hasDatabaseQuery && (
                              <span
                                className="px-1 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:bg-sky-950/50 dark:border-sky-800/60 dark:text-sky-400 text-[9px] font-bold shrink-0"
                                title="Executa consultas no banco de dados (Oracle/Postgres)"
                              >
                                SQL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Serviço */}
                        <td className="py-1.5 px-2.5 text-muted-foreground truncate hidden lg:table-cell text-[11px]">
                          {trace.serviceName}
                        </td>

                        {/* Duração + Microbarra */}
                        <td className="py-1.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-[11px] font-medium leading-none ${
                                trace.durationMs > 1000
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : trace.durationMs > 400
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-foreground'
                              }`}
                            >
                              {trace.durationMs >= 1000
                                ? `${(trace.durationMs / 1000).toFixed(2)}s`
                                : `${trace.durationMs}ms`}
                            </span>
                            <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${durationRatio}%` }}
                                className={`h-full rounded-full ${
                                  trace.hasError
                                    ? 'bg-rose-500'
                                    : trace.durationMs > 1000
                                    ? 'bg-amber-500'
                                    : 'bg-primary'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Qtd Spans */}
                        <td className="py-1.5 px-2.5 text-center text-muted-foreground hidden md:table-cell text-[11px]">
                          {trace.spanCount}
                        </td>

                        {/* Horário */}
                        <td className="py-1.5 px-3 text-right text-muted-foreground text-[11px]">
                          {new Date(trace.startTimeUnixMs).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 4. Split Drawer (Slide-Over de Inspeção de Trace & Waterfall) */}
        {selectedTraceId && (
          <aside
            aria-label="Inspeção de Trace"
            className="w-[44%] h-full flex flex-col bg-card/95 backdrop-blur-xs border-l border-border shadow-2xl z-20 overflow-hidden animate-in slide-in-from-right duration-200"
          >
            {/* Header do Drawer */}
            <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${getMethodBadgeClass(
                    traceDetails?.summary.httpMethod
                  )}`}
                >
                  {traceDetails?.summary.httpMethod || 'HTTP'}
                </span>
                <span className="font-mono text-xs font-bold text-foreground truncate">
                  {traceDetails?.summary.httpRoute || traceDetails?.summary.rootSpanName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (traceDetails?.summary.traceId) {
                      copyToClipboard(traceDetails.summary.traceId, 'traceId');
                    }
                  }}
                  title="Copiar Trace ID"
                  className="h-6 px-2 rounded border border-border bg-card hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  {copyFeedback === 'traceId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>ID</span>
                </button>

                <button
                  type="button"
                  onClick={closeTrace}
                  title="Fechar painel (Esc)"
                  className="h-6 w-6 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metadados rápidos em faixa */}
            <div className="px-3.5 py-1.5 border-b border-border/60 bg-background/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
              <div className="flex items-center gap-3">
                <span>
                  Status:{' '}
                  <strong className={getStatusBadgeClass(traceDetails?.summary.httpStatusCode, traceDetails?.summary.hasError)}>
                    {traceDetails?.summary.httpStatusCode || (traceDetails?.summary.hasError ? 'ERR' : 'OK')}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Duração:{' '}
                  <strong className="text-foreground">{traceDetails?.summary.durationMs}ms</strong>
                </span>
                <span>•</span>
                <span>
                  Serviço:{' '}
                  <strong className="text-primary">{traceDetails?.summary.serviceName}</strong>
                </span>
              </div>
              <span>{traceDetails?.spans.length || 0} spans</span>
            </div>

            {/* Análise de Orçamento de Tempo (Time Budget Breakdown) */}
            {timeBudget && (
              <div className="px-3.5 py-2.5 border-b border-border bg-muted/20 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Time Budget (Alocação de Tempo)</span>
                  </span>
                  <div className="flex items-center gap-2 text-[10px] tabular-nums">
                    <span className="text-sky-700 dark:text-sky-400 font-semibold">Oracle DB: {timeBudget.dbPct}% ({timeBudget.dbMs}ms)</span>
                    <span>•</span>
                    <span className="text-purple-700 dark:text-purple-400 font-semibold">App / OSGi: {timeBudget.appPct}%</span>
                    {timeBudget.clientPct > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">HTTP Ext: {timeBudget.clientPct}%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Barra Segmentada de Tempo */}
                <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${timeBudget.dbPct}%` }}
                    className="bg-sky-500 h-full transition-all"
                    title={`Queries Banco: ${timeBudget.dbMs}ms (${timeBudget.dbPct}%)`}
                  />
                  <div
                    style={{ width: `${timeBudget.appPct}%` }}
                    className="bg-purple-500 h-full transition-all"
                    title={`Processamento Interno: ${timeBudget.appPct}%`}
                  />
                  {timeBudget.clientPct > 0 && (
                    <div
                      style={{ width: `${timeBudget.clientPct}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Chamadas Externas: ${timeBudget.clientPct}%`}
                    />
                  )}
                </div>

                {/* Insight Automático de Gargalo */}
                {timeBudget.hasDbBottleneck && (
                  <div className="px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-[11px] font-mono text-sky-800 dark:bg-sky-950/30 dark:border-sky-800/40 dark:text-sky-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>Gargalo: <strong>{timeBudget.dbPct}%</strong> do tempo consumido no banco de dados</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailTab('sql')}
                      className="text-xs text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-200 underline font-bold cursor-pointer"
                    >
                      Inspecionar SQL &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Abas do Drawer */}
            <div className="h-8 px-3 border-b border-border flex items-center gap-1 shrink-0 bg-card/40">
              <button
                type="button"
                onClick={() => setDetailTab('waterfall')}
                className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  visibleDetailTab === 'waterfall'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Waterfall ({traceDetails?.spans.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('attributes')}
                className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  visibleDetailTab === 'attributes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Atributos</span>
              </button>

              {hasSqlTab && (
                <button
                  type="button"
                  onClick={() => setDetailTab('sql')}
                  className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    visibleDetailTab === 'sql'
                      ? 'border-sky-500 text-sky-700 dark:border-sky-400 dark:text-sky-400 font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>Queries SQL</span>
                </button>
              )}

              {hasErrorTab && (
                <button
                  type="button"
                  onClick={() => setDetailTab('error')}
                  className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    visibleDetailTab === 'error'
                      ? 'border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-400 font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Erro / Stacktrace</span>
                </button>
              )}
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="flex-1 overflow-auto p-3">
              {/* ABA 1: WATERFALL (Cascata Temporal com Régua Milimétrica e Árvore Conectada) */}
              {visibleDetailTab === 'waterfall' && (
                <div className="flex flex-col gap-2">
                  {/* Régua Milimétrica no Topo */}
                  <div className="px-2 py-1 bg-muted/40 rounded border border-border font-mono text-[10px] text-muted-foreground flex justify-between select-none tabular-nums">
                    <span>0ms</span>
                    <span>{Math.round((traceDetails?.summary.durationMs || 100) * 0.25)}ms</span>
                    <span>{Math.round((traceDetails?.summary.durationMs || 100) * 0.5)}ms</span>
                    <span>{Math.round((traceDetails?.summary.durationMs || 100) * 0.75)}ms</span>
                    <span>{traceDetails?.summary.durationMs}ms</span>
                  </div>

                  {/* Lista de Spans Hierárquicos com Conectores de Árvore */}
                  <div className="flex flex-col gap-0.5">
                    {traceDetails?.rootTree.map((node) => (
                      <WaterfallNode
                        key={node.span.spanId}
                        node={node}
                        selectedSpanId={selectedSpanId}
                        onSelectSpan={(spanId) => setSelectedSpanId(spanId)}
                      />
                    ))}
                  </div>

                  {/* Detalhes do Span Ativo selecionado na árvore */}
                  {activeSpan && (
                    <div className="mt-3 p-3 rounded-lg border border-border bg-card flex flex-col gap-2 font-mono text-xs shadow-xs">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{activeSpan.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                            {activeSpan.kind}
                          </span>
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${
                            activeSpan.durationMs > 1000
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {activeSpan.durationMs}ms
                        </span>
                      </div>

                      {activeSpan.dbStatement && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1">
                              <Database className="w-3 h-3 text-sky-600 dark:text-sky-400" /> SQL ({activeSpan.dbSystem || 'oracle'})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(activeSpan.dbStatement!, 'spanSql')}
                                className="text-[10px] hover:text-foreground cursor-pointer flex items-center gap-1"
                              >
                                {copyFeedback === 'spanSql' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                Copiar SQL
                              </button>
                              {onNavigateToDatabase && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(activeSpan.dbStatement!, 'toDb');
                                    onNavigateToDatabase();
                                  }}
                                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  DB Studio
                                </button>
                              )}
                            </div>
                          </div>
                          <pre className="p-2.5 rounded bg-background border border-border text-foreground text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {splitSqlTokens(activeSpan.dbStatement).map((tok, i) => (
                              <span key={i} className={tok.isKeyword ? 'text-sky-700 dark:text-sky-400 font-bold' : 'text-foreground'}>
                                {tok.text}
                              </span>
                            ))}
                          </pre>
                        </div>
                      )}

                      {(activeSpan.statusMessage || activeSpan.exception) && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300 text-[11px] flex items-start justify-between gap-2">
                          <span className="break-words min-w-0">
                            <strong>Erro:</strong>{' '}
                            {activeSpan.statusMessage ||
                              [activeSpan.exception?.type, activeSpan.exception?.message].filter(Boolean).join(': ')}
                          </span>
                          {activeSpan.exception?.stacktrace && (
                            <button
                              type="button"
                              onClick={() => setDetailTab('error')}
                              className="shrink-0 underline font-bold cursor-pointer hover:text-rose-950 dark:hover:text-rose-100"
                            >
                              Stacktrace &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: ATRIBUTOS (do span selecionado no waterfall) */}
              {visibleDetailTab === 'attributes' && (
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between gap-2">
                    <span className="truncate">
                      Span <strong className="text-foreground">{activeSpan?.name}</strong>
                      {activeSpan && <span className="ml-1">({activeSpan.kind})</span>}
                    </span>
                    <span className="shrink-0 text-[10px]">Selecione outro span no Waterfall</span>
                  </div>
                  {activeSpan && Object.keys(activeSpan.attributes).length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border/50 bg-card">
                      {Object.entries(activeSpan.attributes).map(([key, val]) => (
                        <div key={key} className="p-2 flex items-start justify-between gap-3 text-[11px]">
                          <span className="text-muted-foreground shrink-0 select-text">{key}</span>
                          <span className="text-foreground text-right break-all font-semibold select-text">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Este span não possui atributos.</p>
                  )}
                </div>
              )}

              {/* ABA 3: QUERIES SQL */}
              {visibleDetailTab === 'sql' && (
                <div className="flex flex-col gap-3 font-mono text-xs">
                  {traceDetails?.spans
                    .filter((s) => !!s.dbStatement)
                    .map((s, idx) => (
                      <div key={s.spanId} className="p-3 rounded-lg border border-border bg-card flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Query #{idx + 1} ({s.durationMs}ms)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(s.dbStatement!, `sql-${s.spanId}`)}
                              className="px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-[10px] text-foreground cursor-pointer flex items-center gap-1"
                            >
                              {copyFeedback === `sql-${s.spanId}` ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              Copiar SQL
                            </button>
                            {onNavigateToDatabase && (
                              <button
                                type="button"
                                onClick={() => {
                                  copyToClipboard(s.dbStatement!, 'toDb');
                                  onNavigateToDatabase();
                                }}
                                className="px-2 py-0.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-[10px] text-primary cursor-pointer flex items-center gap-1 font-semibold"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Abrir no DB Studio
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-2.5 rounded bg-background border border-border text-foreground text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {splitSqlTokens(s.dbStatement!).map((tok, i) => (
                            <span key={i} className={tok.isKeyword ? 'text-sky-700 dark:text-sky-400 font-bold' : 'text-foreground'}>
                              {tok.text}
                            </span>
                          ))}
                        </pre>
                      </div>
                    ))}
                </div>
              )}

              {/* ABA 4: ERROS / STACKTRACE */}
              {visibleDetailTab === 'error' && (
                <div className="flex flex-col gap-3 font-mono text-xs">
                  {errorSpans.map((s) => {
                    const exceptionHeadline = [s.exception?.type, s.exception?.message].filter(Boolean).join(': ');
                    return (
                      <div key={s.spanId} className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 dark:border-rose-800/60 dark:bg-rose-950/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-rose-800 dark:text-rose-300 font-bold">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="truncate" title={s.name}>
                              {s.name}
                            </span>
                            <span className="px-1 rounded bg-rose-500/15 text-[9px] font-semibold shrink-0">{s.kind}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(formatSpanErrorForClipboard(s), `err-${s.spanId}`)}
                            className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/15 text-[10px] text-rose-700 hover:bg-rose-500/25 dark:border-rose-800/80 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60 cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            {copyFeedback === `err-${s.spanId}` ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copiar Erro
                          </button>
                        </div>

                        {(exceptionHeadline || s.statusMessage) && (
                          <div className="text-[11px] text-rose-800 dark:text-rose-300 break-words select-text">
                            {exceptionHeadline || s.statusMessage}
                          </div>
                        )}

                        {s.exception?.stacktrace ? (
                          <pre className="p-2.5 rounded bg-card border border-rose-500/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[10.5px] overflow-auto max-h-80 whitespace-pre leading-relaxed select-text">
                            {s.exception.stacktrace}
                          </pre>
                        ) : (
                          !exceptionHeadline &&
                          !s.statusMessage && (
                            <pre className="p-2.5 rounded bg-card border border-rose-500/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                              {s.httpStatusCode ? `HTTP ${s.httpStatusCode} sem mensagem de erro` : 'Erro sem mensagem explícita'}
                            </pre>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </>
  )}

      {/* MODAL: COMO CONECTAR NO RECEPTOR OPENTELEMETRY */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Como Conectar no Receptor OpenTelemetry (APM)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 font-mono text-xs">
              <p className="text-muted-foreground leading-relaxed font-sans text-xs">
                O Dev Manager escuta traces padrão <strong>OpenTelemetry (OTLP/HTTP, JSON ou Protobuf)</strong> na porta{' '}
                <code className="text-primary font-bold">{receiverPort}</code>. Qualquer aplicação instrumentada envia
                seus spans automaticamente — métricas e logs OTLP não são coletados.
              </p>

              {overview && !overview.receiverStatus.listening && (
                <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300 font-sans text-xs leading-relaxed">
                  <strong>Receptor inativo:</strong> {overview.receiverStatus.error || 'não foi possível abrir a porta'}.
                  Se outro coletor OpenTelemetry (OTel Collector, Jaeger, SigNoz) estiver usando a porta, encerre-o e
                  reinicie o Dev Manager.
                </div>
              )}

              {/* Tabs de Conexão */}
              <div className="flex items-center gap-1 border-b border-border pb-1">
                <button
                  type="button"
                  onClick={() => setSetupTab('karaf')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'karaf' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Karaf / WinThor (Java)
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('curl')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'curl' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  cURL (Teste Rápido)
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('node')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'node' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Node.js / Express
                </button>
              </div>

              {/* Guia Karaf */}
              {setupTab === 'karaf' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Basta colocar o arquivo <code className="text-foreground font-mono">opentelemetry-javaagent.jar</code> dentro da pasta <code className="text-foreground font-mono">bin</code> do seu Karaf — o Dev Manager detecta e anexa automaticamente ao iniciar pelo Cockpit! Para scripts externos (<code className="text-foreground font-mono">winthor.bat</code>), use:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {setupSnippets.karafDisplay}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupSnippets.karafCopy, 'karafCmd')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 cursor-pointer flex items-center gap-1"
                    >
                      {copyFeedback === 'karafCmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Guia cURL */}
              {setupTab === 'curl' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Teste o envio de um span diretamente via linha de comando:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-sky-300 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {setupSnippets.curlDisplay}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupSnippets.curlCopy, 'curlCmd')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 cursor-pointer flex items-center gap-1"
                    >
                      {copyFeedback === 'curlCmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Guia Node */}
              {setupTab === 'node' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Com a biblioteca oficial <code className="text-foreground">@opentelemetry/sdk-node</code>:
                  </p>
                  <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-300 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {setupSnippets.nodeDisplay}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(false)}
                className="h-8 px-4 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente recursivo para renderização do nó de waterfall com guias visuais
interface WaterfallNodeProps {
  node: TraceSpanTreeNode;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

const WaterfallNode: React.FC<WaterfallNodeProps> = ({ node, selectedSpanId, onSelectSpan }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { span, depth, offsetPercent, widthPercent, children } = node;
  const isSelected = selectedSpanId === span.spanId;

  const hasChildren = children && children.length > 0;

  // Cor da barra de tempo do waterfall
  const getBarColor = () => {
    if (span.statusCode === 'ERROR' || (span.httpStatusCode && span.httpStatusCode >= 500)) {
      return 'bg-rose-500';
    }
    if (span.dbStatement) {
      return 'bg-sky-500';
    }
    if (span.kind === 'INTERNAL') {
      return 'bg-purple-500/80';
    }
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-col">
      <div
        onClick={() => onSelectSpan(span.spanId)}
        className={`group py-1 px-2 rounded flex items-center justify-between text-xs font-mono transition cursor-pointer ${
          isSelected ? 'bg-primary/20 border border-primary/50' : 'hover:bg-muted/40'
        }`}
      >
        {/* Identificação do Span (Indentada por depth com guia de árvore) */}
        <div
          className="flex items-center gap-1.5 truncate max-w-[50%]"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {depth > 0 && (
            <span className="text-border shrink-0 font-mono text-[10px]">└</span>
          )}

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-4 h-4 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {span.dbStatement ? (
            <Database className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                span.statusCode === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          )}

          <span className="truncate text-foreground font-medium text-[11px]" title={span.name}>
            {span.name}
          </span>
        </div>

        {/* Régua e Barra Proporcional de Tempo */}
        <div className="w-[48%] h-4 bg-muted/20 rounded relative flex items-center overflow-hidden">
          <div
            style={{
              left: `${offsetPercent}%`,
              width: `${Math.max(2, widthPercent)}%`
            }}
            className={`h-2.5 rounded absolute transition-all ${getBarColor()}`}
            title={`${span.name}: ${span.durationMs}ms (início: +${offsetPercent}%)`}
          />
          <span className="absolute right-1 text-[10px] font-mono text-foreground/80 dark:text-muted-foreground tabular-nums">
            {span.durationMs}ms
          </span>
        </div>
      </div>

      {/* Filhos recursivos com linha guia vertical */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col border-l border-border/30 ml-3 pl-1">
          {children.map((child) => (
            <WaterfallNode
              key={child.span.spanId}
              node={child}
              selectedSpanId={selectedSpanId}
              onSelectSpan={onSelectSpan}
            />
          ))}
        </div>
      )}
    </div>
  );
};
