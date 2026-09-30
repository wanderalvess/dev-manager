import React from 'react';
import { KeyRound, Terminal, Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';

interface KarafTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

export const KarafTab: React.FC<KarafTabProps> = ({
  settings,
  setSettings,
  showPassword,
  setShowPassword
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" /> Credenciais & Autenticação do Apache Karaf
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Utilizado para autenticação no <code className="font-mono text-amber-500">client.bat</code> (OSGi) e comandos SSH remotos.
              </p>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              client.bat SSH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div id="field-karafUser">
              <label className="block font-bold text-foreground mb-1">Usuário Karaf (SSH / client.bat):</label>
              <input
                type="text"
                value={settings.karafUser}
                onChange={(e) => setSettings({ ...settings, karafUser: e.target.value })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                placeholder="karaf"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Usuário configurado em <code>{settings.karafPath}\etc\users.properties</code> (Padrão: <code>karaf</code>).
              </p>
            </div>

            <div id="field-karafPass">
              <label className="block font-bold text-foreground mb-1 flex items-center justify-between">
                <span>Senha Karaf:</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-normal flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
                </button>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.karafPass}
                onChange={(e) => setSettings({ ...settings, karafPass: e.target.value })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                placeholder="karaf"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Senha de acesso SSH (Padrão: <code>karaf</code>).
              </p>
            </div>

            <div className="pt-1">
              <label className="block font-bold text-foreground mb-1">Porta SSH do Karaf (client.bat):</label>
              <input
                type="number"
                value={settings.karafSshPort ?? 8101}
                onChange={(e) => setSettings({ ...settings, karafSshPort: parseInt(e.target.value) || 0 })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                placeholder="8101"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Porta de conexão do console interativo via <code>client.bat -a 8101</code>.
              </p>
            </div>

            <div className="pt-1">
              <label className="block font-bold text-foreground mb-1">Porta Debug Remote JVM (Java):</label>
              <input
                type="number"
                value={settings.karafDebugPort ?? 5005}
                onChange={(e) => setSettings({ ...settings, karafDebugPort: parseInt(e.target.value) || 0 })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                placeholder="5005"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Porta JDWP para depuração remota via IntelliJ / IDE.
              </p>
            </div>
          </div>

          {/* Box Informativo de Uso */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-foreground space-y-1">
            <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Uso das Credenciais Karaf no Sistema
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Estas credenciais são enviadas automaticamente ao script <code className="font-mono text-foreground">{settings.karafPath}\bin\client.bat</code> durante as operações de deploy na aba <strong>Deploy OSGi Karaf</strong> e execução de diagnósticos (<code>feature:list</code>, <code>bundle:list</code>, <code>log:display</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
