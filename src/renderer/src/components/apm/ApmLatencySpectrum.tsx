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
    className={`hidden xl:flex items-center gap-2 px-2.5 py-0.5 rounded border text-2xs font-mono shrink-0 transition ${
      selected !== 'ALL' ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40' : 'bg-muted/20 border-border/60 text-muted-foreground'
    }`}
    title="Clique em uma faixa de latência para filtrar a tabela"
  >
    <span className="text-2xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
      <Filter className="w-3 h-3" />
      <span>Espectro:</span>
    </span>
    <div className="w-28 h-2.5 rounded-full bg-muted/60 overflow-hidden flex cursor-pointer p-px gap-0.5">
      {([
        { bracket: 'FAST', pct: spectrum.fastPct, count: spectrum.fast, label: '< 100ms', active: 'bg-success ring-2 ring-success', idle: 'bg-success/80 hover:bg-success' },
        { bracket: 'NORMAL', pct: spectrum.normalPct, count: spectrum.normal, label: '100 - 400ms', active: 'bg-info ring-2 ring-info', idle: 'bg-info/80 hover:bg-info' },
        { bracket: 'SLOW', pct: spectrum.slowPct, count: spectrum.slow, label: '400 - 1000ms', active: 'bg-warning ring-2 ring-warning', idle: 'bg-warning/80 hover:bg-warning' },
        { bracket: 'CRITICAL', pct: spectrum.criticalPct, count: spectrum.critical, label: '> 1000ms', active: 'bg-danger ring-2 ring-danger', idle: 'bg-danger/80 hover:bg-danger' }
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
    <div className="flex items-center gap-1.5 text-2xs">
      {([
        { bracket: 'FAST', count: spectrum.fast, title: 'Filtrar < 100ms', active: 'bg-success/20 text-success font-bold border border-success/50', idle: 'text-success hover:underline' },
        { bracket: 'NORMAL', count: spectrum.normal, title: 'Filtrar 100 - 400ms', active: 'bg-info/20 text-info font-bold border border-info/50', idle: 'text-info hover:underline' },
        { bracket: 'SLOW', count: spectrum.slow, title: 'Filtrar 400 - 1000ms', active: 'bg-warning/20 text-warning font-bold border border-warning/50', idle: 'text-warning hover:underline' },
        { bracket: 'CRITICAL', count: spectrum.critical, title: 'Filtrar > 1000ms', active: 'bg-danger/20 text-danger font-bold border border-danger/50', idle: 'text-danger font-bold hover:underline' }
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
        <button type="button" onClick={onClear} className="ml-1 text-2xs text-muted-foreground hover:text-foreground underline cursor-pointer">
          Limpar
        </button>
      )}
    </div>
  </div>
);
