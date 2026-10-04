import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import type { AutomationStep, AutomationStepType } from '../../../../shared/types';
import { describeStepSubtitle, isStepIncomplete } from '../../utils/profileEditorSteps';

interface ProfileEditorStepListProps {
  steps: AutomationStep[];
  editingStepIndex: number | null;
  globalDebugPort: number;
  onSelect: (index: number) => void;
  onAdd: (type?: AutomationStepType) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
}

export const ProfileEditorStepList: React.FC<ProfileEditorStepListProps> = ({
  steps,
  editingStepIndex,
  globalDebugPort,
  onSelect,
  onAdd,
  onMove,
  onRemove
}) => (
  <div className="w-80 border-r border-border flex flex-col bg-muted/10">
    <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
      <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
        Etapas na Sequência ({steps.length})
      </span>
      <button
        type="button"
        onClick={() => onAdd('command')}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
      {steps.length === 0 ? (
        <div className="text-center py-10 px-4 text-xs text-muted-foreground">
          Nenhuma etapa cadastrada. Clique em "+ Adicionar" acima para começar.
        </div>
      ) : (
        steps.map((step, idx) => {
          const isSelected = editingStepIndex === idx;
          const incomplete = isStepIncomplete(step);
          return (
            <div
              key={step.id}
              onClick={() => onSelect(idx)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : incomplete
                  ? 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10'
                  : 'border-border/60 bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                  {idx + 1}
                </span>
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate flex items-center gap-1">
                    {step.name || 'Sem nome'}
                    {incomplete && (
                      <AlertTriangle
                        className="w-3 h-3 text-destructive shrink-0"
                        aria-label="Etapa incompleta: selecione uma conexão de banco e informe o SQL"
                      />
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {describeStepSubtitle(step, globalDebugPort)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => onMove(idx, 'up')}
                  className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"
                  title="Mover para cima"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === steps.length - 1}
                  onClick={() => onMove(idx, 'down')}
                  className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"
                  title="Mover para baixo"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                  title="Remover etapa"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
