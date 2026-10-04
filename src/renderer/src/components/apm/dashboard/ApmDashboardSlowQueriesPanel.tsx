import React from 'react';
import { ArrowRight, Database, Flame, Search } from 'lucide-react';
import { SlowQueryMetricsSummary } from '../../../../../shared/types';
import { splitSqlTokens } from '../../../utils/apmUiUtils';
import { getSlowQuerySeverity, isWinThorTable } from '../../../utils/apmDashboardUtils';

interface ApmDashboardSlowQueriesPanelProps {
  slowQueries: SlowQueryMetricsSummary[];
  onFilterByEndpoint?: (route: string) => void;
  onFilterBySlowQuery?: (statement: string) => void;
  onSelectTrace?: (traceId: string) => void;
  onOpenInDbStudio: (statement: string) => void;
}

/** Top Slow Queries (Oracle / WinThor). */
export const ApmDashboardSlowQueriesPanel: React.FC<ApmDashboardSlowQueriesPanelProps> = ({
  slowQueries,
  onFilterByEndpoint,
  onFilterBySlowQuery,
  onSelectTrace,
  onOpenInDbStudio
}) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
            Top Slow Queries (Oracle / Banco)
          </h4>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          Ranking de lentidão
        </span>
      </div>

      {slowQueries.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma query de banco capturada ainda.</p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden">
          {slowQueries.slice(0, 5).map((sq, i) => {
            const severity = getSlowQuerySeverity(sq.maxDurationMs);
            const tokens = splitSqlTokens(sq.statement);

            return (
              <div
                key={`${sq.statement.slice(0, 40)}-${i}`}
                className="py-2.5 flex flex-col gap-1.5 group hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        severity === 'critical'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          : severity === 'slow'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {severity === 'critical' ? 'Crítica' : severity === 'slow' ? 'Lenta' : 'Normal'}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {sq.executionCount}x exec | máx: <strong className="text-foreground">{sq.maxDurationMs}ms</strong> | méd: {sq.avgDurationMs}ms
                    </span>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(onFilterBySlowQuery || onFilterByEndpoint) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onFilterBySlowQuery) onFilterBySlowQuery(sq.statement);
                          else if (onFilterByEndpoint) onFilterByEndpoint(sq.statement);
                        }}
                        title="Filtrar traces com esta query lenta no Traces Explorer"
                        className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Search className="w-3 h-3 text-muted-foreground" />
                        Filtrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenInDbStudio(sq.statement)}
                      title="Abrir query no DB Studio para executar ou Explain Plan"
                      className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Database className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      DB Studio
                    </button>
                    {onSelectTrace && sq.sampleTraceId && (
                      <button
                        type="button"
                        onClick={() => onSelectTrace(sq.sampleTraceId)}
                        title="Ver trace com esta query no Waterfall"
                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview da Instrução SQL com Realce de Palavras-Chave e Tabelas WinThor (PC*) */}
                <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed no-scrollbar">
                  {tokens.map((tok, tIdx) => {
                    if (tok.isKeyword) {
                      return (
                        <span key={`tk-${tIdx}`} className="text-amber-600 dark:text-amber-400 font-bold">
                          {tok.text}
                        </span>
                      );
                    }
                    if (isWinThorTable(tok.text)) {
                      return (
                        <span key={`tk-${tIdx}`} className="text-sky-600 dark:text-sky-400 font-semibold underline decoration-dotted decoration-sky-500/50">
                          {tok.text}
                        </span>
                      );
                    }
                    return <span key={`tk-${tIdx}`} className="text-foreground/90">{tok.text}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
