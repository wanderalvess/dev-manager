import React from 'react';
import { Check, PlayCircle } from 'lucide-react';
import { APP_MODULE_IDS } from '../../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';
import { useTheme } from '../../../context/ThemeContext';
import type { SetupChecklistItemStatus } from '../../../utils/settingsListEditors';
import { ONBOARDING_THEMES, summarizeChecklist } from '../onboardingContent';

const SHORTCUTS: [string, string][] = [
  ['Ctrl+K', 'Busca rápida em qualquer tela'],
  ['Alt+1 … Alt+0', 'Pule direto para cada página'],
  ['Integrações', 'MCP, LLM, Azure e outras, no fim do menu'],
  ['Central de Ajuda', 'Refaça o tour quando quiser']
];

const CARD = 'rounded-2xl border p-5 flex flex-col gap-2';

interface DoneStepProps {
  disabledModules: string[];
  checklist: SetupChecklistItemStatus[];
  onOpenSettings: () => void;
  onStartTour: () => void;
}

/** Etapa 6: resumo do que ficou configurado, atalhos para guardar e o convite para o tour guiado. */
export const DoneStep: React.FC<DoneStepProps> = ({ disabledModules, checklist, onOpenSettings, onStartTour }) => {
  const { mode, variant } = useTheme();
  const theme = ONBOARDING_THEMES.find((t) => t.id === variant);
  const total = APP_MODULE_IDS.length;
  const offLabels = NAV_THEME_GROUPS.flatMap((g) => g.items)
    .filter((i) => disabledModules.includes(i.id))
    .map((i) => i.label);
  const env = summarizeChecklist(checklist);
  const envComplete = env.missing.length === 0;

  let offText = 'Todos ligados';
  if (offLabels.length === 1) offText = `${offLabels[0]} desligado`;
  if (offLabels.length > 1) offText = `${offLabels.length} desligados: ${offLabels.slice(0, 2).join(', ')}${offLabels.length > 2 ? '…' : ''}`;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-6">
        <span className="w-16 h-16 lg:w-[72px] lg:h-[72px] shrink-0 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-9 h-9" strokeWidth={2.8} />
        </span>
        <h2 className="m-0 text-4xl lg:text-6xl font-extrabold tracking-tighter leading-none">Tudo pronto. Bom trabalho.</h2>
      </div>

      <section aria-label="Resumo da configuração" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className={`${CARD} border-border bg-card`}>
          <span className="text-sm text-muted-foreground">Módulos</span>
          <span className="text-2xl font-extrabold">
            {total - disabledModules.length} de {total} ligados
          </span>
          <span className="text-sm text-muted-foreground">{offText}</span>
        </div>
        <div className={`${CARD} border-border bg-card`}>
          <span className="text-sm text-muted-foreground">Tema</span>
          <span className="text-2xl font-extrabold flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-primary" />
            {theme?.label ?? variant}
          </span>
          <span className="text-sm text-muted-foreground">modo {mode === 'dark' ? 'escuro' : 'claro'}</span>
        </div>
        <div className={`${CARD} ${envComplete ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
          <span className="text-sm text-muted-foreground">Ambiente</span>
          <span className="text-2xl font-extrabold">
            {env.done} de {env.total} essenciais
          </span>
          {envComplete ? (
            <span className="text-sm text-muted-foreground">Tudo o que o cockpit precisa para começar.</span>
          ) : (
            <>
              <span className="text-sm">Faltam: {env.missing.join(', ')}.</span>
              <button type="button" onClick={onOpenSettings} className="self-start min-h-9 text-sm font-bold text-primary cursor-pointer hover:underline">
                Completar em Configurações
              </button>
            </>
          )}
        </div>
      </section>

      <section aria-label="Atalhos" className="flex flex-col gap-3">
        <span className="font-mono text-xs font-bold tracking-[0.14em] text-muted-foreground">PARA GUARDAR</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="rounded-xl border border-border p-4 flex flex-col gap-2">
              <span className="self-start px-2.5 py-1 rounded-lg bg-muted font-mono text-sm font-bold">{k}</span>
              <span className="text-sm text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Tour guiado" className="rounded-2xl border border-border bg-card px-6 py-5 flex flex-wrap items-center gap-5">
        <PlayCircle className="w-7 h-7 shrink-0 text-primary" />
        <span className="flex-1 min-w-60 flex flex-col gap-0.5">
          <span className="font-bold">Quer um tour guiado pelas telas?</span>
          <span className="text-sm text-muted-foreground">Mostra onde fica cada coisa. Dá para refazer pela Central de Ajuda.</span>
        </span>
        <button
          type="button"
          onClick={onStartTour}
          className="h-11 px-5 rounded-xl border border-border font-bold cursor-pointer hover:border-primary/50"
        >
          Fazer o tour
        </button>
      </section>
    </div>
  );
};
