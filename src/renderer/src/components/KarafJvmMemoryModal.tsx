import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  Cpu,
  Layers,
  Clock,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { KarafJvmMemoryInfo } from '../../../shared/types';
import { apiBridge } from '../services/apiBridge';

interface KarafJvmMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TelemetryPoint {
  time: string;
  heapUsedMb: number;
  heapMaxMb: number;
  heapPercent: number;
  nonHeapUsedMb: number;
}

export const KarafJvmMemoryModal: React.FC<KarafJvmMemoryModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<KarafJvmMemoryInfo | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGcRunning, setIsGcRunning] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(3);
  const [gcFeedback, setGcFeedback] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await apiBridge.getKarafJvmMemory();
      setMetrics(data);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: timeStr,
            heapUsedMb: data.heapUsedMb,
            heapMaxMb: data.heapMaxMb,
            heapPercent: data.heapUsagePercent,
            nonHeapUsedMb: data.nonHeapUsedMb
          }
        ];
        return next.slice(-25); // Mantém até 25 pontos de histórico recente
      });
    } catch (err: any) {
      setFetchError(err?.message || 'Falha ao conectar na JVM ou shell Karaf.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchMetrics();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, refreshIntervalSec]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTriggerGc = async () => {
    if (isGcRunning) return;
    try {
      setIsGcRunning(true);
      setGcFeedback(null);
      const res = await apiBridge.triggerKarafGc();
      if (res.success) {
        setGcFeedback('Garbage Collection disparado com sucesso na JVM!');
        setTimeout(() => {
          fetchMetrics();
        }, 800);
      } else {
        setGcFeedback(`Aviso: ${res.output || (res as any).message || 'Falha ao disparar GC'}`);
      }
    } catch (err: any) {
      setGcFeedback(`Falha ao disparar GC: ${err?.message || err}`);
    } finally {
      setIsGcRunning(false);
      setTimeout(() => setGcFeedback(null), 4000);
    }
  };

  if (!isOpen) return null;

  const alertLevel = metrics?.alertLevel || 'NORMAL';
  const isNearOom = metrics?.isNearOom || false;

  // Render do gráfico SVG com histórico de Heap
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-xs">
          <Activity className="w-8 h-8 animate-pulse mb-2 text-primary/40" />
          <span>Coletando amostras da JVM...</span>
        </div>
      );
    }

    const maxCapacity = Math.max(...history.map((p) => p.heapMaxMb), 512);
    const chartHeight = 130;
    const chartWidth = 580;
    const paddingX = 28;
    const paddingY = 16;
    const innerW = chartWidth - paddingX * 2;
    const innerH = chartHeight - paddingY * 2;

    const points = history.map((pt, i) => {
      const x = paddingX + (i / (history.length - 1)) * innerW;
      const y = paddingY + innerH - (Math.min(pt.heapUsedMb, maxCapacity) / maxCapacity) * innerH;
      return { x, y, pt };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - paddingY} L ${points[0].x.toFixed(1)} ${
      chartHeight - paddingY
    } Z`;

    // Linha de limite 85% (alerta)
    const warningY = paddingY + innerH * 0.15;
    const strokeColor = isNearOom ? '#f43f5e' : alertLevel === 'WARNING' ? '#f59e0b' : '#38bdf8';

    return (
      <div className="w-full select-none">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="heapGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
            <pattern id="gridPattern" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="1 3" />
            </pattern>
          </defs>

          {/* Grade de fundo */}
          <rect x={paddingX} y={paddingY} width={innerW} height={innerH} fill="url(#gridPattern)" />

          {/* Eixos delimitadores */}
          <line
            x1={paddingX}
            y1={warningY}
            x2={chartWidth - paddingX}
            y2={warningY}
            stroke="#f59e0b"
            strokeOpacity="0.4"
            strokeDasharray="3 3"
          />
          <text
            x={chartWidth - paddingX - 4}
            y={warningY - 3}
            textAnchor="end"
            className="text-[8px] fill-amber-500/70 font-mono tracking-tight"
          >
            LIMIAR 85%
          </text>

          {/* Eixo base */}
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="currentColor"
            className="text-border/70"
            strokeWidth="1"
          />

          {/* Área preenchida */}
          <path d={areaD} fill="url(#heapGradient)" />

          {/* Linha de telemetria */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos de amostragem */}
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={isLast ? 3.5 : 1.5}
                fill={isLast ? strokeColor : '#0f172a'}
                stroke={strokeColor}
                strokeWidth={isLast ? 2 : 1}
              />
            );
          })}
        </svg>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1 pt-1 font-mono tabular-nums">
          <span>{history[0]?.time}</span>
          <span className="text-muted-foreground/70 uppercase tracking-widest text-[9px]">
            Janela Contínua ({history.length} amostras)
          </span>
          <span className="font-semibold text-foreground/90">{history[history.length - 1]?.time}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center space-x-3">
            <Activity className={`w-5 h-5 shrink-0 ${isNearOom ? 'text-rose-500 animate-pulse' : 'text-primary'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  Telemetria de Memória JVM
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/80 font-medium">
                  JMX :8101 · KARAF
                </span>
                {metrics && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isNearOom ? 'bg-rose-500 animate-ping' : alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    title={isNearOom ? 'Crítico (Quase OOM)' : alertLevel === 'WARNING' ? 'Atenção' : 'Operação Normal'}
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Heap, Metaspace e monitoramento contínuo de OutOfMemoryError.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Alerta de OutOfMemory / Nível Crítico */}
          {isNearOom && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/50 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-rose-400">
                    Alerta Crítico: Risco Iminente de OutOfMemoryError
                  </h4>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {metrics?.heapUsagePercent.toFixed(1)}% USADO
                  </span>
                </div>
                <p className="text-[11px] text-rose-300/90 mt-1 leading-relaxed">
                  O consumo de Heap ultrapassou o limiar de segurança. Dispare a coleta de lixo (GC) ou eleve o parâmetro{' '}
                  <code className="bg-rose-950/60 px-1 py-0.5 rounded font-mono text-[10px] text-rose-200 border border-rose-500/40">
                    -Xmx
                  </code>{' '}
                  nos argumentos de inicialização do Karaf.
                </p>
              </div>
            </div>
          )}

          {alertLevel === 'WARNING' && !isNearOom && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center space-x-2.5 text-amber-300 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                Consumo de Heap elevado ({metrics?.heapUsagePercent.toFixed(1)}%). Verifique se o GC está liberando
                instâncias ou se há acúmulo de sessões OSGi.
              </span>
            </div>
          )}

          {fetchError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {gcFeedback && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{gcFeedback}</span>
            </div>
          )}

          {/* Gráfico Visual */}
          <div className="p-3.5 bg-background border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" /> Curva de Consumo de Heap
              </span>
              <div className="text-[11px] font-mono tabular-nums text-muted-foreground flex items-center gap-3">
                <span>
                  Usado: <strong className="text-foreground">{metrics?.heapUsedMb ?? 0} MB</strong>
                </span>
                <span className="text-border">|</span>
                <span>
                  Capacidade: <strong className="text-foreground">{metrics?.heapMaxMb ?? 0} MB</strong>
                </span>
              </div>
            </div>
            {renderChart()}
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Heap Card */}
            <div className="p-3.5 bg-card border border-border rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" /> Heap Memory (Java Objects)
                </span>
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isNearOom
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : alertLevel === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {metrics?.heapUsagePercent.toFixed(1) || '0.0'}%
                </span>
              </div>

              {/* Progress Gauge */}
              <div className="w-full bg-muted/60 rounded-xs h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isNearOom ? 'bg-rose-500' : alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(metrics?.heapUsagePercent || 0, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono tabular-nums">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Usado</span>
                  <span className="font-bold text-foreground">{metrics?.heapUsedMb ?? 0} MB</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Alocado</span>
                  <span className="font-bold text-foreground">{metrics?.heapCommittedMb ?? 0} MB</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Máximo</span>
                  <span className="font-bold text-foreground">{metrics?.heapMaxMb ?? 0} MB</span>
                </div>
              </div>
            </div>

            {/* Non-Heap Card */}
            <div className="p-3.5 bg-card border border-border rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Non-Heap (Metaspace / CodeCache)
                </span>
                <span className="text-xs font-mono font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                  {metrics?.nonHeapUsedMb || 0} MB
                </span>
              </div>

              {/* Progress Gauge para Metaspace */}
              <div className="w-full bg-muted/60 rounded-xs h-1.5 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(((metrics?.nonHeapUsedMb || 0) / (metrics?.nonHeapCommittedMb || 256)) * 100, 100)}%`
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono tabular-nums">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Usado</span>
                  <span className="font-bold text-foreground">{metrics?.nonHeapUsedMb ?? 0} MB</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Alocado (Committed)</span>
                  <span className="font-bold text-foreground">{metrics?.nonHeapCommittedMb ?? 0} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetria de Sistema Adicional */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/20 border border-border rounded-lg text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Uptime JVM</span>
                <span className="font-bold text-foreground">{metrics?.uptime || 'N/A'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Threads Ativas</span>
                <span className="font-bold text-foreground tabular-nums">{metrics?.liveThreads ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Classes</span>
                <span className="font-bold text-foreground tabular-nums">{metrics?.classesLoaded ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center space-x-3 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-mono text-[11px]">Auto-refresh</span>
            </label>

            {autoRefresh && (
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="bg-card border border-border rounded px-2 py-0.5 text-xs text-foreground font-mono focus:outline-none"
              >
                <option value={2}>2s</option>
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
              </select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerGc}
              disabled={isGcRunning}
              className="px-3 py-1.5 rounded-md text-xs font-semibold font-mono flex items-center space-x-1.5 transition-colors bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 cursor-pointer disabled:opacity-40"
              title="Disparar execução de System.gc() na JVM do Karaf"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isGcRunning ? 'animate-spin' : ''}`} />
              <span>{isGcRunning ? 'EXECUTANDO GC...' : 'DISPARAR GC'}</span>
            </button>

            <button
              onClick={fetchMetrics}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
