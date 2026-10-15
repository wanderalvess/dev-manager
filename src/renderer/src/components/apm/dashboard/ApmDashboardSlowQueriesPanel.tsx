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
    <div className="p-4 rounded-xl bg-card border border-border shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-warning" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
            Top Slow Queries (Oracle / Banco)
          </h4>
        </div>
        <span className="text-2xs text-muted-foreground font-mono">
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
                className="py-2.5 flex flex-col gap-1.5 group hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-2xs font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        severity === 'critical'
                          ? 'bg-danger/15 text-danger border border-danger/30'
                          : severity === 'slow'
                          ? 'bg-warning/15 text-warning border border-warning/30'
                          : 'bg-success/15 text-success border border-success/30'
                      }`}
                    >
                      {severity === 'critical' ? 'Crítica' : severity === 'slow' ? 'Lenta' : 'Normal'}
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground">
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
                        className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-2xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Search className="w-3 h-3 text-muted-foreground" />
                        Filtrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenInDbStudio(sq.statement)}
                      title="Abrir query no DB Studio para executar ou Explain Plan"
                      className="px-2 py-0.5 rounded bg-warning/15 text-warning hover:bg-warning/25 border border-warning/30 text-2xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Database className="w-3 h-3 text-warning" />
                      DB Studio
                    </button>
                    {onSelectTrace && sq.sampleTraceId && (
                      <button
                        type="button"
                        onClick={() => onSelectTrace(sq.sampleTraceId)}
                        title="Ver trace com esta query no Waterfall" aria-label="Ver trace com esta query no Waterfall"
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview da Instrução SQL com Realce de Palavras-Chave e Tabelas WinThor (PC*) */}
                <div className="p-2 rounded bg-muted border border-border/80 font-mono text-2xs overflow-x-auto whitespace-pre leading-relaxed no-scrollbar">
                  {tokens.map((tok, tIdx) => {
                    if (tok.isKeyword) {
                      return (
                        <span key={`tk-${tIdx}`} className="text-warning font-bold">
                          {tok.text}
                        </span>
                      );
                    }
                    if (isWinThorTable(tok.text)) {
                      return (
                        <span key={`tk-${tIdx}`} className="text-info font-semibold underline decoration-dotted decoration-sky-500/50">
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
