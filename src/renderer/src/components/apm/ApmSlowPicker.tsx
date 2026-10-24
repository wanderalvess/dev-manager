import React from 'react';
import { Flame, X } from 'lucide-react';
import type { DetectedSlowSummary, FilterPreset, TraceSortOrder } from '../../utils/apmUiUtils';

export interface ApmSlowPickerProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePreset: FilterPreset;
  summary: DetectedSlowSummary;
  onSearchChange: (search: string) => void;
  onPresetChange: (preset: FilterPreset) => void;
  onSortChange: (sort: TraceSortOrder) => void;
}

export const ApmSlowPicker: React.FC<ApmSlowPickerProps> = ({
  isOpen, setIsOpen, activePreset, summary, onSearchChange, onPresetChange, onSortChange
}) => (
  <div className="relative">
    <button
      type="button"
      onClick={() => setIsOpen((previous) => !previous)}
      title="Detecção automática de gargalos e chamadas lentas"
      className={`h-6 px-2 rounded border text-2xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
        isOpen || activePreset === 'SLOW_QUERIES' || activePreset === 'SLOW_ENDPOINTS'
          ? 'bg-warning/20 text-warning border-warning/50 font-semibold'
          : 'bg-card border-border text-muted-foreground hover:text-warning'
      }`}
    >
      <Flame className="w-3 h-3 text-warning" />
      <span>Top Lentos</span>
      {summary.slowTracesCount > 0 && (
        <span className="px-1 py-0.2 rounded-full bg-warning/20 text-2xs font-bold text-warning">
          {summary.slowTracesCount}
        </span>
      )}
    </button>
    {isOpen && (
      <div className="absolute left-0 top-7 w-80 p-3 rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-xl z-50 flex flex-col gap-2.5 font-sans text-xs animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-1.5 border-b border-border">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span>Detecção OTLP de Lentidão</span>
          </span>
          <button type="button" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-2xs">
          <div className="p-1.5 rounded bg-muted/40 border border-border">
            <div className="text-muted-foreground">Lentos (&gt;400ms)</div>
            <div className="font-bold text-warning text-xs">{summary.slowTracesCount}</div>
          </div>
          <div className="p-1.5 rounded bg-muted/40 border border-border">
            <div className="text-muted-foreground">Críticos (&gt;1s)</div>
            <div className="font-bold text-danger text-xs">{summary.criticalTracesCount}</div>
          </div>
          <div className="p-1.5 rounded bg-muted/40 border border-border">
            <div className="text-muted-foreground">Com Queries</div>
            <div className="font-bold text-info text-xs">{summary.slowDbTracesCount}</div>
          </div>
        </div>
        {summary.topSlowEndpoints.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Endpoints Mais Lentos (p95)</span>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto no-scrollbar">
              {summary.topSlowEndpoints.map((endpoint, index) => (
                <button
                  key={`${endpoint.method}-${endpoint.route}-${index}`}
                  type="button"
                  onClick={() => {
                    onSearchChange(endpoint.route);
                    onPresetChange('SLOW_ENDPOINTS');
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded bg-muted/30 hover:bg-muted border border-border/60 flex items-center justify-between text-2xs font-mono cursor-pointer transition"
                >
                  <span className="truncate max-w-[180px] text-foreground">
                    <strong className="text-primary">{endpoint.method}</strong> {endpoint.route}
                  </span>
                  <span className="text-warning font-bold shrink-0">{endpoint.maxDurationMs}ms</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="pt-1.5 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onPresetChange('SLOW_QUERIES');
              onSortChange('duration');
              setIsOpen(false);
            }}
            className="text-2xs text-warning hover:underline font-medium cursor-pointer"
          >
            Filtrar Queries Lentas &rarr;
          </button>
          <button
            type="button"
            onClick={() => {
              onPresetChange('SLOW');
              onSortChange('duration');
              setIsOpen(false);
            }}
            className="text-2xs text-primary hover:underline font-medium cursor-pointer"
          >
            Ver Todos os Lentos &rarr;
          </button>
        </div>
      </div>
    )}
  </div>
);
