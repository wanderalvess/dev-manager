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
    <div className="px-4 py-3.5 rounded-[14px] bg-card border border-border shadow-xs shrink-0 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-muted-foreground" />
          Checklist de configuração inicial
        </span>
        <span className="text-[13px] text-muted-foreground">
          {checklist.length - pendingCount}/{checklist.length} concluídos
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {checklist.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-[13px] font-medium transition-colors ${
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
