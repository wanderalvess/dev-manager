import React from 'react';
import { AppSettings } from '../../../../../shared/types';
import { SETTINGS_INPUT_CLASS, SettingsAdvanced, SettingsCard, SettingsField } from '../SettingsCard';

interface DirsCcwPanelProps {
  settings: AppSettings;
  setField: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

/** Central de Controle WinThor: de onde o Catálogo de Rotinas baixa e atualiza executáveis. */
export const DirsCcwPanel: React.FC<DirsCcwPanelProps> = ({ settings, setField }) => (
  <SettingsCard id="field-ccw" title="Central de Controle WinThor (CCW)" description="De onde o Catálogo de Rotinas baixa e atualiza executáveis.">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SettingsField label="Endereço da CCW" htmlFor="ccw-url">
        <input
          id="ccw-url"
          value={settings.ccwBaseUrl || 'https://centraldecontrole.pcinformatica.com.br'}
          onChange={(e) => setField('ccwBaseUrl', e.target.value)}
          className={SETTINGS_INPUT_CLASS}
          placeholder="https://centraldecontrole.pcinformatica.com.br"
        />
      </SettingsField>
      <SettingsField label="Versão padrão do WinThor" htmlFor="ccw-version">
        <input
          id="ccw-version"
          value={settings.ccwWinthorVersion || '37.00'}
          onChange={(e) => setField('ccwWinthorVersion', e.target.value)}
          className={SETTINGS_INPUT_CLASS}
          placeholder="37.00"
        />
      </SettingsField>
    </div>
    <SettingsAdvanced summary="Avançado: cookie da CCW" defaultOpen={Boolean(settings.ccwAuthCookie)}>
      <SettingsField
        label={
          <>
            Cookie de autenticação (<code>auth_token</code> ou similar)
          </>
        }
        htmlFor="ccw-cookie"
        optional
        hint="Baixar pelo número da rotina não exige login. O cookie só serve para carregar a árvore completa de módulos e rotinas."
      >
        <input
          id="ccw-cookie"
          type="password"
          value={settings.ccwAuthCookie || ''}
          onChange={(e) => setField('ccwAuthCookie', e.target.value)}
          className={SETTINGS_INPUT_CLASS}
          placeholder="Cole o cookie da sessão web"
        />
      </SettingsField>
    </SettingsAdvanced>
  </SettingsCard>
);
