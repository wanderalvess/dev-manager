import React from 'react';
import { Activity } from 'lucide-react';
import type { TraceSummary } from '../../../../shared/types';
import { buildApmSetupSnippets, getMethodBadgeClass, getStatusBadgeClass } from '../../utils/apmUiUtils';

export interface ApmTraceListProps {
  displayedTraces: TraceSummary[];
  rawTraces: TraceSummary[];
  selectedTraceId: string | null;
  maxListDuration: number;
  setupSnippets: ReturnType<typeof buildApmSetupSnippets>;
  onSelectTrace: (traceId: string) => void;
  onOpenSetup: () => void;
  onResetFilters: () => void;
}

export const ApmTraceList: React.FC<ApmTraceListProps> = ({
  displayedTraces, rawTraces, selectedTraceId, maxListDuration, setupSnippets,
  onSelectTrace, onOpenSetup, onResetFilters
}) => (
        <section
          aria-label="Lista de Traces"
          className={`h-full flex flex-col overflow-hidden transition-all duration-200 ${
            selectedTraceId ? 'w-[56%] border-r border-border' : 'w-full'
          }`}
        >
          <div className="flex-1 overflow-auto">
            {displayedTraces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
                  <Activity className="w-7 h-7 radar-live" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  {rawTraces.length === 0 ? 'Aguardando telemetria OpenTelemetry' : 'Nenhum trace para os filtros aplicados'}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {rawTraces.length === 0 ? (
                    <>
                      Envie spans OTLP/HTTP para{' '}
                      <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono text-2xs">
                        {setupSnippets.tracesUrl}
                      </code>
                    </>
                  ) : (
                    'Tente remover o filtro de busca ou alterar o espectro de latência para visualizar outros traces.'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {rawTraces.length === 0 ? (
                    <button
                      type="button"
                      onClick={onOpenSetup}
                      className="h-8 px-3 rounded border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition cursor-pointer"
                    >
                      Instruções de Conexão
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onResetFilters();
                      }}
                      className="h-8 px-3 rounded border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition cursor-pointer"
                    >
                      Resetar Filtros
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                <thead className="sticky top-0 z-10 bg-card border-b border-border text-2xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-16 text-center">Status</th>
                    <th className="py-2 px-2.5 w-16">Método</th>
                    <th className="py-2 px-3">Rota / Endpoint</th>
                    <th className="py-2 px-2.5 w-28 hidden lg:table-cell">Serviço</th>
                    <th className="py-2 px-3 w-36">Duração</th>
                    <th className="py-2 px-2.5 w-16 text-center hidden md:table-cell">Spans</th>
                    <th className="py-2 px-3 w-24 text-right">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {displayedTraces.map((trace) => {
                    const isSelected = trace.traceId === selectedTraceId;
                    const durationRatio = Math.max(2, Math.min(100, (trace.durationMs / maxListDuration) * 100));

                    return (
                      <tr
                        key={trace.traceId}
                        onClick={() => onSelectTrace(trace.traceId)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 hover:bg-primary/20'
                            : trace.hasError
                            ? 'bg-rose-500/10 hover:bg-rose-500/15'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        {/* Status Code */}
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-2xs font-bold ${getStatusBadgeClass(
                              trace.httpStatusCode,
                              trace.hasError
                            )}`}
                          >
                            {trace.httpStatusCode || (trace.hasError ? 'ERR' : 'OK')}
                          </span>
                        </td>

                        {/* Método HTTP */}
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-2xs font-bold ${getMethodBadgeClass(
                              trace.httpMethod
                            )}`}
                          >
                            {trace.httpMethod || 'HTTP'}
                          </span>
                        </td>

                        {/* Rota / Nome */}
                        <td className="py-1.5 px-3 truncate max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">
                              {trace.httpRoute || trace.rootSpanName}
                            </span>
                            {trace.hasDatabaseQuery && (
                              <span
                                className="px-1 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:bg-sky-950/50 dark:border-sky-800/60 dark:text-sky-400 text-2xs font-bold shrink-0"
                                title="Executa consultas no banco de dados (Oracle/Postgres)"
                              >
                                SQL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Serviço */}
                        <td className="py-1.5 px-2.5 text-muted-foreground truncate hidden lg:table-cell text-2xs">
                          {trace.serviceName}
                        </td>

                        {/* Duração + Microbarra */}
                        <td className="py-1.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-2xs font-medium leading-none ${
                                trace.durationMs > 1000
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : trace.durationMs > 400
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-foreground'
                              }`}
                            >
                              {trace.durationMs >= 1000
                                ? `${(trace.durationMs / 1000).toFixed(2)}s`
                                : `${trace.durationMs}ms`}
                            </span>
                            <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${durationRatio}%` }}
                                className={`h-full rounded-full ${
                                  trace.hasError
                                    ? 'bg-rose-500'
                                    : trace.durationMs > 1000
                                    ? 'bg-amber-500'
                                    : 'bg-primary'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Qtd Spans */}
                        <td className="py-1.5 px-2.5 text-center text-muted-foreground hidden md:table-cell text-2xs">
                          {trace.spanCount}
                        </td>

                        {/* Horário */}
                        <td className="py-1.5 px-3 text-right text-muted-foreground text-2xs">
                          {new Date(trace.startTimeUnixMs).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
);
