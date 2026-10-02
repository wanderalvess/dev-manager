import React from 'react';
import { Filter } from 'lucide-react';
import type { LatencyBracket, LatencySpectrumData } from '../../utils/apmUiUtils';

export interface ApmLatencySpectrumProps {
  spectrum: LatencySpectrumData;
  selected: LatencyBracket;
  onToggle: (bracket: LatencyBracket) => void;
  onClear: () => void;
}

export const ApmLatencySpectrum: React.FC<ApmLatencySpectrumProps> = ({ spectrum, selected, onToggle, onClear }) => (
  <div
    className={`hidden xl:flex items-center gap-2 px-2.5 py-0.5 rounded border text-[11px] font-mono shrink-0 transition ${
      selected !== 'ALL' ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40' : 'bg-muted/20 border-border/60 text-muted-foreground'
    }`}
    title="Clique em uma faixa de latência para filtrar a tabela"
  >
    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
      <Filter className="w-2.5 h-2.5" />
      <span>Espectro:</span>
    </span>
    <div className="w-28 h-2.5 rounded-full bg-muted/60 overflow-hidden flex cursor-pointer p-[1px] gap-0.5">
      {([
        { bracket: 'FAST', pct: spectrum.fastPct, count: spectrum.fast, label: '< 100ms', active: 'bg-emerald-400 ring-2 ring-emerald-300', idle: 'bg-emerald-500/80 hover:bg-emerald-400' },
        { bracket: 'NORMAL', pct: spectrum.normalPct, count: spectrum.normal, label: '100 - 400ms', active: 'bg-sky-400 ring-2 ring-sky-300', idle: 'bg-sky-500/80 hover:bg-sky-400' },
        { bracket: 'SLOW', pct: spectrum.slowPct, count: spectrum.slow, label: '400 - 1000ms', active: 'bg-amber-400 ring-2 ring-amber-300', idle: 'bg-amber-500/80 hover:bg-amber-400' },
        { bracket: 'CRITICAL', pct: spectrum.criticalPct, count: spectrum.critical, label: '> 1000ms', active: 'bg-rose-400 ring-2 ring-rose-300', idle: 'bg-rose-500/80 hover:bg-rose-400' }
      ] as const).map(({ bracket, pct, count, label, active, idle }) => (
        <div
          key={bracket}
          style={{ width: `${Math.max(4, pct)}%` }}
          onClick={() => onToggle(bracket)}
          className={`h-full rounded-xs transition-all ${selected === bracket ? active : idle}`}
          title={`${label}: ${count} (${pct.toFixed(0)}%) - Clique para filtrar`}
        />
      ))}
    </div>
    <div className="flex items-center gap-1.5 text-[10px]">
      {([
        { bracket: 'FAST', count: spectrum.fast, title: 'Filtrar < 100ms', active: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/50', idle: 'text-emerald-700 dark:text-emerald-400 hover:underline' },
        { bracket: 'NORMAL', count: spectrum.normal, title: 'Filtrar 100 - 400ms', active: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 font-bold border border-sky-500/50', idle: 'text-sky-700 dark:text-sky-400 hover:underline' },
        { bracket: 'SLOW', count: spectrum.slow, title: 'Filtrar 400 - 1000ms', active: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/50', idle: 'text-amber-700 dark:text-amber-400 hover:underline' },
        { bracket: 'CRITICAL', count: spectrum.critical, title: 'Filtrar > 1000ms', active: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-500/50', idle: 'text-rose-700 dark:text-rose-400 font-bold hover:underline' }
      ] as const).map(({ bracket, count, title, active, idle }, index) => (
        <React.Fragment key={bracket}>
          {index > 0 && <span className="text-border">/</span>}
          <button
            type="button"
            onClick={() => onToggle(bracket)}
            className={`px-1 rounded cursor-pointer transition ${selected === bracket ? active : idle}`}
            title={title}
          >
            {count}
          </button>
        </React.Fragment>
      ))}
      {selected !== 'ALL' && (
        <button type="button" onClick={onClear} className="ml-1 text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer">
          Limpar
        </button>
      )}
    </div>
  </div>
);
