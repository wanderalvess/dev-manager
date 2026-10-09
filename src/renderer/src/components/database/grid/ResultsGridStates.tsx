import React from 'react';
import { Terminal, AlertCircle, CheckCircle2, Info, RotateCw } from 'lucide-react';
import type { QueryResult } from '../../../../../shared/types';

interface ResultsGridStatesProps {
  queryResult: QueryResult | null;
  isExecuting: boolean;
}

/** Estados sem tabela (executando, vazio, erro, comando sem retorno). Retorna null quando há grade a exibir. */
export const ResultsGridStates: React.FC<ResultsGridStatesProps> = ({ queryResult, isExecuting }) => {
  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-primary opacity-80" />
        <p className="font-semibold text-foreground text-sm">Executando consulta no banco de dados...</p>
        <span className="text-2xs opacity-70">Aguardando resposta do servidor...</span>
      </div>
    );
  }

  if (!queryResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
        <Terminal className="w-8 h-8 opacity-40" />
        <p>Execute uma consulta ou comando SQL para visualizar os resultados aqui.</p>
        <span className="text-2xs opacity-60">Dica: use Ctrl+Enter para executar direto do editor.</span>
      </div>
    );
  }

  if (!queryResult.success) {
    return (
      <div className="p-4 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
        <div className="flex items-center space-x-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Falha na execução do SQL:</span>
        </div>
        <pre className="font-mono text-2xs whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
          {queryResult.error}
        </pre>
      </div>
    );
  }

  if (!queryResult.isQuery) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Comando executado com sucesso!</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {queryResult.affectedRows !== undefined
            ? `${queryResult.affectedRows} linha(s) afetada(s) no banco de dados.`
            : 'Comando processado sem retorno de linhas.'}
        </p>
        <span className="text-2xs font-mono text-muted-foreground mt-2">
          Tempo decorrido: {queryResult.executionTimeMs} ms
        </span>
      </div>
    );
  }

  if (queryResult.rows && queryResult.rows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
        <Info className="w-6 h-6 opacity-40 mb-1" />
        <p>A consulta não retornou nenhuma linha.</p>
      </div>
    );
  }

  return null;
};
