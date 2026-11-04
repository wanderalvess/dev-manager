import React from 'react';
import type { AppSettings } from '../../../../../shared/types';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';
import { StartTabSelect } from './StartTabSelect';

interface StartTabSettingsCardProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

/** Aparência → Tela ao entrar: para onde o botão Entrar no cockpit da tela de início leva. */
export const StartTabSettingsCard: React.FC<StartTabSettingsCardProps> = ({ settings, setSettings }) => (
  <section id="field-startTab" aria-labelledby="settings-start-tab" className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
    <div className="min-w-0">
      <h3 id="settings-start-tab" className={SECTION_TITLE_CLASS}>
        <label htmlFor="settings-start-tab-select">Tela ao entrar</label>
      </h3>
      <p className="text-xs text-muted-foreground">
        Para onde o botão Entrar no cockpit da tela de início leva. Sem escolha, o Hub abre na última aba que você usou.
      </p>
    </div>
    <StartTabSelect
      id="settings-start-tab-select"
      value={settings.startTab ?? ''}
      onChange={(tab) => setSettings((prev) => ({ ...prev, startTab: tab }))}
      disabledModules={settings.disabledModules ?? []}
      className="min-w-64"
    />
  </section>
);
