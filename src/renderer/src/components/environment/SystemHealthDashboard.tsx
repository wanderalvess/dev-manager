import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Pause, Play, RefreshCw } from 'lucide-react';
import type { SystemMetrics } from '../../../../shared/types';
import {
  appendHealthSample,
  formatUptime,
  getResourceStatus,
  MAX_HEALTH_SAMPLES,
  normalizeSystemMetricsSample,
  summarizeHealthSeries,
  type ResourceHealthLevel,
  type SystemHealthSample
} from '../../utils/systemHealthUtils';
import { SystemHealthCharts } from './SystemHealthCharts';

interface SystemHealthDashboardProps {
  isActive: boolean;
}

const INTERVAL_OPTIONS = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 }
] as const;

const STATUS_TEXT_CLASS: Record<ResourceHealthLevel, string> = {
  nominal: 'text-success',
  warning: 'text-warning',
  critical: 'text-danger'
};

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({ isActive }) => {
  const [history, setHistory] = useState<SystemHealthSample[]>([]);
  const [latestRaw, setLatestRaw] = useState<SystemMetrics | null>(null);
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [paused, setPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const collectSample = useCallback(async () => {
    if (!window.electronAPI?.getSystemMetrics) {
      setError('Coleta de métricas do host indisponível neste ambiente.');
      setLoading(false);
      return;
    }
    try {
      const metrics = await window.electronAPI.getSystemMetrics();
      const sample = normalizeSystemMetricsSample(metrics);
      setLatestRaw(metrics);
      setHistory((prev) => appendHealthSample(prev, sample, MAX_HEALTH_SAMPLES));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao coletar métricas do host.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive || paused) return;
    void collectSample();
    const timer = setInterval(() => {
      void collectSample();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isActive, paused, intervalMs, collectSample]);

  const latest = history[history.length - 1] ?? null;
  const summary = useMemo(() => summarizeHealthSeries(history), [history]);
  const cpuStatus = getResourceStatus(latest?.cpuPercent ?? 0);
  const memStatus = getResourceStatus(latest?.memPercent ?? 0);

  const memoryBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Em uso', value: latest.usedMemGb, fill: 'var(--theme-info)' },
      { name: 'Livre', value: latest.freeMemGb, fill: 'var(--theme-muted)' }
    ];
  }, [latest]);

  const loadAvgText = useMemo(() => {
    const loads = latestRaw?.loadAvg;
    if (!Array.isArray(loads) || loads.length === 0) return null;
    return loads
      .slice(0, 2)
      .map((v) => v.toFixed(2))
      .join(' / ');
  }, [latestRaw]);

  return (
    <section
      aria-label="Saúde do Sistema"
      className="bg-card border border-border rounded-xl p-4 space-y-4"
    >
      {/* Cabeçalho e Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <span>Saúde do Sistema</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            <span>Recursos do host</span>
            <span aria-hidden="true"> · </span>
            <span>{paused ? 'Monitoramento pausado' : `Atualização a cada ${intervalMs / 1000}s`}</span>
            {latest && (
              <>
                <span aria-hidden="true"> · </span>
                <span>Uptime {formatUptime(latest.uptimeSeconds)}</span>
              </>
            )}
            {loadAvgText && (
              <>
                <span aria-hidden="true"> · </span>
                <span>Load {loadAvgText}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Intervalo de amostragem"
            className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg border border-border"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntervalMs(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  intervalMs === opt.value
                    ? 'bg-card text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {paused ? <Play className="w-3.5 h-3.5 text-success shrink-0" /> : <Pause className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span>{paused ? 'Retomar' : 'Pausar'}</span>
          </button>

          <button
            type="button"
            onClick={() => void collectSample()}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Linha de KPIs com divisores finos (sem cards aninhados) */}
      {loading && !latest ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-3 border-y border-border animate-pulse">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error && !latest ? (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 flex items-center justify-between gap-3 text-xs text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void collectSample()}
            className="px-3 py-1.5 rounded-md bg-card border border-border text-foreground font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : latest ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border border-y border-border">
            <div className="py-2.5 lg:pr-4">
              <div className="text-xs text-muted-foreground">Processador (CPU)</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {latest.cpuPercent}%
                </span>
                <span className={`text-xs font-semibold ${STATUS_TEXT_CLASS[cpuStatus.level]}`}>
                  {cpuStatus.label}
                </span>
              </div>
              <div className="text-2xs font-mono tabular-nums text-muted-foreground mt-0.5">
                Média {summary.avgCpu}% · Pico {summary.peakCpu}%
              </div>
            </div>

            <div className="py-2.5 lg:px-4">
              <div className="text-xs text-muted-foreground">Memória RAM</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {latest.memPercent}%
                </span>
                <span className={`text-xs font-semibold ${STATUS_TEXT_CLASS[memStatus.level]}`}>
                  {memStatus.label}
                </span>
              </div>
              <div className="text-2xs font-mono tabular-nums text-muted-foreground mt-0.5">
                {latest.usedMemGb.toFixed(1)} / {latest.totalMemGb.toFixed(1)} GB
              </div>
            </div>

            <div className="py-2.5 lg:px-4">
              <div className="text-xs text-muted-foreground">Memória Livre</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {latest.freeMemGb.toFixed(1)} GB
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  de {latest.totalMemGb.toFixed(1)} GB
                </span>
              </div>
              <div className="text-2xs font-mono tabular-nums text-muted-foreground mt-0.5">
                Média uso {summary.avgMem}% · Pico {summary.peakMem}%
              </div>
            </div>

            <div className="py-2.5 lg:pl-4">
              <div className="text-xs text-muted-foreground">Janela Coletada</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {history.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {history.length === 1 ? 'amostra' : 'amostras'}
                </span>
              </div>
              <div className="text-2xs font-mono tabular-nums text-muted-foreground mt-0.5">
                Última leitura {latest.timeLabel}
              </div>
            </div>
          </div>

          <SystemHealthCharts
            history={history}
            latest={latest}
            memoryBreakdown={memoryBreakdown}
          />
        </>
      ) : null}
    </section>
  );
};
