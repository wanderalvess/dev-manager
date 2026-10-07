import React from 'react';
import { Search, X, Sparkles, Terminal } from 'lucide-react';
import type { KarafDeployHistoryFilter, KarafDeployStats } from '../../../utils/karafDeployHistoryUtils';

interface KarafDeployHistoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: KarafDeployHistoryFilter;
  onFilterChange: (value: KarafDeployHistoryFilter) => void;
  stats: KarafDeployStats;
}

export const KarafDeployHistoryToolbar: React.FC<KarafDeployHistoryToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  stats
}) => {
  const chips: Array<{
    id: KarafDeployHistoryFilter;
    label: string;
    count: number;
    dotColor?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'ALL', label: 'Todos', count: stats.total },
    { id: 'SUCCESS', label: 'Sucessos', count: stats.successes, dotColor: 'bg-emerald-400' },
    { id: 'FAILURE', label: 'Falhas', count: stats.failures, dotColor: 'bg-rose-400' },
    { id: 'MCP', label: 'MCP Agent', count: stats.mcpCount, icon: Sparkles },
    { id: 'UI', label: 'Console UI', count: stats.uiCount, icon: Terminal }
  ];

  return (
    <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar por artefato, versão, feature, erro..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-sky-500/60 font-mono placeholder:text-slate-500 placeholder:font-sans transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map((chip) => {
          const isSelected = filter === chip.id;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-xs'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {chip.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${chip.dotColor}`} />}
              {Icon && <Icon className="w-3 h-3 text-current" />}
              <span>{chip.label}</span>
              <span className="text-2xs font-mono opacity-70 ml-0.5">({chip.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
