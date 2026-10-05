import React from 'react';
import { CheckCircle2, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import type { TautCoverageReport } from '../../../../../shared/types';
import type { TautCoverageStatusFilter } from '../../../utils/tautPanelUtils';

interface TautCoverageTabProps {
  coverageReport: TautCoverageReport | null;
  loadingCoverage: boolean;
  onRecalculate: () => void;
  filteredCoverageItems: TautCoverageReport['items'];
  coverageSearch: string;
  onSearchChange: (value: string) => void;
  coverageStatusFilter: TautCoverageStatusFilter;
  onStatusFilterChange: (value: TautCoverageStatusFilter) => void;
}

export const TautCoverageTab: React.FC<TautCoverageTabProps> = ({
  coverageReport,
  loadingCoverage,
  onRecalculate,
  filteredCoverageItems,
  coverageSearch,
  onSearchChange: setCoverageSearch,
  coverageStatusFilter,
  onStatusFilterChange: setCoverageStatusFilter
}) => {
  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-xs text-muted-foreground">Total de Cenários no Zephyr</span>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {coverageReport?.totalScenarios || 0}
          </div>
          <p className="text-2xs text-muted-foreground">Extraídos dos arquivos .csv em /Insumo</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-xs text-muted-foreground">Cenários Automatizados</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono flex items-center gap-2">
            <span>{coverageReport?.automatedCount || 0}</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-2xs text-emerald-500/80">Cobertos em arquivos .cy.ts</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-xs text-muted-foreground">Cenários Pendentes</span>
          <div className="text-2xl font-extrabold text-amber-400 font-mono flex items-center gap-2">
            <span>{coverageReport?.pendingCount || 0}</span>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-2xs text-amber-500/80">Aguardando implementação</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-xs text-muted-foreground">Índice de Cobertura</span>
          <div className="text-2xl font-extrabold text-primary font-mono">
            {coverageReport?.coveragePercentage || 0}%
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, coverageReport?.coveragePercentage || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Cenários com Busca e Filtros */}
      <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={coverageSearch}
              onChange={(e) => setCoverageSearch(e.target.value)}
              placeholder="Filtrar por ID (ex.: PROJ-T123) ou arquivo..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setCoverageStatusFilter('all')}
                className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  coverageStatusFilter === 'all'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Todos ({coverageReport?.items.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCoverageStatusFilter('automated')}
                className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  coverageStatusFilter === 'automated'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Automatizados ({coverageReport?.automatedCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setCoverageStatusFilter('pending')}
                className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  coverageStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Pendentes ({coverageReport?.pendingCount || 0})
              </button>
            </div>

            <button
              type="button"
              onClick={onRecalculate}
              disabled={loadingCoverage}
              className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold border border-border/70 flex items-center space-x-1.5 transition cursor-pointer"
              title="Recalcula a cobertura lendo os arquivos CSV e specs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCoverage ? 'animate-spin' : ''}`} />
              <span>Recalcular</span>
            </button>
          </div>
        </div>

        {/* Listagem em Tabela */}
        <div className="max-h-96 overflow-y-auto border border-border/60 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/60 text-muted-foreground sticky top-0 border-b border-border/60">
              <tr>
                <th className="py-2 px-3 font-semibold w-40">Chave Zephyr</th>
                <th className="py-2 px-3 font-semibold w-32">Status</th>
                <th className="py-2 px-3 font-semibold">Arquivo de Automação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredCoverageItems.length > 0 ? (
                filteredCoverageItems.map((item) => (
                  <tr key={item.key} className="hover:bg-muted/30 transition">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">
                      {item.key}
                    </td>
                    <td className="py-2 px-3">
                      {item.status === 'automated' ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Automatizado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Pendente</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-md">
                      {item.filePath ? (
                        <span className="text-foreground">{item.filePath}</span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    Nenhum cenário correspondente aos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
