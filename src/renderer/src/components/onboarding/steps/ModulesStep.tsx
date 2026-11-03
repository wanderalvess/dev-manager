import React from 'react';
import { APP_MODULE_IDS } from '../../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';
import { countEnabled, setModulesEnabled, toggleDisabledModule } from '../onboardingContent';
import { Eyebrow, StepLead, StepTitle } from './stepUi';
import { PANEL, selectableRow } from './stepStyles';

interface ModulesStepProps {
  disabledModules: string[];
  onChange: (next: string[]) => void;
  groupIndex: number;
  onGroupChange: (i: number) => void;
}

/** Etapa 2: liga/desliga páginas, um grupo de cada vez, com a contagem de ligados por grupo. */
export const ModulesStep: React.FC<ModulesStepProps> = ({ disabledModules, onChange, groupIndex, onGroupChange }) => {
  const total = APP_MODULE_IDS.length;
  const enabled = total - disabledModules.length;
  const group = NAV_THEME_GROUPS[groupIndex];
  const groupIds = group.items.map((i) => i.id);
  const allOn = countEnabled(groupIds, disabledModules) === groupIds.length;

  return (
    <>
      <Eyebrow n={2}>MÓDULOS</Eyebrow>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <StepTitle>Ligue só o que você usa.</StepTitle>
          <StepLead>Os desligados somem do menu, da busca e dos atalhos. Dá para mudar em Configurações → Módulos.</StepLead>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-3xl font-bold">
            {enabled}
            <span className="text-muted-foreground">/{total}</span>
          </span>
          <span className="text-sm text-muted-foreground">módulos ligados</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div role="tablist" aria-label="Áreas do cockpit" className="lg:w-72 shrink-0 flex flex-col gap-1.5">
          {NAV_THEME_GROUPS.map((g, i) => {
            const ids = g.items.map((item) => item.id);
            return (
              <button key={g.id} type="button" role="tab" aria-selected={i === groupIndex} onClick={() => onGroupChange(i)} className={selectableRow(i === groupIndex)}>
                <span className="flex-1 font-bold">{g.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {countEnabled(ids, disabledModules)}/{ids.length}
                </span>
              </button>
            );
          })}
        </div>

        <section aria-label={`Módulos de ${group.title}`} className={`flex-1 min-w-0 ${PANEL}`}>
          <div className="min-h-14 px-5 flex items-center justify-between gap-3 border-b border-border">
            <span className="font-bold">{group.title}</span>
            <button
              type="button"
              onClick={() => onChange(setModulesEnabled(disabledModules, groupIds, !allOn, total))}
              className="min-h-9 px-4 rounded-full border border-border text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {allOn ? 'Desligar todos' : 'Ligar todos'}
            </button>
          </div>
          {group.items.map((item) => {
            const on = !disabledModules.includes(item.id);
            return (
              <div key={item.id} className="min-h-16 px-5 py-3 flex items-center gap-4 border-b border-border/60 last:border-b-0">
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className={`font-bold ${on ? '' : 'text-muted-foreground'}`}>{item.label}</span>
                  <span className="text-sm text-muted-foreground truncate" title={item.description}>
                    {item.description}
                  </span>
                </span>
                <span className="hidden sm:inline min-w-14 text-center font-mono text-xs text-muted-foreground">{item.shortcut ?? '—'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Ligar ${item.label}`}
                  onClick={() => onChange(toggleDisabledModule(disabledModules, item.id, total))}
                  className={`relative w-12 h-7 shrink-0 rounded-full cursor-pointer transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-background transition-[left] ${on ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
};
