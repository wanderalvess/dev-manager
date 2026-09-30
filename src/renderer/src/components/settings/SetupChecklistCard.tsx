import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
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
    <div className="px-4 py-3 rounded-xl bg-card border border-border/80 shadow-sm shrink-0 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Checklist de Configuração Inicial
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {checklist.length - pendingCount}/{checklist.length} concluídos
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {checklist.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              item.done
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
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
