import React from 'react';
import { Check } from 'lucide-react';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';
import type { SetupChecklistItemStatus } from '../../../utils/settingsListEditors';

interface OverviewEssentialsProps {
  checklist: Array<SetupChecklistItemStatus & { action?: () => void; actionLabel?: string }>;
}

/** Os cinco essenciais do checklist inicial, com o atalho para resolver cada pendência. */
export const OverviewEssentials: React.FC<OverviewEssentialsProps> = ({ checklist }) => {
  const done = checklist.filter((item) => item.done).length;
  const allDone = done === checklist.length;
  return (
    <section data-tour="settings-essentials" aria-labelledby="overview-essentials" className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="overview-essentials" className={SECTION_TITLE_CLASS}>
            Essenciais para decolar
          </h3>
          <p className="text-xs text-muted-foreground">Sem estes, as telas principais não funcionam.</p>
        </div>
        <span
          className={`text-xs font-mono font-semibold rounded-full px-2.5 py-0.5 ${
            allDone ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}
        >
          {done} de {checklist.length} prontos
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${(done / Math.max(checklist.length, 1)) * 100}%` }} />
      </div>
      <ul className="divide-y divide-border">
        {checklist.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5">
            {item.done ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold rounded-full px-2 py-0.5 bg-success/10 text-success">
                <Check className="w-3 h-3" /> ok
              </span>
            ) : (
              <span className="text-xs font-mono font-semibold rounded-full px-2 py-0.5 bg-warning/10 text-warning">falta</span>
            )}
            <span className="flex-1 min-w-40 text-sm font-medium text-foreground">{item.label}</span>
            {!item.done && item.action && (
              <button
                type="button"
                onClick={item.action}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors cursor-pointer"
              >
                {item.actionLabel ?? 'Resolver'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
