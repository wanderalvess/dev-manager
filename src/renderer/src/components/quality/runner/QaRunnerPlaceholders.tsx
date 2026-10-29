import React from 'react';
import { Check, Circle, Play, RefreshCw, Terminal } from 'lucide-react';
import type { QaRegressionTemplate } from '../../../../../shared/types';

interface QaRunnerIdleStateProps {
  selectedTemplate: QaRegressionTemplate | null;
  variablesCount: number;
  hasConnection: boolean;
  hasConnectionsConfigured: boolean;
  canRun: boolean;
  onRun: () => void;
  onNavigateToDatabase?: () => void;
}

const SetupStep: React.FC<{ done: boolean; optional?: boolean; children: React.ReactNode }> = ({
  done,
  optional,
  children
}) => (
  <li className="flex items-start gap-2">
    {done ? (
      <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
    ) : (
      <Circle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${optional ? 'text-muted-foreground/60' : 'text-warning'}`} />
    )}
    <div className={done ? 'text-foreground' : ''}>{children}</div>
  </li>
);

// Console vazio = roteiro de primeiro uso: mostra o que falta (e o porquê de o botão estar desabilitado)
export const QaRunnerIdleState: React.FC<QaRunnerIdleStateProps> = ({
  selectedTemplate,
  variablesCount,
  hasConnection,
  hasConnectionsConfigured,
  canRun,
  onRun,
  onNavigateToDatabase
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <div className="max-w-md w-full border border-border rounded-lg bg-card p-6 space-y-4 text-left">
        <div className="flex items-center gap-2.5 text-foreground border-b border-border pb-3">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            Console de Regressão Oracle
          </span>
        </div>
        <ol className="space-y-2.5 text-xs text-muted-foreground">
          <SetupStep done={hasConnection}>
            {hasConnection ? (
              'Conexão Oracle selecionada.'
            ) : hasConnectionsConfigured ? (
              'Escolha a conexão Oracle no campo "Banco", na barra acima.'
            ) : (
              <>
                Cadastre uma conexão Oracle de homologação.
                {onNavigateToDatabase && (
                  <button
                    type="button"
                    onClick={onNavigateToDatabase}
                    className="ml-1 text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Abrir Banco de Dados
                  </button>
                )}
              </>
            )}
          </SetupStep>
          <SetupStep done={!!selectedTemplate}>
            {selectedTemplate ? (
              <>
                Cenário: <b className="text-foreground font-mono">{selectedTemplate.name}</b> ({selectedTemplate.steps.length} queries).
              </>
            ) : (
              'Escolha um cenário no campo "Cenário", na barra acima.'
            )}
          </SetupStep>
          <SetupStep done={variablesCount > 0} optional>
            {variablesCount > 0
              ? `${variablesCount} bind(s) prontos para as queries.`
              : 'Opcional: cole o payload JSON à esquerda e clique em "Mapear Binds" para preencher os parâmetros.'}
          </SetupStep>
        </ol>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="w-full py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
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
