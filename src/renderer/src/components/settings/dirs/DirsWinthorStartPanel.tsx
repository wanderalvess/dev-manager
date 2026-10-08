import React from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { parseWinthorStartPort } from '../../../utils/dirsTabParsers';

interface DirsWinthorStartPanelProps {
  settings: AppSettings;
  setField: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  showWtaPassword: boolean;
  setShowWtaPassword: (show: boolean) => void;
}

const INPUT_CLASS =
  'w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary';

export const DirsWinthorStartPanel: React.FC<DirsWinthorStartPanelProps> = ({
  settings,
  setField,
  showWtaPassword,
  setShowWtaPassword
}) => (
  <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3 shadow-xs">
    <div className="flex items-center justify-between">
      <div>
        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-500" /> Integração WinThor Start (DataSnap) & WTA
        </span>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Abre rotinas desktop autenticadas via serviço local do WinThor Start sem necessitar do menu aberto.
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          aria-label="Integração WinThor Start"
          type="checkbox"
          checked={settings.winthorStartEnabled ?? true}
          onChange={(e) => setField('winthorStartEnabled', e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
      </label>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
      <div>
        <label htmlFor="dirs-winthor-start-panel-1" className="block text-[11px] font-semibold text-foreground mb-1">
          Porta do WinThor Start:
        </label>
        <input id="dirs-winthor-start-panel-1"
          type="number"
          value={settings.winthorStartPort ?? 9195}
          onChange={(e) => setField('winthorStartPort', parseWinthorStartPort(e.target.value))}
          className={INPUT_CLASS}
          placeholder="9195"
        />
      </div>
      <div>
        <label htmlFor="dirs-winthor-start-panel-2" className="block text-[11px] font-semibold text-foreground mb-1">
          URL do Portal WTA:
        </label>
        <input id="dirs-winthor-start-panel-2"
          type="text"
          value={settings.wtaUrl || 'http://localhost:8889'}
          onChange={(e) => setField('wtaUrl', e.target.value)}
          className={INPUT_CLASS}
          placeholder="http://localhost:8889"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
      <div id="field-wtaLogin">
        <label htmlFor="dirs-winthor-start-panel-3" className="block text-[11px] font-semibold text-foreground mb-1">
          Usuário WTA (Login Automático):
        </label>
        <input id="dirs-winthor-start-panel-3"
          type="text"
          value={settings.wtaLogin || ''}
          onChange={(e) => setField('wtaLogin', e.target.value)}
          className={INPUT_CLASS}
          placeholder="Ex: PCADMIN"
        />
      </div>
      <div id="field-wtaPassword">
        <label htmlFor="dirs-winthor-start-panel-4" className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
          <span>Senha / Hash WTA:</span>
          <button
            type="button"
            onClick={() => setShowWtaPassword(!showWtaPassword)}
            className="text-2xs text-muted-foreground hover:text-foreground font-normal flex items-center gap-1"
          >
            {showWtaPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showWtaPassword ? 'Ocultar' : 'Exibir'}</span>
          </button>
        </label>
        <input id="dirs-winthor-start-panel-4"
          type={showWtaPassword ? 'text' : 'password'}
          value={settings.wtaPassword || ''}
          onChange={(e) => setField('wtaPassword', e.target.value)}
          className={INPUT_CLASS}
          placeholder={settings.hasWtaPassword ? '(Senha salva e protegida)' : 'Senha ou Hash MD5 do WTA'}
        />
      </div>
    </div>

    <div className="space-y-2 pt-1 border-t border-border/40">
      <div id="field-wtaAuthToken">
        <label htmlFor="dirs-winthor-start-panel-5" className="block text-[11px] font-semibold text-foreground mb-1">
          Cookie de Autenticação WTA (<code>suukie</code>):
        </label>
        <input id="dirs-winthor-start-panel-5"
          type="text"
          value={settings.wtaAuthToken || ''}
          onChange={(e) => setField('wtaAuthToken', e.target.value)}
          className={INPUT_CLASS}
          placeholder={settings.hasWtaAuthToken ? '(Cookie salvo e protegido)' : "Cole o valor do cookie 'suukie' do WTA (opcional)"}
        />
        <p className="text-2xs text-muted-foreground mt-0.5">
          Permite que o Hub Manager consulte os parâmetros atualizados direto da sua sessão web. Abra o
          DevTools do navegador (F12) na tela do WTA logado, aba Application/Cookies, e copie o valor
          de <code>suukie</code>.
        </p>
      </div>

      <div>
        <label htmlFor="dirs-winthor-start-panel-6" className="block text-[11px] font-semibold text-foreground mb-1">
          Payload de Fallback (JSON com <code>m, u, p, t, s</code>):
        </label>
        <textarea id="dirs-winthor-start-panel-6"
          rows={2}
          value={settings.winthorStartDefaultPayload || ''}
          onChange={(e) => setField('winthorStartDefaultPayload', e.target.value)}
          className="w-full bg-muted/40 border border-border rounded-lg p-2 text-foreground font-mono text-[11px] focus:outline-hidden focus:border-primary resize-none"
          placeholder='{"m":"...","u":"...","p":"...","t":"...","s":"..."}'
        />
        <p className="text-2xs text-muted-foreground mt-0.5">
          Usado como parâmetros fixos quando o WTA estiver fechado ou sem cookie ativo.
        </p>
      </div>
    </div>
  </div>
);
