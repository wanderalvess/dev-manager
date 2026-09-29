import React, { useState, useMemo } from 'react';
import {
  Activity,
  Clock,
  AlertCircle,
  Database,
  ArrowRight,
  Flame,
  Sparkles,
  TrendingUp,
  Server,
  Terminal,
  Copy,
  Check,
  Zap,
  Search
} from 'lucide-react';
import {
  ObservabilityOverview,
  SlowQueryMetricsSummary,
  EndpointMetricsSummary,
  ApmTimeSeriesBucket,
  DEFAULT_APM_OTLP_PORT
} from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { showToast } from './ToastHost';
import { buildApmSetupSnippets, getMethodBadgeClass, splitSqlTokens } from '../utils/apmUiUtils';

interface ApmDashboardViewProps {
  overview: ObservabilityOverview | null;
  onFilterByEndpoint?: (route: string) => void;
  onFilterBySlowQuery?: (statement: string) => void;
  onSelectTrace?: (traceId: string) => void;
  onNavigateToDatabase?: () => void;
  onGenerateDemo?: () => void;
  /** Abre "Como Conectar", onde a porta do receptor pode ser trocada */
  onOpenSetup?: () => void;
}

export const ApmDashboardView: React.FC<ApmDashboardViewProps> = ({
  overview,
  onFilterByEndpoint,
  onFilterBySlowQuery,
  onSelectTrace,
  onNavigateToDatabase,
  onGenerateDemo,
  onOpenSetup
}) => {
  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(2000);
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);
  const [endpointSortMode, setEndpointSortMode] = useState<'volume' | 'slow'>('volume');

  const timeSeries = useMemo<ApmTimeSeriesBucket[]>(() => {
    return overview?.timeSeries || [];
  }, [overview]);

  const slowQueries = useMemo<SlowQueryMetricsSummary[]>(() => {
    return overview?.slowQueries || [];
  }, [overview]);

  const displayedEndpoints = useMemo<EndpointMetricsSummary[]>(() => {
    const list = [...(overview?.topEndpoints || [])];
    if (endpointSortMode === 'slow') {
      return list.sort((a, b) => b.p95DurationMs - a.p95DurationMs || b.avgDurationMs - a.avgDurationMs);
    }
    return list.sort((a, b) => b.requestCount - a.requestCount);
  }, [overview, endpointSortMode]);

  // Cálculos de max para gráficos proporcionais
  const maxBucketRequests = useMemo(() => {
    if (timeSeries.length === 0) return 1;
    const max = Math.max(...timeSeries.map((b) => b.requestCount));
    return max > 0 ? max : 1;
  }, [timeSeries]);

  const maxBucketLatency = useMemo(() => {
    if (timeSeries.length === 0) return 1;
    const max = Math.max(...timeSeries.map((b) => b.p95DurationMs));
    return max > 0 ? max : 1;
  }, [timeSeries]);

  // Total de requisições nos últimos 15 min
  const recentTotalRequests = useMemo(() => {
    return timeSeries.reduce((acc, b) => acc + b.requestCount, 0);
  }, [timeSeries]);

  // RPM estimado nos últimos minutos ativos
  const rpm = useMemo(() => {
    if (timeSeries.length === 0) return 0;
    const filled = timeSeries.filter((b) => b.requestCount > 0);
    if (filled.length === 0) return 0;
    return Math.round(recentTotalRequests / Math.max(1, filled.length));
  }, [timeSeries, recentTotalRequests]);

  // Copiar SQL e opcionalmente abrir no DB Studio
  const handleOpenInDbStudio = (statement: string) => {
    copyToClipboard(statement, statement);
    showToast('Query SQL copiada para a área de transferência! Abrindo DB Studio...', 'info');
    if (onNavigateToDatabase) {
      onNavigateToDatabase();
    }
  };

  // Coordenadas da linha de latência p95 para o SVG overlay
  const latencyLinePoints = useMemo(() => {
    if (timeSeries.length < 2) return '';
    const points: string[] = [];
    const count = timeSeries.length;

    timeSeries.forEach((b, i) => {
      // Coordenada X percentual (centro de cada coluna)
      const xPct = ((i + 0.5) / count) * 100;
      // Coordenada Y percentual (invertida: 0 é topo, 100 é base)
      // Mapeia entre 15% (topo) e 88% (base)
      const lat = b.p95DurationMs;
      const yPct = maxBucketLatency > 0 ? 88 - (lat / maxBucketLatency) * 70 : 88;
      points.push(`${xPct},${yPct}`);
    });

    return points.join(' ');
  }, [timeSeries, maxBucketLatency]);

  // Painel de Standby Operacional (em vez do estado vazio genérico)
  if (!overview || overview.totalTraces === 0) {
    const receiver = overview?.receiverStatus;
    const port = receiver?.port || DEFAULT_APM_OTLP_PORT;
    const snippets = buildApmSetupSnippets(port);
    // Sem overview ainda não se sabe o estado do receptor: não afirmar que está pronto
    const receiverState: 'checking' | 'listening' | 'down' = !receiver ? 'checking' : receiver.listening ? 'listening' : 'down';

    return (
      <div className="flex-1 flex flex-col p-6 items-center justify-center select-text bg-background">
        <div className="w-full max-w-xl flex flex-col gap-4 p-5 rounded-xl border border-border bg-card shadow-xs">
          {/* Header de Instrumento */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {receiverState === 'listening' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    receiverState === 'listening' ? 'bg-emerald-500' : receiverState === 'down' ? 'bg-rose-500' : 'bg-neutral-400'
                  }`}
                />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
                {receiverState === 'down' ? 'Receptor OTLP Inativo' : 'Receptor OTLP Standby'} • Porta :{port}
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                receiverState === 'listening'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : receiverState === 'down'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {receiverState === 'listening' ? 'Pronto para Escuta' : receiverState === 'down' ? 'Indisponível' : 'Verificando…'}
            </span>
          </div>

          {receiverState === 'down' ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                O receptor não conseguiu abrir a porta {port}: <strong>{receiver?.error || 'erro desconhecido'}</strong>. Se
                outro coletor OpenTelemetry (OTel Collector, Jaeger, SigNoz) estiver usando a porta, encerre-o ou escolha
                outra porta para o receptor.
              </p>
              {onOpenSetup && (
                <button
                  type="button"
                  onClick={onOpenSetup}
                  className="self-start px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer transition"
                >
                  Trocar porta do receptor
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              O hub de observabilidade do Dev Manager aguarda requisições em{' '}
              <code className="text-foreground font-mono">{snippets.endpoint}</code> vindas do Apache Karaf (CXF / Oracle)
              ou de qualquer microserviço instrumentado via OpenTelemetry.
            </p>
          )}

          {/* Teste Rápido / Chamada */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                Disparo de Teste Rápido (PowerShell):
              </span>
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(snippets.powershellCopy, 'ps-cmd');
                  showToast('Comando PowerShell copiado!', 'info');
                }}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 flex items-center gap-1 cursor-pointer transition"
              >
                {copyFeedback === 'ps-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copiar
              </button>
            </div>
            <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-20 no-scrollbar">
              Invoke-RestMethod -Uri "{snippets.tracesUrl}" -Method POST ...
            </pre>
          </div>

          {/* Ações de Inicialização */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Dica: Iniciar o Karaf pelo painel anexa o agente automaticamente.</span>
            </div>
            {onGenerateDemo && (
              <button
                type="button"
                onClick={onGenerateDemo}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Simular Tráfego de Demonstração
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4 no-scrollbar select-text bg-background">
      {/* 1. Grade de Cards de Métricas Vitais (RED + Database Load) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Throughput (Vazão RPM) */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
              <Activity className="w-3.5 h-3.5 text-sky-500" />
              Vazão (Throughput)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              {overview.requestsPerSecond} req/s
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
              <span>{rpm}</span>
              <span className="text-xs font-normal font-sans text-muted-foreground">RPM</span>
            </div>

            {/* Mini-sparkline dos últimos buckets */}
            <div className="h-4 flex items-end gap-0.5 mt-2 opacity-80">
              {timeSeries.slice(-15).map((b, i) => (
                <div
                  key={`sp-${b.timestampUnixMs}-${i}`}
                  className="flex-1 bg-sky-500/40 dark:bg-sky-400/40 rounded-t-xs hover:bg-sky-500 transition-colors"
                  style={{
                    height: `${b.requestCount > 0 ? Math.max(15, Math.round((b.requestCount / maxBucketRequests) * 100)) : 10}%`
                  }}
                  title={`${b.label}: ${b.requestCount} reqs`}
                />
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              Total acumulado: {overview.totalTraces} requisições
            </p>
          </div>
        </div>

        {/* Card 2: Latência Percentil (p95) */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Latência (p95)
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                overview.p95LatencyMs < 200
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : overview.p95LatencyMs < 800
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              méd: {overview.avgLatencyMs}ms
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
              <span
                className={
                  overview.p95LatencyMs > 1000
                    ? 'text-rose-600 dark:text-rose-400'
                    : overview.p95LatencyMs > 400
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground'
                }
              >
                {overview.p95LatencyMs}
              </span>
              <span className="text-xs font-normal font-sans text-muted-foreground">ms</span>
            </div>

            {/* Escala Visual de Percentis */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 relative">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(10, Math.round((overview.p95LatencyMs / Math.max(overview.p99LatencyMs, 100)) * 100)))}%`
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
              <span>p50: <strong className="text-foreground">{overview.p50LatencyMs}ms</strong></span>
              <span>•</span>
              <span>p99: <strong className="text-foreground">{overview.p99LatencyMs}ms</strong></span>
            </div>
          </div>
        </div>

        {/* Card 3: Confiabilidade & Taxa de Erros */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
              <AlertCircle
                className={`w-3.5 h-3.5 ${
                  overview.errorRate > 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              />
              Taxa de Falhas
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                overview.errorRate === 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {overview.errorRate === 0 ? '100% OK' : 'Atenção'}
            </span>
          </div>

          <div className="mt-2">
            <div
              className={`text-2xl font-bold font-mono tracking-tight flex items-baseline gap-1 ${
                overview.errorRate > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              }`}
            >
              <span>{overview.errorRate}</span>
              <span className="text-xs font-normal font-sans text-muted-foreground">%</span>
            </div>

            {/* Indicador de Falhas */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overview.errorRate > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, overview.errorRate * 5))}%` }}
              />
            </div>

            <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              {overview.errorRate > 0
                ? 'Erros HTTP 5xx ou exceções Java capturadas'
                : 'Nenhuma exceção não tratada no Karaf'}
            </p>
          </div>
        </div>

        {/* Card 4: Perfil de Carga (Oracle vs JVM) */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
              <Database className="w-3.5 h-3.5 text-amber-500" />
              Tempo em Banco (Oracle)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">
              Listener SQL
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1">
              <span className="text-amber-600 dark:text-amber-400">{overview.dbTimePercentage}</span>
              <span className="text-xs font-normal font-sans text-muted-foreground">%</span>
            </div>

            {/* Barra de Proporção: Banco vs Java */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 flex">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, overview.dbTimePercentage)}%` }}
                title={`Banco de Dados: ${overview.dbTimePercentage}%`}
              />
              <div
                className="bg-sky-500 h-full transition-all duration-500"
                style={{ width: `${Math.max(0, 100 - overview.dbTimePercentage)}%` }}
                title={`Processamento Java: ${Math.round((100 - overview.dbTimePercentage) * 10) / 10}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Oracle ({overview.dbTimePercentage}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Java ({Math.round((100 - overview.dbTimePercentage) * 10) / 10}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gráfico Dual-Axis Temporal: Volume de Requisições + Linha de Latência p95 */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
              Volume & Latência nos Últimos 15 Minutos
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Sucesso (2xx/3xx)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Erro Cliente (4xx)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Erro Servidor (5xx)
            </span>
            <span className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
              <span className="w-3 h-0.5 bg-indigo-500 rounded-full" /> Curva p95
            </span>
          </div>
        </div>

        {/* Visualizador de Barras Temporais com Linha SVG Sobreposta */}
        <div className="relative pt-4 pb-1">
          {/* SVG Overlay: Linha de Tendência de Latência p95 */}
          {latencyLinePoints && (
            <svg
              className="absolute inset-0 w-full h-28 pointer-events-none z-10 overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="rgb(99, 102, 241)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={latencyLinePoints}
                className="opacity-80"
              />
            </svg>
          )}

          <div className="h-28 flex items-end gap-1.5 sm:gap-2 px-1 relative z-0">
            {timeSeries.map((bucket, idx) => {
              const total = bucket.requestCount;
              const heightPct = total > 0 ? Math.max(8, Math.round((total / maxBucketRequests) * 100)) : 2;
              const isHovered = hoveredBucketIdx === idx;

              // Proporções internas da barra empilhada
              const successPct = total > 0 ? (bucket.successCount / total) * 100 : 0;
              const clientErrPct = total > 0 ? (bucket.clientErrorCount / total) * 100 : 0;
              const serverErrPct = total > 0 ? (bucket.serverErrorCount / total) * 100 : 0;

              return (
                <div
                  key={bucket.timestampUnixMs}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBucketIdx(idx)}
                  onMouseLeave={() => setHoveredBucketIdx(null)}
                >
                  {/* Tooltip flutuante ao passar o mouse */}
                  {isHovered && total > 0 && (
                    <div className="absolute bottom-full mb-3 z-30 px-3 py-2 rounded-lg bg-neutral-900 text-neutral-100 text-[11px] shadow-xl border border-neutral-800 whitespace-nowrap pointer-events-none">
                      <div className="font-semibold font-mono text-emerald-400 mb-1 flex items-center justify-between gap-3">
                        <span>Minuto {bucket.label}</span>
                        <span className="text-neutral-400 text-[10px]">{total} requisições</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-neutral-300">
                        <span>🟢 Sucesso: {bucket.successCount}</span>
                        <span>🔴 Erros 5xx: {bucket.serverErrorCount}</span>
                        <span>🟡 Erros 4xx: {bucket.clientErrorCount}</span>
                        <span className="text-indigo-300 font-bold">⏱️ p95: {bucket.p95DurationMs}ms</span>
                      </div>
                    </div>
                  )}

                  {/* Barra Empilhada */}
                  <div
                    className={`w-full rounded-t-xs overflow-hidden flex flex-col justify-end transition-all ${
                      isHovered ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''
                    } ${total === 0 ? 'bg-neutral-200/50 dark:bg-neutral-800/40 h-1' : ''}`}
                    style={total > 0 ? { height: `${heightPct}%` } : undefined}
                  >
                    {total > 0 && (
                      <>
                        {serverErrPct > 0 && (
                          <div className="bg-rose-500 w-full" style={{ height: `${serverErrPct}%` }} />
                        )}
                        {clientErrPct > 0 && (
                          <div className="bg-amber-500 w-full" style={{ height: `${clientErrPct}%` }} />
                        )}
                        {successPct > 0 && (
                          <div className="bg-emerald-500 w-full" style={{ height: `${successPct}%` }} />
                        )}
                      </>
                    )}
                  </div>

                  {/* Rótulo da Hora a cada 2 buckets para não poluir */}
                  <span className="text-[10px] font-mono text-muted-foreground mt-2 truncate w-full text-center">
                    {idx % 2 === 0 ? bucket.label : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Seção Dividida: Top Endpoints & Slow Queries do Banco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Lado Esquerdo: Top Endpoints Mais Acessados / Lentos */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
                Endpoints {endpointSortMode === 'slow' ? 'Mais Lentos (p95)' : 'Mais Solicitados'}
              </h4>
            </div>

            {/* Alternador de Ordenação: Volume vs Lentidão */}
            <div className="flex items-center p-0.5 rounded bg-muted/60 border border-border text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setEndpointSortMode('volume')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  endpointSortMode === 'volume'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setEndpointSortMode('slow')}
                className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                  endpointSortMode === 'slow'
                    ? 'bg-card text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Mais Lentos</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </button>
            </div>
          </div>

          {displayedEndpoints.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum endpoint registrado ainda.</p>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden">
              {displayedEndpoints.slice(0, 5).map((ep, i) => (
                <div
                  key={`${ep.serviceName}-${ep.method}-${ep.route}-${i}`}
                  className="py-2.5 flex items-center justify-between gap-3 group hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${getMethodBadgeClass(
                        ep.method
                      )}`}
                    >
                      {ep.method || 'HTTP'}
                    </span>
                    <span className="font-mono text-xs text-foreground truncate" title={ep.route}>
                      {ep.route}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-xs">
                      <div className="font-semibold text-foreground">{ep.requestCount} reqs</div>
                      <div className="text-[10px] text-muted-foreground">
                        p95:{' '}
                        <span
                          className={`font-bold ${
                            ep.p95DurationMs >= 1000
                              ? 'text-rose-600 dark:text-rose-400'
                              : ep.p95DurationMs >= 400
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {ep.p95DurationMs}ms
                        </span>
                        {ep.errorRate > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 ml-1.5 font-bold">
                            {ep.errorRate}% err
                          </span>
                        )}
                      </div>
                    </div>

                    {onFilterByEndpoint && (
                      <button
                        type="button"
                        onClick={() => onFilterByEndpoint(ep.route)}
                        title="Filtrar traces deste endpoint no Traces Explorer"
                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lado Direito: Top Slow Queries (Oracle / WinThor) */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
                Top Slow Queries (Oracle / Banco)
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Ranking de lentidão
            </span>
          </div>

          {slowQueries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma query de banco capturada ainda.</p>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden">
              {slowQueries.slice(0, 5).map((sq, i) => {
                const isCritical = sq.maxDurationMs >= 1000;
                const isSlow = sq.maxDurationMs >= 300;
                const tokens = splitSqlTokens(sq.statement);

                return (
                  <div
                    key={`${sq.statement.slice(0, 40)}-${i}`}
                    className="py-2.5 flex flex-col gap-1.5 group hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            isCritical
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                              : isSlow
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isCritical ? 'Crítica' : isSlow ? 'Lenta' : 'Normal'}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {sq.executionCount}x exec | máx: <strong className="text-foreground">{sq.maxDurationMs}ms</strong> | méd: {sq.avgDurationMs}ms
                        </span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(onFilterBySlowQuery || onFilterByEndpoint) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onFilterBySlowQuery) onFilterBySlowQuery(sq.statement);
                              else if (onFilterByEndpoint) onFilterByEndpoint(sq.statement);
                            }}
                            title="Filtrar traces com esta query lenta no Traces Explorer"
                            className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Search className="w-3 h-3 text-muted-foreground" />
                            Filtrar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenInDbStudio(sq.statement)}
                          title="Abrir query no DB Studio para executar ou Explain Plan"
                          className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Database className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          DB Studio
                        </button>
                        {onSelectTrace && sq.sampleTraceId && (
                          <button
                            type="button"
                            onClick={() => onSelectTrace(sq.sampleTraceId)}
                            title="Ver trace com esta query no Waterfall"
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview da Instrução SQL com Realce de Palavras-Chave e Tabelas WinThor (PC*) */}
                    <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed no-scrollbar">
                      {tokens.map((tok, tIdx) => {
                        const isWinThorTable = tok.text.toUpperCase().startsWith('PC') && tok.text.length >= 4;

                        if (tok.isKeyword) {
                          return (
                            <span key={`tk-${tIdx}`} className="text-amber-600 dark:text-amber-400 font-bold">
                              {tok.text}
                            </span>
                          );
                        }
                        if (isWinThorTable) {
                          return (
                            <span key={`tk-${tIdx}`} className="text-sky-600 dark:text-sky-400 font-semibold underline decoration-dotted decoration-sky-500/50">
                              {tok.text}
                            </span>
                          );
                        }
                        return <span key={`tk-${tIdx}`} className="text-foreground/90">{tok.text}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
