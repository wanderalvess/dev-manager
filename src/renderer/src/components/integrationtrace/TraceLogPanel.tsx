import React from 'react';
import { ScrollText } from 'lucide-react';
import type { IntegrationLogExcerpt } from '../../../../shared/integrationTypes';
import { isErrorLogLine } from '../../../../shared/integrationLogUtils';

const SOURCE_LABELS: Record<IntegrationLogExcerpt['source'], string> = { wsh: 'WSH', ch: 'CH' };

interface TraceLogPanelProps {
  excerpts: IntegrationLogExcerpt[];
}

/** Linhas dos logs que citam o lote, uma caixa por camada; a linha de erro fica em vermelho. */
export const TraceLogPanel: React.FC<TraceLogPanelProps> = ({ excerpts }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
      <ScrollText className="w-4 h-4 text-muted-foreground" /> Logs que citam o lote
    </h3>
    {excerpts.map((excerpt) => (
      <div key={excerpt.source} className="space-y-1.5" data-log-source={excerpt.source}>
        <p className="text-2xs text-muted-foreground">
          <span className="font-semibold text-foreground">{SOURCE_LABELS[excerpt.source]}</span>
          {excerpt.totalMatches === 0
            ? ': nenhuma linha cita o lote nas últimas linhas do log.'
            : `: ${excerpt.totalMatches} linha(s) citam o lote${excerpt.errorLines > 0 ? `, ${excerpt.errorLines} com erro` : ''}${
                excerpt.truncated ? `; mostrando as ${excerpt.lines.length} mais recentes` : ''
              }.`}
        </p>
        {excerpt.lines.length > 0 && (
          <pre className="text-2xs font-mono bg-muted/50 rounded-lg px-2.5 py-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">
            {excerpt.lines.map((line, index) => (
              <span key={index} className={`block ${isErrorLogLine(line) ? 'text-danger' : 'text-muted-foreground'}`}>
                {line}
              </span>
            ))}
          </pre>
        )}
      </div>
    ))}
  </div>
);
