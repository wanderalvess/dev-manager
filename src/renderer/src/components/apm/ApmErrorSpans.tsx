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
        <div key={span.spanId} className="p-3 rounded-lg border border-danger/30 bg-danger/10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-2xs text-danger font-bold">
            <span className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" />
              <span className="truncate" title={span.name}>{span.name}</span>
              <span className="px-1 rounded bg-danger/15 text-2xs font-semibold shrink-0">{span.kind}</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(formatSpanErrorForClipboard(span), `err-${span.spanId}`)}
              className="px-2 py-0.5 rounded border border-danger/30 bg-danger/15 text-2xs text-danger hover:bg-danger/25 cursor-pointer flex items-center gap-1 shrink-0"
            >
              {copyFeedback === `err-${span.spanId}` ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              Copiar Erro
            </button>
          </div>
          {(exceptionHeadline || span.statusMessage) && (
            <div className="text-2xs text-danger wrap-break-word select-text">
              {exceptionHeadline || span.statusMessage}
            </div>
          )}
          {span.exception?.stacktrace ? (
            <pre className="p-2.5 rounded bg-card border border-danger/30 text-danger text-2xs overflow-auto max-h-80 whitespace-pre leading-relaxed select-text">
              {span.exception.stacktrace}
            </pre>
          ) : (
            !exceptionHeadline && !span.statusMessage && (
              <pre className="p-2.5 rounded bg-card border border-danger/30 text-danger text-2xs whitespace-pre-wrap leading-relaxed">
                {span.httpStatusCode ? `HTTP ${span.httpStatusCode} sem mensagem de erro` : 'Erro sem mensagem explícita'}
              </pre>
            )
          )}
        </div>
      );
    })}
  </div>
);
