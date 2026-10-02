import React from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import type { TraceSpan } from '../../../../shared/types';
import { formatSpanErrorForClipboard } from '../../utils/apmUiUtils';

export const ApmErrorSpans: React.FC<{
  spans: TraceSpan[];
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
}> = ({ spans, copyToClipboard, copyFeedback }) => (
  <div className="flex flex-col gap-3 font-mono text-xs">
    {spans.map((span) => {
      const exceptionHeadline = [span.exception?.type, span.exception?.message].filter(Boolean).join(': ');
      return (
        <div key={span.spanId} className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 dark:border-rose-800/60 dark:bg-rose-950/30 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-rose-800 dark:text-rose-300 font-bold">
            <span className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate" title={span.name}>{span.name}</span>
              <span className="px-1 rounded bg-rose-500/15 text-[9px] font-semibold shrink-0">{span.kind}</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(formatSpanErrorForClipboard(span), `err-${span.spanId}`)}
              className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/15 text-[10px] text-rose-700 hover:bg-rose-500/25 dark:border-rose-800/80 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60 cursor-pointer flex items-center gap-1 shrink-0"
            >
              {copyFeedback === `err-${span.spanId}` ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copiar Erro
            </button>
          </div>
          {(exceptionHeadline || span.statusMessage) && (
            <div className="text-[11px] text-rose-800 dark:text-rose-300 break-words select-text">
              {exceptionHeadline || span.statusMessage}
            </div>
          )}
          {span.exception?.stacktrace ? (
            <pre className="p-2.5 rounded bg-card border border-rose-500/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[10.5px] overflow-auto max-h-80 whitespace-pre leading-relaxed select-text">
              {span.exception.stacktrace}
            </pre>
          ) : (
            !exceptionHeadline && !span.statusMessage && (
              <pre className="p-2.5 rounded bg-card border border-rose-500/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                {span.httpStatusCode ? `HTTP ${span.httpStatusCode} sem mensagem de erro` : 'Erro sem mensagem explícita'}
              </pre>
            )
          )}
        </div>
      );
    })}
  </div>
);
