import React from 'react';
import { ArrowUpDown, Search, X } from 'lucide-react';
import type { DetectedSlowSummary, FilterPreset, LatencyBracket, LatencySpectrumData, TraceSortOrder } from '../../utils/apmUiUtils';
import { ApmLatencySpectrum } from './ApmLatencySpectrum';
import { ApmSlowPicker } from './ApmSlowPicker';

export interface ApmTraceFiltersProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchText: string;
  setSearchText: (value: string) => void;
  activePreset: FilterPreset;
  setActivePreset: React.Dispatch<React.SetStateAction<FilterPreset>>;
  latencyBracket: LatencyBracket;
  setLatencyBracket: React.Dispatch<React.SetStateAction<LatencyBracket>>;
  sortOrder: TraceSortOrder;
  setSortOrder: React.Dispatch<React.SetStateAction<TraceSortOrder>>;
  selectedService: string;
  setSelectedService: (service: string) => void;
  serviceOptions: string[];
  rawTraceCount: number;
  slowSummary: DetectedSlowSummary;
  latencySpectrum: LatencySpectrumData;
  isSlowPickerOpen: boolean;
  setIsSlowPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ApmTraceFilters: React.FC<ApmTraceFiltersProps> = ({
  searchInputRef, searchText, setSearchText, activePreset, setActivePreset, latencyBracket, setLatencyBracket,
  sortOrder, setSortOrder, selectedService, setSelectedService, serviceOptions, rawTraceCount,
  slowSummary, latencySpectrum, isSlowPickerOpen, setIsSlowPickerOpen
}) => {
  const toggleLatencyBracket = (bracket: LatencyBracket) => {
    setLatencyBracket((previous) => previous === bracket ? 'ALL' : bracket);
  };
  const presets: Array<{ value: FilterPreset; label: string; title?: string; activeClass: string; hoverClass: string }> = [
    { value: 'ERRORS', label: 'Erros', activeClass: 'bg-rose-500/20 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-400 dark:border-rose-700', hoverClass: 'hover:text-rose-600 dark:hover:text-rose-400' },
    { value: 'SLOW', label: '🐢 Lentos', title: 'Traces com duração superior a 400ms', activeClass: 'bg-amber-500/20 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-400 dark:border-amber-700', hoverClass: 'hover:text-amber-600 dark:hover:text-amber-400' },
    { value: 'SLOW_QUERIES', label: '🗄️ Queries Lentas', title: 'Traces contendo queries SQL com alta latência', activeClass: 'bg-amber-500/25 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-500', hoverClass: 'hover:text-amber-600 dark:hover:text-amber-400' },
    { value: 'SLOW_ENDPOINTS', label: '🌐 Endpoints Lentos', title: 'Endpoints com maior latência observada', activeClass: 'bg-orange-500/25 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-500', hoverClass: 'hover:text-orange-600 dark:hover:text-orange-400' },
    { value: 'DB', label: 'Com SQL', activeClass: 'bg-sky-500/20 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-400 dark:border-sky-700', hoverClass: 'hover:text-sky-600 dark:hover:text-sky-400' }
  ];
  return (
    <div className="h-10 px-3 border-b border-border bg-card/40 flex items-center justify-between gap-3 shrink-0 text-xs">
      <div className="relative flex-1 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Filtrar rota, traceId ou serviço... (Pressione /)"
          className="w-full h-7 pl-8 pr-7 bg-background/90 border border-border rounded text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary transition"
        />
        {searchText && (
          <button type="button" onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => { setActivePreset('ALL'); setLatencyBracket('ALL'); }}
          className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
            activePreset === 'ALL' && latencyBracket === 'ALL' ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs' : 'bg-card border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos ({rawTraceCount})
        </button>
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => setActivePreset((previous) => previous === preset.value ? 'ALL' : preset.value)}
            title={preset.title}
            className={`h-6 px-2 rounded border text-[11px] font-medium cursor-pointer transition ${
              activePreset === preset.value
                ? `${preset.activeClass} font-semibold shadow-2xs`
                : `bg-card border-border text-muted-foreground ${preset.hoverClass}`
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortOrder((previous) => previous === 'time' ? 'duration' : 'time')}
          title={sortOrder === 'time' ? 'Ordenando por horário mais recente. Clique para ordenar pelos mais lentos.' : 'Ordenando por duração (mais lentos primeiro). Clique para ordenar por horário.'}
          className={`h-6 px-2 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer transition ${
            sortOrder === 'duration' ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 font-bold shadow-2xs' : 'bg-card border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpDown className="w-3 h-3 text-amber-500" />
          <span>{sortOrder === 'duration' ? 'Mais Lentos' : 'Recentes'}</span>
        </button>
        <ApmSlowPicker
          isOpen={isSlowPickerOpen}
          setIsOpen={setIsSlowPickerOpen}
          activePreset={activePreset}
          summary={slowSummary}
          onSearchChange={setSearchText}
          onPresetChange={setActivePreset}
          onSortChange={setSortOrder}
        />
      </div>
      <ApmLatencySpectrum
        spectrum={latencySpectrum}
        selected={latencyBracket}
        onToggle={toggleLatencyBracket}
        onClear={() => setLatencyBracket('ALL')}
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground hidden md:inline">Serviço:</span>
        <select
          value={selectedService}
          onChange={(event) => setSelectedService(event.target.value)}
          className="h-7 px-2 bg-background border border-border rounded text-[11px] font-mono text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
        >
          <option value="ALL">Todos os Serviços</option>
          {serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}
        </select>
      </div>
    </div>
  );
};
