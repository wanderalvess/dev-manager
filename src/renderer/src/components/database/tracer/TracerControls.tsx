import React from 'react';
import { Play, Square, Trash2 } from 'lucide-react';
import type { OracleCaptureState } from '../../../../../shared/types';
import { INTERVAL_OPTIONS } from '../../../utils/statementTracerUtils';

interface TracerControlsProps {
  state: OracleCaptureState;
  isBusy: boolean;
  elapsedSec: number;
  intervalMs: number;
  onIntervalChange: (value: number) => void;
  schemaFilter: string;
  onSchemaFilterChange: (value: string) => void;
  textFilter: string;
  onTextFilterChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

export const TracerControls: React.FC<TracerControlsProps> = ({
  state,
  isBusy,
  elapsedSec,
  intervalMs,
  onIntervalChange,
  schemaFilter,
  onSchemaFilterChange,
  textFilter,
  onTextFilterChange,
  onStart,
  onStop,
  onClear
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {!state.isCapturing ? (
      <button
        type="button"
        onClick={onStart}
        disabled={isBusy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5" />
        Iniciar Captura
      </button>
    ) : (
      <button
        type="button"
        onClick={onStop}
        disabled={isBusy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
      >
        <Square className="w-3.5 h-3.5" />
        Parar Captura
      </button>
    )}

    <select
      value={intervalMs}
      onChange={(e) => onIntervalChange(Number(e.target.value))}
      disabled={state.isCapturing}
      title="Intervalo entre consultas ao Oracle (v$session/v$sql são views leves, mas quanto menor o intervalo, mais carga)"
      className="px-2 py-1.5 bg-card border border-border/70 rounded-lg text-xs disabled:opacity-50 focus:outline-hidden focus:ring-1 focus:ring-primary"
    >
      {INTERVAL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          a cada {opt.label}
        </option>
      ))}
    </select>

    <input
      type="text"
      value={schemaFilter}
      onChange={(e) => onSchemaFilterChange(e.target.value)}
      disabled={state.isCapturing}
      placeholder="Filtrar por schema/username..."
      className="px-2.5 py-1.5 bg-card border border-border/70 rounded-lg text-xs w-48 disabled:opacity-50 focus:outline-hidden focus:ring-1 focus:ring-primary"
    />
    <input
      type="text"
      value={textFilter}
      onChange={(e) => onTextFilterChange(e.target.value)}
      disabled={state.isCapturing}
      placeholder="Filtrar por texto na SQL..."
      className="px-2.5 py-1.5 bg-card border border-border/70 rounded-lg text-xs w-52 disabled:opacity-50 focus:outline-hidden focus:ring-1 focus:ring-primary"
    />

    <button
      type="button"
      onClick={onClear}
      disabled={isBusy || (state.statements.length === 0 && state.sessionEvents.length === 0)}
      title="Limpar dados capturados"
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-rose-500 border border-border/70 hover:border-rose-500/40 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Limpar
    </button>

    <div className="ml-auto flex items-center gap-2 text-2xs font-mono text-muted-foreground">
      {state.isCapturing ? (
        <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Capturando há {elapsedSec}s · {state.pollCount} consulta(s)
        </span>
      ) : state.pollCount > 0 ? (
        <span>Captura parada · {state.pollCount} consulta(s) ao Oracle</span>
      ) : null}
    </div>
  </div>
);
