import React from 'react';
import { Check, Copy, Database, ExternalLink } from 'lucide-react';
import type { TraceDetails, TraceSpan } from '../../../../shared/types';
import { splitSqlTokens, type SpanTierCategory, type TimeBudgetData } from '../../utils/apmUiUtils';
import { ApmWaterfallControls } from './ApmWaterfallControls';
import { ApmWaterfallNode } from './ApmWaterfallNode';
import type { DetailTab } from './apmTypes';

export interface ApmTraceWaterfallProps {
  details: TraceDetails | null;
  activeSpan: TraceSpan | null;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
  tierFilter: SpanTierCategory | 'ALL';
  onTierFilterChange: React.Dispatch<React.SetStateAction<SpanTierCategory | 'ALL'>>;
  timeBudget: TimeBudgetData | null;
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
  onNavigateToDatabase?: () => void;
  onSelectTab: (tab: DetailTab) => void;
}

export const ApmTraceWaterfall: React.FC<ApmTraceWaterfallProps> = ({
  details, activeSpan, selectedSpanId, onSelectSpan, tierFilter, onTierFilterChange,
  timeBudget, copyToClipboard, copyFeedback, onNavigateToDatabase, onSelectTab
}) => (
  <div className="flex flex-col gap-2.5">
    <ApmWaterfallControls details={details} timeBudget={timeBudget} tierFilter={tierFilter} onTierFilterChange={onTierFilterChange} />
    <div className="flex flex-col gap-0.5">
      {details?.rootTree.map((node) => (
        <ApmWaterfallNode key={node.span.spanId} node={node} selectedSpanId={selectedSpanId} onSelectSpan={onSelectSpan} tierFilter={tierFilter} />
      ))}
    </div>
    {activeSpan && (
      <div className="mt-3 p-3 rounded-lg border border-border bg-card flex flex-col gap-2 font-mono text-xs shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{activeSpan.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-muted text-2xs text-muted-foreground">{activeSpan.kind}</span>
          </div>
          <span className={`font-semibold tabular-nums ${activeSpan.durationMs > 1000 ? 'text-danger font-bold' : 'text-success'}`}>
            {activeSpan.durationMs}ms
          </span>
        </div>
        {activeSpan.dbStatement && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold text-info flex items-center gap-1">
                <Database className="w-3 h-3 text-info" /> SQL ({activeSpan.dbSystem || 'oracle'})
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => copyToClipboard(activeSpan.dbStatement!, 'spanSql')} className="text-2xs hover:text-foreground cursor-pointer flex items-center gap-1">
                  {copyFeedback === 'spanSql' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  Copiar SQL
                </button>
                {onNavigateToDatabase && (
                  <button
                    type="button"
                    onClick={() => { copyToClipboard(activeSpan.dbStatement!, 'toDb'); onNavigateToDatabase(); }}
                    className="text-2xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" /> DB Studio
                  </button>
                )}
              </div>
            </div>
            <pre className="p-2.5 rounded bg-background border border-border text-foreground text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {splitSqlTokens(activeSpan.dbStatement).map((token, index) => (
                <span key={index} className={token.isKeyword ? 'text-info font-bold' : 'text-foreground'}>{token.text}</span>
              ))}
            </pre>
          </div>
        )}
        {(activeSpan.statusMessage || activeSpan.exception) && (
          <div className="p-2.5 rounded bg-danger/10 border border-danger/30 text-danger text-[11px] flex items-start justify-between gap-2">
            <span className="wrap-break-word min-w-0">
              <strong>Erro:</strong>{' '}
              {activeSpan.statusMessage || [activeSpan.exception?.type, activeSpan.exception?.message].filter(Boolean).join(': ')}
            </span>
            {activeSpan.exception?.stacktrace && (
              <button type="button" onClick={() => onSelectTab('error')} className="shrink-0 underline font-bold cursor-pointer hover:text-danger">
                Stacktrace &rarr;
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);
