import React, { useMemo, useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import type { ExplainPlanResult } from '../../../../shared/types';
import { parseExplainPlan } from '../../utils/explainPlanUtils';
import { ExplainTree } from './ExplainTree';

interface DatabaseExplainPanelProps {
  explainResult: ExplainPlanResult | null;
}

export const DatabaseExplainPanel: React.FC<DatabaseExplainPanelProps> = ({ explainResult }) => {
  const [view, setView] = useState<'tree' | 'text'>('tree');
  // MySQL (e qualquer formato desconhecido) não vira árvore: continua no texto
  const plan = useMemo(() => (explainResult?.success ? parseExplainPlan(explainResult.planLines) : null), [explainResult]);
  const showTree = view === 'tree' && !!plan;

  return (
  <div className="p-4 space-y-4">
    {!explainResult ? (
      <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
        <Zap className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
        <p className="font-semibold text-foreground">Nenhum Explain Plan gerado ainda.</p>
        <span className="text-2xs opacity-70">
          Clique no botão "Explain Plan" na barra superior para inspecionar o plano de execução da query.
        </span>
      </div>
    ) : !explainResult.success ? (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
        <div className="flex items-center space-x-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Falha ao gerar Explain Plan:</span>
        </div>
        <pre className="font-mono text-2xs whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
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
          <span className="flex items-center gap-3">
            {plan && (
              <span role="group" aria-label="Formato do plano" className="flex rounded-md border border-border/70 overflow-hidden">
                {(['tree', 'text'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`px-2.5 py-0.5 text-2xs font-semibold cursor-pointer ${view === v ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
                  >
                    {v === 'tree' ? 'Árvore' : 'Texto'}
                  </button>
                ))}
              </span>
            )}
            <span>
              Tempo de Análise: <strong className="text-foreground">{explainResult.executionTimeMs} ms</strong>
            </span>
          </span>
        </div>
        {showTree && plan ? (
          <ExplainTree plan={plan} />
        ) : (
          <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-3 overflow-x-auto shadow-inner">
            <pre className="text-2xs leading-relaxed font-mono text-amber-300/90 whitespace-pre">
              {explainResult.planLines.length > 0
                ? explainResult.planLines.join('\n')
                : 'Nenhuma linha retornada pelo plano de execução.'}
            </pre>
          </div>
        )}
      </div>
    )}
  </div>
  );
};
