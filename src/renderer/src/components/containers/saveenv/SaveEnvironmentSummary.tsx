import React from 'react';
import type { SelectedSlotItem } from '../../../utils/saveEnvironmentUtils';

interface SaveEnvironmentSummaryProps {
  slots: SelectedSlotItem[];
}

export const SaveEnvironmentSummary: React.FC<SaveEnvironmentSummaryProps> = ({ slots }) => {
  if (slots.length === 0) return null;

  return (
    <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
      <div className="flex items-center justify-between font-bold text-foreground text-2xs">
        <span>Ordem de subida do grupo:</span>
        <span className="text-muted-foreground font-normal">{slots.length} containers em sequência</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {slots.map((slot, idx) => (
          <span
            key={slot.name}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/80 text-2xs font-mono shadow-2xs"
          >
            <strong className="text-primary font-bold">#{idx + 1}</strong>
            <span className="text-foreground">{slot.name}</span>
            {slot.delay > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">(+{slot.delay}s)</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
