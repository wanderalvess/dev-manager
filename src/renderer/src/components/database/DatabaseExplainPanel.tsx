import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import type { ExplainPlanResult } from '../../../../shared/types';

interface DatabaseExplainPanelProps {
  explainResult: ExplainPlanResult | null;
}

export const DatabaseExplainPanel: React.FC<DatabaseExplainPanelProps> = ({ explainResult }) => (
  <div className="p-4 space-y-4">
    {!explainResult ? (
      <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
        <Zap className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
        <p className="font-semibold text-foreground">Nenhum Explain Plan gerado ainda.</p>
        <span className="text-[11px] opacity-70">
          Clique no botão "Explain Plan" na barra superior para inspecionar o plano de execução da query.
        </span>
      </div>
    ) : !explainResult.success ? (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
        <div className="flex items-center space-x-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Falha ao gerar Explain Plan:</span>
        </div>
        <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
          {explainResult.error}
        </pre>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/70">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Plano de Execução Analisado
          </span>
          <span>
            Tempo de Análise: <strong className="text-foreground">{explainResult.executionTimeMs} ms</strong>
          </span>
        </div>
        <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-3.5 overflow-x-auto shadow-inner">
          <pre className="text-[11px] leading-relaxed font-mono text-amber-300/90 whitespace-pre">
            {explainResult.planLines.length > 0
              ? explainResult.planLines.join('\n')
              : 'Nenhuma linha retornada pelo plano de execução.'}
          </pre>
        </div>
      </div>
    )}
  </div>
);
