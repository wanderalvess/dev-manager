import React from 'react';
import type { QaStepExecutionResult } from '../../../../../shared/types';
import {
  getAssertionBadgeClass,
  getAssertionBadgeLabel,
  getAssertionRowClass
} from '../../../utils/qaRunnerUtils';

interface QaRunnerAssertionsTableProps {
  step: QaStepExecutionResult;
}

export const QaRunnerAssertionsTable: React.FC<QaRunnerAssertionsTableProps> = ({ step }) => {
  if (step.error) {
    return (
      <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
        <b className="font-bold">Erro na Execução da Query:</b> {step.error}
      </div>
    );
  }

  if (step.assertions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-mono italic">
        Nenhuma asserção configurada para este passo. {step.rowCount} registro(s) obtido(s).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-2xs font-mono text-muted-foreground uppercase">
            <th className="py-1 px-2 w-48">Coluna / Campo</th>
            <th className="py-1 px-2 w-40">Esperado</th>
            <th className="py-1 px-2 w-40">Retornado no Banco</th>
            <th className="py-1 px-2 w-24 text-center">Status</th>
            <th className="py-1 px-2">Detalhes / Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono text-2xs">
          {step.assertions.map((ass) => (
            <tr key={ass.assertionId} className={getAssertionRowClass(ass.status)}>
              <td className="py-1.5 px-2 font-semibold text-foreground">{ass.column}</td>
              <td className="py-1.5 px-2 text-muted-foreground">{ass.expectedDisplay}</td>
              <td className="py-1.5 px-2 font-semibold text-foreground">{ass.actualDisplay}</td>
              <td className="py-1.5 px-2 text-center">
                <span
                  className={`px-1.5 py-0.2 rounded text-2xs font-mono font-bold uppercase inline-block border ${getAssertionBadgeClass(ass.status)}`}
                >
                  {getAssertionBadgeLabel(ass.status)}
                </span>
              </td>
              <td className="py-1.5 px-2 text-2xs font-sans text-muted-foreground">
                {ass.message || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
