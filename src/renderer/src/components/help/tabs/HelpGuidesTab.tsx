import React, { useState } from 'react';
import { Container, ListChecks } from 'lucide-react';
import { InfrDockerGuide } from '../guides/InfrDockerGuide';
import { ScenarioValidationGuide } from '../guides/ScenarioValidationGuide';

type GuideId = 'infr-docker' | 'scenarios';

const GUIDES: { id: GuideId; label: string; icon: React.ElementType }[] = [
  { id: 'infr-docker', label: 'Ambientes WinThor no Docker', icon: Container },
  { id: 'scenarios', label: 'Validação de Cenários', icon: ListChecks }
];

const STORAGE_KEY = 'devmanager:help-guide';

function readStoredGuide(): GuideId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return GUIDES.some((g) => g.id === stored) ? (stored as GuideId) : 'infr-docker';
  } catch {
    return 'infr-docker';
  }
}

/** Guias longos da Central de Ajuda: como as peças funcionam juntas, não só onde clicar. Um por vez, com o último lembrado. */
export const HelpGuidesTab: React.FC<{ openLink: (url: string) => void }> = ({ openLink }) => {
  const [active, setActive] = useState<GuideId>(readStoredGuide);
  const choose = (id: GuideId) => {
    setActive(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Sem armazenamento local: o guia só não é lembrado
    }
  };
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Guias" className="flex flex-wrap gap-2">
        {GUIDES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => choose(id)}
            className={`h-9 px-3 rounded-[10px] border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              active === id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 md:p-6 bg-card border border-border/80 rounded-xl">
        {active === 'scenarios' ? <ScenarioValidationGuide /> : <InfrDockerGuide openLink={openLink} />}
      </div>
    </div>
  );
};
