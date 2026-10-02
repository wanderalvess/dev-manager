import React from 'react';
import { Check, Copy, Database, ExternalLink } from 'lucide-react';
import type { TraceSpan } from '../../../../shared/types';
import { splitSqlTokens } from '../../utils/apmUiUtils';

export interface ApmSqlSpansProps {
  spans: TraceSpan[];
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
  onNavigateToDatabase?: () => void;
}

export const ApmSqlSpans: React.FC<ApmSqlSpansProps> = ({
  spans, copyToClipboard, copyFeedback, onNavigateToDatabase
}) => (
  <div className="flex flex-col gap-3 font-mono text-xs">
    {spans.filter((span) => !!span.dbStatement).map((span, index) => (
      <div key={span.spanId} className="p-3 rounded-lg border border-border bg-card flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Query #{index + 1} ({span.durationMs}ms)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(span.dbStatement!, `sql-${span.spanId}`)}
              className="px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-[10px] text-foreground cursor-pointer flex items-center gap-1"
            >
              {copyFeedback === `sql-${span.spanId}` ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copiar SQL
            </button>
            {onNavigateToDatabase && (
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(span.dbStatement!, 'toDb');
                  onNavigateToDatabase();
                }}
                className="px-2 py-0.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-[10px] text-primary cursor-pointer flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir no DB Studio
              </button>
            )}
          </div>
        </div>
        <pre className="p-2.5 rounded bg-background border border-border text-foreground text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {splitSqlTokens(span.dbStatement!).map((token, tokenIndex) => (
            <span key={tokenIndex} className={token.isKeyword ? 'text-sky-700 dark:text-sky-400 font-bold' : 'text-foreground'}>
              {token.text}
            </span>
          ))}
        </pre>
      </div>
    ))}
  </div>
);
