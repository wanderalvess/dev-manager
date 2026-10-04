import React from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Code2, Table } from 'lucide-react';
import type { QaStepExecutionResult } from '../../../../../shared/types';
import { QaRunnerAssertionsTable } from './QaRunnerAssertionsTable';

interface QaRunnerStepCardProps {
  step: QaStepExecutionResult;
  isExpanded: boolean;
  onToggle: (stepId: string) => void;
  onShowSql: (title: string, sql: string) => void;
  onShowRows: (title: string, rows: any[]) => void;
}

export const QaRunnerStepCard: React.FC<QaRunnerStepCardProps> = ({
  step,
  isExpanded,
  onToggle,
  onShowSql,
  onShowRows
}) => {
  return (
    <div
      className={`border rounded-md bg-card overflow-hidden transition-colors ${
        step.success
          ? 'border-border border-l-4 border-l-emerald-500'
          : 'border-border border-l-4 border-l-rose-500'
      }`}
    >
      {/* Header do Passo */}
      <div
        onClick={() => onToggle(step.stepId)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/30 select-none"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}

          {step.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}

          {step.tableName && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-muted text-foreground border border-border shrink-0">
              {step.tableName}
            </span>
          )}

          <span className="text-xs font-semibold text-foreground truncate">{step.stepTitle}</span>

          <span className="text-[10px] text-muted-foreground ml-auto shrink-0 font-mono tabular-nums">
            {step.rowCount} reg • {step.executionTimeMs}ms
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onShowSql(step.stepTitle, step.interpolatedQuery || step.query)}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 border border-border"
            title="Visualizar query SQL executada com binds preenchidos"
          >
            <Code2 className="w-3 h-3" />
            <span>SQL</span>
          </button>

          {step.rows && step.rows.length > 0 && (
            <button
              type="button"
              onClick={() => onShowRows(`${step.stepTitle} (Linhas Retornadas)`, step.rows || [])}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 border border-border"
              title="Visualizar registros retornados pelo banco"
            >
              <Table className="w-3 h-3" />
              <span>Dados ({step.rows.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Corpo com Tabela de Asserções */}
      {isExpanded && (
        <div className="border-t border-border px-3.5 py-2.5 bg-background/50">
          <QaRunnerAssertionsTable step={step} />
        </div>
      )}
    </div>
  );
};
