import React from 'react';
import { Play, RefreshCw, Terminal } from 'lucide-react';
import type { QaRegressionTemplate } from '../../../../../shared/types';

interface QaRunnerIdleStateProps {
  selectedTemplate: QaRegressionTemplate | null;
  variablesCount: number;
  canRun: boolean;
  onRun: () => void;
}

export const QaRunnerIdleState: React.FC<QaRunnerIdleStateProps> = ({
  selectedTemplate,
  variablesCount,
  canRun,
  onRun
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <div className="max-w-md w-full border border-border rounded-lg bg-card p-6 space-y-4 text-left">
        <div className="flex items-center gap-2.5 text-foreground border-b border-border pb-3">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            Console de Regressão Oracle
          </span>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>
            {selectedTemplate ? (
              <>
                Cenário selecionado: <b className="text-foreground font-mono">{selectedTemplate.name}</b> ({selectedTemplate.steps.length} queries).
              </>
            ) : (
              'Nenhum cenário selecionado.'
            )}
          </p>
          <p>
            Binds carregados: <span className="font-mono text-foreground font-semibold">{variablesCount}</span> parâmetros prontos para interpolação.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="w-full py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Executar Bateria de Testes</span>
        </button>
      </div>
    </div>
  );
};

export const QaRunnerRunningState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
      <h3 className="text-sm font-bold text-foreground mb-1 font-mono">
        Executando Bateria de Asserções...
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm">
        Consultando tabelas do WinThor no banco Oracle e avaliando a conformidade de cada coluna.
      </p>
    </div>
  );
};
