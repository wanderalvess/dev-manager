import React from 'react';
import { ListChecks, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SetupChecklistItemStatus } from '../../utils/settingsListEditors';

interface SetupChecklistCardProps {
  checklist: Array<SetupChecklistItemStatus & { action?: () => void }>;
  pendingCount: number;
}

export const SetupChecklistCard: React.FC<SetupChecklistCardProps> = ({
  checklist,
  pendingCount
}) => {
  if (pendingCount <= 0) return null;

  return (
    // Uma linha só: o que já está feito vira a contagem, e só os itens pendentes aparecem como atalho
    <div className="px-3 py-2 rounded-xl bg-card border border-border shadow-xs shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        Checklist inicial
        <span className="font-normal text-muted-foreground">
          {checklist.length - pendingCount}/{checklist.length} concluídos
        </span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {checklist.filter((item) => !item.done).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[13px] font-medium transition-colors ${
              item.done
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning hover:bg-warning/20'
            }`}
            title={item.done ? `${item.label} - configurado` : `${item.label} - clique para configurar`}
          >
            {item.done ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
