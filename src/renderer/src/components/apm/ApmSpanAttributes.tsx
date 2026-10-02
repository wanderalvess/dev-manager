import React from 'react';
import type { TraceSpan } from '../../../../shared/types';

export const ApmSpanAttributes: React.FC<{ span: TraceSpan | null }> = ({ span }) => (
  <div className="flex flex-col gap-2 font-mono text-xs">
    <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between gap-2">
      <span className="truncate">
        Span <strong className="text-foreground">{span?.name}</strong>
        {span && <span className="ml-1">({span.kind})</span>}
      </span>
      <span className="shrink-0 text-[10px]">Selecione outro span no Waterfall</span>
    </div>
    {span && Object.keys(span.attributes).length > 0 ? (
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border/50 bg-card">
        {Object.entries(span.attributes).map(([key, value]) => (
          <div key={key} className="p-2 flex items-start justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground shrink-0 select-text">{key}</span>
            <span className="text-foreground text-right break-all font-semibold select-text">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[11px] text-muted-foreground">Este span não possui atributos.</p>
    )}
  </div>
);
