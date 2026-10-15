import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import type { DeployStep } from '../../../../shared/types';

interface DeployStepListProps {
  steps: DeployStep[];
  editingStepIndex: number | null;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
}

export const DeployStepList: React.FC<DeployStepListProps> = ({
  steps,
  editingStepIndex,
  onSelect,
  onAdd,
  onMove,
  onDuplicate,
  onRemove
}) => (
  <div className="w-80 md:w-96 border-r border-border flex flex-col bg-muted/10 shrink-0">
    <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
      <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
        Etapas na Sequência ({steps.length})
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
      {steps.length === 0 ? (
        <div className="text-center py-10 px-4 text-xs text-muted-foreground">
          Nenhuma etapa cadastrada. Clique em "+ Adicionar" acima para começar.
        </div>
      ) : (
        steps.map((step, idx) => {
          const isSelected = editingStepIndex === idx;
          return (
            <div
              key={step.id}
              onClick={() => onSelect(idx)}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                  : 'border-border/60 bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-muted text-2xs font-bold text-muted-foreground shrink-0">
                  {idx + 1}
                </span>
                <div className="truncate">
                  <p className="font-bold text-foreground truncate">{step.name || 'Sem nome'}</p>
                  <span className="text-2xs text-muted-foreground font-mono">{step.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-50"
                  title="Mover para cima" aria-label="Mover para cima"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, 'down')}
                  disabled={idx === steps.length - 1}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-50"
                  title="Mover para baixo" aria-label="Mover para baixo"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(idx)}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                  title="Duplicar etapa" aria-label="Duplicar etapa"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                  title="Remover etapa" aria-label="Remover etapa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
