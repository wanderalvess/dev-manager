import React from 'react';
import { Download } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';

interface DirsCcwPanelProps {
  settings: AppSettings;
  setField: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const INPUT_CLASS =
  'w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary';

export const DirsCcwPanel: React.FC<DirsCcwPanelProps> = ({ settings, setField }) => (
  <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
          <Download className="w-4 h-4 text-blue-500" /> Central de Controle WinThor (CCW)
        </span>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Download e atualização automática de rotinas e executáveis da nuvem direto para o ambiente local.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
      <div>
        <label htmlFor="dirs-ccw-panel-1" className="block text-[11px] font-semibold text-foreground mb-1">
          URL Base da Central de Controle:
        </label>
        <input id="dirs-ccw-panel-1"
          type="text"
          value={settings.ccwBaseUrl || 'https://centraldecontrole.pcinformatica.com.br'}
          onChange={(e) => setField('ccwBaseUrl', e.target.value)}
          className={INPUT_CLASS}
          placeholder="https://centraldecontrole.pcinformatica.com.br"
        />
      </div>
      <div>
        <label htmlFor="dirs-ccw-panel-2" className="block text-[11px] font-semibold text-foreground mb-1">
          Versão WinThor Padrão (CCW):
        </label>
        <input id="dirs-ccw-panel-2"
          type="text"
          value={settings.ccwWinthorVersion || '30'}
          onChange={(e) => setField('ccwWinthorVersion', e.target.value)}
          className={INPUT_CLASS}
          placeholder="30"
        />
      </div>
    </div>

    <div>
      <label htmlFor="dirs-ccw-panel-3" className="block text-[11px] font-semibold text-foreground mb-1">
        Cookie de Autenticação CCW (<code>auth_token</code> ou similar, opcional):
      </label>
      <input id="dirs-ccw-panel-3"
        type="password"
        value={settings.ccwAuthCookie || ''}
        onChange={(e) => setField('ccwAuthCookie', e.target.value)}
        className={INPUT_CLASS}
        placeholder="Cole o cookie da sessão web se necessário para rotinas restritas"
      />
      <p className="text-2xs text-muted-foreground mt-0.5">
        Para download direto pelo número da rotina, a CCW não exige autenticação. O cookie é usado para carregar toda a árvore de módulos e rotinas.
      </p>
    </div>
  </div>
);
