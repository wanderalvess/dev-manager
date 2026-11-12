import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { ObservabilityOverview, TraceDetails } from '../../../shared/types';

export const ApmPage: React.FC<{
  isActive: boolean;
  onNavigateToSettings: () => void;
  onNavigateToDatabase: () => void;
}> = () => {
  const [overview, setOverview] = useState<ObservabilityOverview | null>(null);
  const [traces, setTraces] = useState<TraceDetails[]>([]);
  const [selected, setSelected] = useState<TraceDetails | null>(null);

  useEffect(() => {
    fetch('/api/apm/overview')
      .then((r) => r.json())
      .then((d) => {
        setOverview(d.overview);
        setTraces(d.traces || []);
        if (d.traces?.[0]) setSelected(d.traces[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div>
        <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> APM &amp; Traces Distribuídos (OTLP :4318)
        </h1>
        <p className="text-xs text-muted-foreground">Waterfall semântico HTTP / Java / JDBC e detecção de gargalos.</p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total de Traces', value: overview.totalTraces },
            { label: 'Taxa de Erro', value: `${overview.errorRatePercent}%` },
            { label: 'Latência Média', value: `${overview.avgDurationMs} ms` },
            { label: 'P95', value: `${overview.p95DurationMs} ms` }
          ].map((m) => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-3.5">
              <div className="text-2xs text-muted-foreground">{m.label}</div>
              <div className="text-xl font-extrabold font-mono text-foreground mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Traces Capturados</h2>
          {traces.map((t) => (
            <button
              key={t.traceId}
              type="button"
              onClick={() => setSelected(t)}
              className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                selected?.traceId === t.traceId ? 'bg-accent border-primary/40' : 'bg-muted/20 border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="font-mono text-foreground">{t.rootOperation}</span>
                <span className={t.errorCount > 0 ? 'text-danger' : 'text-success'}>{t.httpStatus} • {t.durationMs}ms</span>
              </div>
              <div className="text-2xs text-muted-foreground mt-0.5">{t.rootService} • {t.spanCount} spans</div>
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Waterfall de Spans</h2>
          {selected ? (
            <div className="space-y-2">
              {selected.spans.map((sp) => {
                const leftPct = Math.round((sp.startOffsetMs / Math.max(1, selected.durationMs)) * 100);
                const widthPct = Math.max(4, Math.round((sp.durationMs / Math.max(1, selected.durationMs)) * 100));
                return (
                  <div key={sp.spanId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground truncate">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-2xs mr-1.5">{sp.kind}</span>
                        {sp.name}
                      </span>
                      <span className="font-mono text-2xs text-muted-foreground">{sp.durationMs}ms</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full relative overflow-hidden">
                      <div
                        className={`h-full rounded-full absolute ${sp.status === 'error' ? 'bg-danger' : 'bg-primary'}`}
                        style={{ left: `${leftPct}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
