import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Repeat, Timer } from 'lucide-react';
import type { TracerRoutineGroup } from '../../../../../shared/types';
import { formatTracerMs, repeatKindInfo, routineHeading } from '../../../utils/tracerAnalysisView';

interface RoutineGroupCardProps {
  group: TracerRoutineGroup;
  defaultOpen?: boolean;
  onInspect: (sqlId: string) => void;
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="text-2xs text-muted-foreground">
    {label} <span className="font-mono font-bold text-foreground">{value}</span>
  </span>
);

/** Uma rotina (módulo Oracle) com as telas que ela tocou, as consultas mais lentas e as repetidas. */
export const RoutineGroupCard: React.FC<RoutineGroupCardProps> = ({ group, defaultOpen = false, onInspect }) => {
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="border border-border/70 rounded-xl bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-left cursor-pointer hover:bg-card/70"
        aria-expanded={open}
      >
        <Chevron className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-bold text-foreground">{routineHeading(group.label, group.routineCode)}</span>
        {group.isExecutable && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-info/10 text-info">exe</span>
        )}
        <Stat label="SQLs" value={String(group.statementCount)} />
        <Stat label="Execuções" value={String(group.totalExecutions)} />
        <Stat label="Tempo total" value={formatTracerMs(group.totalElapsedMs)} />
        {group.repeated.length > 0 && (
          <span className="flex items-center gap-1 text-2xs font-semibold text-warning">
            <Repeat className="w-3 h-3" /> {group.repeated.length} repetida(s)
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50">
          {group.screens.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-1.5">
              {group.screens.map((screen) => (
                <span key={screen.action} className="text-2xs font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border text-muted-foreground">
                  {screen.action} · {screen.totalExecutions}x
                </span>
              ))}
            </div>
          )}

          <section>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
              <Timer className="w-3 h-3" /> Mais lentas (tempo médio por execução)
            </h4>
            {group.slowest.length === 0 ? (
              <p className="text-2xs text-muted-foreground">Sem tempo medido para estas consultas.</p>
            ) : (
              <ul className="space-y-1">
                {group.slowest.map((s) => (
                  <li key={s.sqlId}>
                    <button
                      type="button"
                      onClick={() => onInspect(s.sqlId)}
                      className="w-full text-left rounded-md border border-border/60 px-2 py-1.5 hover:border-info/40 cursor-pointer"
                      title="Abrir no inspetor"
                    >
                      <span className="font-mono text-2xs font-bold text-warning">{formatTracerMs(s.avgElapsedMs)}</span>
                      <span className="text-2xs text-muted-foreground"> × {s.executions} · total {formatTracerMs(s.totalElapsedMs)}</span>
                      {s.bufferGetsPerExec !== null && (
                        <span className="text-2xs text-muted-foreground"> · {Math.round(s.bufferGetsPerExec)} leituras/exec</span>
                      )}
                      <span className="block font-mono text-2xs text-foreground truncate">{s.sqlPreview}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {group.repeated.length > 0 && (
            <section>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <Repeat className="w-3 h-3" /> Repetidas (possível N+1)
              </h4>
              <ul className="space-y-1">
                {group.repeated.map((r) => {
                  const info = repeatKindInfo(r.kind);
                  return (
                    <li key={r.normalizedSql} className="rounded-md border border-warning/30 bg-warning/5 px-2 py-1.5">
                      <button type="button" onClick={() => onInspect(r.sqlIds[0])} className="w-full text-left cursor-pointer" title="Abrir no inspetor">
                        <span className="text-2xs font-bold text-warning">{info.title}</span>
                        <span className="text-2xs text-muted-foreground">
                          {' '}· {r.totalExecutions} execuções · {r.sqlIds.length} SQL_ID · {formatTracerMs(r.totalElapsedMs)}
                        </span>
                        <span className="block font-mono text-2xs text-foreground truncate">{r.normalizedSql}</span>
                      </button>
                      <p className="text-2xs text-muted-foreground mt-0.5">{info.hint}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
