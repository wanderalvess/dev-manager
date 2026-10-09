import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ScopeCounts, ScopeFilter, StatusFilter } from '../../utils/karafBundleUtils';

interface KarafBundleScopeBarProps {
  scopeFilter: ScopeFilter;
  onScopeFilterChange: (scope: ScopeFilter) => void;
  scopeCounts: ScopeCounts;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export const KarafBundleScopeBar: React.FC<KarafBundleScopeBarProps> = ({
  scopeFilter,
  onScopeFilterChange,
  scopeCounts,
  statusFilter,
  onStatusFilterChange
}) => {
  const scopeTabs: { id: ScopeFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'Todos os Módulos', count: scopeCounts.all },
    { id: 'TOTVS', label: 'TOTVS / WinThor', count: scopeCounts.totvs },
    { id: 'WORKSPACE', label: 'Workspace Local', count: scopeCounts.workspace },
    { id: 'ISSUES', label: 'Alertas / Diag', count: scopeCounts.issues },
    { id: 'SYSTEM', label: 'Framework & Sistema', count: scopeCounts.system }
  ];

  const statusOptions: StatusFilter[] = ['ALL', 'Active', 'Resolved', 'Installed'];

  return (
    <div className="px-4 sm:px-6 py-2 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <SlidersHorizontal className="w-3 h-3 text-muted-foreground" /> Escopo:
        </span>
        <div className="inline-flex p-0.5 bg-muted/50 border border-border/70 rounded-lg">
          {scopeTabs.map((tab) => {
            const isActive = scopeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onScopeFilterChange(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-2xs px-1.5 py-0.2 rounded font-mono font-semibold ${
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Filtro de Estado como Segmented Control */}
        <div className="inline-flex p-0.5 bg-muted/50 border border-border/70 rounded-lg">
          {statusOptions.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStatusFilterChange(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
