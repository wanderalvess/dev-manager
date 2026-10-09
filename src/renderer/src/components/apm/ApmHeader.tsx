import React from 'react';
import { LayoutDashboard, Layers, Pause, Play, Terminal, Trash2 } from 'lucide-react';
import type { ObservabilityOverview } from '../../../../shared/types';

export interface ApmHeaderProps {
  overview: ObservabilityOverview | null;
  receiverPort: number;
  traceCount: number;
  viewMode: 'dashboard' | 'traces';
  onViewModeChange: (mode: 'dashboard' | 'traces') => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onClear: () => void;
  onOpenSetup: () => void;
}

export const ApmHeader: React.FC<ApmHeaderProps> = ({
  overview, receiverPort, traceCount, viewMode, onViewModeChange, isRecording,
  onToggleRecording, onClear, onOpenSetup
}) => (
      <header className="h-11 px-3 border-b border-border bg-card/75 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0 text-xs">
        {/* Lado Esquerdo: Status do Receptor & Métricas Chave */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {/* Status OTLP (abre a configuração de conexão/porta) */}
          <button
            type="button"
            onClick={onOpenSetup}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-2xs font-mono shrink-0 cursor-pointer ${
              overview?.receiverStatus.listening
                ? 'bg-emerald-500/15 dark:bg-emerald-950/30 border-emerald-500/30 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/15 dark:bg-rose-950/30 border-rose-500/30 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
            }`}
            title={
              overview?.receiverStatus.listening
                ? `Receptor OpenTelemetry (OTLP/HTTP) escutando em :${overview.receiverStatus.port} — clique para conexão e porta`
                : `Receptor OTLP inativo: ${overview?.receiverStatus.error || 'Porta ocupada'} — clique para trocar a porta`
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                overview?.receiverStatus.listening ? 'bg-emerald-500 dark:bg-emerald-400 radar-live' : 'bg-rose-500 dark:bg-rose-400'
              }`}
            />
            <span className="font-semibold">:{receiverPort}</span>
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-sans font-medium">OTLP</span>
          </button>

          <div className="h-4 w-px bg-border shrink-0" />

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
                {overview?.receiverStatus.bufferSize ?? traceCount} / {overview?.receiverStatus.maxBufferSize || 5000}
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
            onClick={() => onViewModeChange('dashboard')}
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
            onClick={() => onViewModeChange('traces')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'traces'
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Traces Explorer</span>
            {traceCount > 0 && (
              <span className="text-2xs font-mono px-1 rounded bg-muted text-muted-foreground">
                {traceCount}
              </span>
            )}
          </button>
        </div>

        {/* Lado Direito: Ações & Gravação */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dica de navegação por teclado */}
          <div className="hidden 2xl:flex items-center gap-1 text-2xs text-muted-foreground/70 font-mono">
            <span className="px-1 py-0.5 rounded bg-muted/60 border border-border/60">↑/↓</span>
            <span>navegar</span>
            <span className="px-1 py-0.5 rounded bg-muted/60 border border-border/60 ml-1">/</span>
            <span>buscar</span>
          </div>

          {/* Botão de Gravação ao Vivo */}
          <button
            type="button"
            onClick={() => onToggleRecording()}
            title={isRecording ? 'Pausar captura em tempo real' : 'Retomar captura em tempo real'} aria-label={isRecording ? 'Pausar captura em tempo real' : 'Retomar captura em tempo real'}
            className={`h-7 px-2.5 rounded border text-2xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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

          {/* Limpar */}
          <button
            type="button"
            onClick={onClear}
            title="Limpar todos os traces coletados em memória"
            className="h-7 px-2 rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-rose-400 cursor-pointer transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Botão Como Conectar */}
          <button
            type="button"
            onClick={onOpenSetup}
            title="Instruções para conectar o Karaf ou outras aplicações no receptor OpenTelemetry"
            className="h-7 px-2.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <Terminal className="w-3 h-3" />
            <span>Como Conectar</span>
          </button>
        </div>
      </header>
);
