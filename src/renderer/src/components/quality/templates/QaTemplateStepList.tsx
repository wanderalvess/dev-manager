import React from 'react';
import { Trash2 } from 'lucide-react';
import type { QaRegressionStep } from '../../../../../shared/types';

interface QaTemplateStepListProps {
  steps: QaRegressionStep[];
  activeStepIndex: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}

export const QaTemplateStepList: React.FC<QaTemplateStepListProps> = ({
  steps,
  activeStepIndex,
  onSelect,
  onAdd,
  onRemove
}) => (
  <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/40 flex flex-col shrink-0 overflow-hidden">
    <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
      <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
        Passos / Queries ({steps.length})
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="text-xs text-primary font-semibold hover:underline cursor-pointer"
      >
        + Passo
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {steps.map((step, idx) => (
        <div
          key={step.id}
          onClick={() => onSelect(idx)}
          className={`p-2.5 rounded-md text-xs cursor-pointer border transition-colors flex items-center justify-between ${
            activeStepIndex === idx
              ? 'bg-card border-primary/40 border-l-2 border-l-primary text-foreground font-semibold shadow-2xs'
              : 'bg-card/50 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <div className="truncate flex-1 pr-2">
            <div className="text-2xs text-muted-foreground font-mono">
              #{String(idx + 1).padStart(2, '0')} {step.tableName ? `[${step.tableName}]` : ''}
            </div>
            <div className="truncate font-sans">{step.title}</div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(idx);
            }}
            className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer transition-colors"
            title="Excluir passo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  </div>
);
