import React from 'react';
import { Table } from 'lucide-react';
import type { QaRegressionAssertion, QaRegressionStep } from '../../../../../shared/types';
import { extractBindsFromSql } from '../../../utils/qaRegressionRendererUtils';
import { QaTemplateAssertionRow } from './QaTemplateAssertionRow';

interface QaTemplateStepEditorProps {
  step: QaRegressionStep;
  onChange: (step: QaRegressionStep) => void;
  onAddAssertion: () => void;
  onUpdateAssertion: (assIndex: number, assertion: QaRegressionAssertion) => void;
  onRemoveAssertion: (assIndex: number) => void;
}

export const QaTemplateStepEditor: React.FC<QaTemplateStepEditorProps> = ({
  step,
  onChange,
  onAddAssertion,
  onUpdateAssertion,
  onRemoveAssertion
}) => {
  const detectedBinds = extractBindsFromSql(step.query);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Título do Passo:
          </label>
          <input
            type="text"
            value={step.title}
            onChange={(e) => onChange({ ...step, title: e.target.value })}
            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Tabela Principal WinThor:
          </label>
          <input
            type="text"
            value={step.tableName || ''}
            onChange={(e) => onChange({ ...step, tableName: e.target.value.toUpperCase() })}
            placeholder="ex: PCNFSAID, PCPEDC, PCMOV"
            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs font-mono uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Editor SQL da Query */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Comando SQL (suporta :binds como :codFilial, :numCupom):
          </label>
          {detectedBinds.length > 0 && (
            <span className="text-[10px] text-primary font-mono font-semibold">
              Binds detectados: {detectedBinds.map((b) => `:${b}`).join(', ')}
            </span>
          )}
        </div>
        <textarea
          value={step.query}
          onChange={(e) => onChange({ ...step, query: e.target.value })}
          rows={6}
          className="w-full bg-background border border-border rounded-md p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Asserções deste Passo */}
      <div className="border border-border rounded-md bg-card p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-primary" />
            <span>Regras de Asserção de Colunas</span>
          </span>
          <button
            type="button"
            onClick={onAddAssertion}
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            + Adicionar Coluna
          </button>
        </div>

        {step.assertions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 italic text-center font-mono">
            Nenhuma asserção configurada. O passo apenas executará a query e retornará as linhas.
          </p>
        ) : (
          <div className="space-y-1.5">
            {step.assertions.map((ass, aIdx) => (
              <QaTemplateAssertionRow
                key={ass.id}
                assertion={ass}
                onChange={(next) => onUpdateAssertion(aIdx, next)}
                onRemove={() => onRemoveAssertion(aIdx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
