import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { parseWinthorStartPort } from '../../../utils/dirsTabParsers';
import { Switch } from '../../ui/Switch';
import { SETTINGS_INPUT_CLASS, SettingsAdvanced, SettingsCard, SettingsField } from '../SettingsCard';

interface DirsWinthorStartPanelProps {
  settings: AppSettings;
  setField: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  showWtaPassword: boolean;
  setShowWtaPassword: (show: boolean) => void;
}

/** Login automático ao abrir rotinas (WinThor Start) e acesso ao portal WTA; cookie e payload ficam em Avançado. */
export const DirsWinthorStartPanel: React.FC<DirsWinthorStartPanelProps> = ({ settings, setField, showWtaPassword, setShowWtaPassword }) => {
  const enabled = settings.winthorStartEnabled ?? true;
  const hasAdvanced = Boolean(settings.wtaAuthToken || settings.hasWtaAuthToken || settings.winthorStartDefaultPayload);
  return (
    <SettingsCard
      title="WinThor Start & WTA"
      description="Abre rotinas já autenticadas pelo serviço local do WinThor Start, sem o menu aberto, e dá acesso ao portal WTA."
      actions={<Switch checked={enabled} onChange={(v) => setField('winthorStartEnabled', v)} label="Integração WinThor Start e WTA" />}
    >
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${enabled ? '' : 'opacity-60'}`}>
        <SettingsField label="Endereço do portal WTA" htmlFor="wta-url">
          <input
            id="wta-url"
            value={settings.wtaUrl || 'http://localhost:8889'}
            onChange={(e) => setField('wtaUrl', e.target.value)}
            className={SETTINGS_INPUT_CLASS}
            placeholder="http://localhost:8889"
          />
        </SettingsField>
        <SettingsField label="Porta do WinThor Start" htmlFor="wta-start-port">
          <input
            id="wta-start-port"
            type="number"
            value={settings.winthorStartPort ?? 9195}
            onChange={(e) => setField('winthorStartPort', parseWinthorStartPort(e.target.value))}
            className={SETTINGS_INPUT_CLASS}
            placeholder="9195"
          />
        </SettingsField>
        <div id="field-wtaLogin">
          <SettingsField label="Usuário do WTA" htmlFor="wta-login">
            <input
              id="wta-login"
              value={settings.wtaLogin || ''}
              onChange={(e) => setField('wtaLogin', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
              placeholder="Ex: PCADMIN"
            />
          </SettingsField>
        </div>
        <div id="field-wtaPassword">
          <SettingsField label="Senha ou hash" htmlFor="wta-password">
            <div className="flex gap-2">
              <input
                id="wta-password"
                type={showWtaPassword ? 'text' : 'password'}
                value={settings.wtaPassword || ''}
                onChange={(e) => setField('wtaPassword', e.target.value)}
                className={SETTINGS_INPUT_CLASS}
                placeholder={settings.hasWtaPassword ? 'Salva e protegida. Deixe em branco para manter.' : 'Senha ou hash MD5 do WTA'}
              />
              <button
                type="button"
                onClick={() => setShowWtaPassword(!showWtaPassword)}
                aria-label={showWtaPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showWtaPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
              >
                {showWtaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </SettingsField>
        </div>
      </div>

      <SettingsAdvanced summary="Avançado: cookie e payload de fallback" defaultOpen={hasAdvanced}>
        <div id="field-wtaAuthToken">
          <SettingsField
            label={
              <>
                Cookie de autenticação (<code>suukie</code>)
              </>
            }
            htmlFor="wta-cookie"
            optional
            hint="Para ler os parâmetros direto da sua sessão web. No navegador, com o WTA logado: F12 › Application › Cookies › copie o valor de suukie."
          >
            <input
              id="wta-cookie"
              value={settings.wtaAuthToken || ''}
              onChange={(e) => setField('wtaAuthToken', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
              placeholder={settings.hasWtaAuthToken ? 'Salvo e protegido' : 'Só se o login automático falhar'}
            />
          </SettingsField>
        </div>
        <SettingsField
          label={
            <>
              Payload de fallback (JSON com <code>m, u, p, t, s</code>)
            </>
          }
          htmlFor="wta-payload"
          optional
          hint="Usado como parâmetros fixos quando o WTA estiver fechado ou sem cookie ativo."
        >
          <textarea
            id="wta-payload"
            rows={3}
            value={settings.winthorStartDefaultPayload || ''}
            onChange={(e) => setField('winthorStartDefaultPayload', e.target.value)}
            className={`${SETTINGS_INPUT_CLASS} h-auto py-2 resize-y`}
            placeholder='{"m":"...","u":"...","p":"...","t":"...","s":"..."}'
          />
        </SettingsField>
      </SettingsAdvanced>
    </SettingsCard>
  );
};
