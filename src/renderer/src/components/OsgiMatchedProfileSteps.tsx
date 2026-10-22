import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ListChecks, Play } from 'lucide-react';
import type { DeployProfile } from '../../../shared/types';

interface OsgiMatchedProfileStepsProps {
  profile: DeployProfile;
  disabled?: boolean;
  onExecute: (stepIds: string[]) => void;
}

/** Escolha de etapas do perfil sugerido: nem sempre a dependência pede o perfil inteiro (ex.: só o build ou só o install). */
export const OsgiMatchedProfileSteps: React.FC<OsgiMatchedProfileStepsProps> = ({ profile, disabled, onExecute }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(profile.steps.filter((s) => s.enabled !== false).map((s) => s.id))
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // Na ordem do perfil, não na ordem dos cliques.
  const orderedSelection = profile.steps.filter((s) => selected.has(s.id)).map((s) => s.id);

  return (
    <div className="rounded-lg border border-border/80 bg-background/60 text-xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/40 transition"
      >
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <ListChecks className="w-3.5 h-3.5 text-primary" />
          Escolher etapas de "{profile.name}"
        </span>
        <span className="flex items-center gap-1 text-2xs text-muted-foreground">
          {profile.steps.length} etapas
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-border/60">
          {profile.steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2 p-1.5 rounded-md border border-border/60 bg-card">
              <input
                type="checkbox"
                checked={selected.has(step.id)}
                onChange={() => toggle(step.id)}
                disabled={disabled}
                aria-label={`Incluir a etapa ${step.name}`}
                className="w-4 h-4 accent-primary cursor-pointer shrink-0"
              />
              <span className="w-4 text-2xs font-bold text-muted-foreground text-center shrink-0">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-foreground">{step.name}</p>
                <p className="text-2xs font-mono text-muted-foreground truncate">{step.type}</p>
              </div>
              <button
                type="button"
                onClick={() => onExecute([step.id])}
                disabled={disabled}
                title={`Executar somente a etapa "${step.name}"`}
                className="px-2 py-1 rounded-md border border-border bg-card hover:bg-primary/15 text-primary text-2xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Play className="w-3 h-3 fill-current" /> Só esta
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => onExecute(orderedSelection)}
              disabled={disabled || orderedSelection.length === 0}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 cursor-pointer disabled:opacity-50 transition"
            >
              <Play className="w-3 h-3 fill-current" /> Executar selecionadas ({orderedSelection.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
