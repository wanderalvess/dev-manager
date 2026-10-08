import React from 'react';
import { Globe, Terminal, Code2 } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { normalizeWebPath, parsePortInput, webPathToInput } from '../../../utils/portsTabUtils';

interface PortsMainCardProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const PortsMainCard: React.FC<PortsMainCardProps> = ({ settings, setSettings }) => (
  <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
    <div className="flex items-center justify-between pb-1 border-b border-border/60">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Portas Principais de Integração
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Portas-chave utilizadas pelo Portal Web, Karaf client.bat e JVM Debug.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      {/* Porta Web Local */}
      <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-3.5 space-y-2 transition-all">
        <div className="flex items-center justify-between">
          <label htmlFor="ports-main-card-1" className="font-bold text-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" /> Porta do Portal Web Local:
          </label>
          <span className="text-2xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
            HTTP
          </span>
        </div>
        <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
          <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
          <input id="ports-main-card-1"
            type="number"
            value={settings.webPort ?? 8889}
            onChange={(e) => setSettings({ ...settings, webPort: parsePortInput(e.target.value) })}
            className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden"
            placeholder="8889"
          />
        </div>
        <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner mt-2">
          <span className="text-primary font-mono text-xs select-none mr-1 font-bold">/</span>
          <input
            aria-label="Caminho do Portal Web (path)"
            type="text"
            value={webPathToInput(settings.webPath)}
            onChange={(e) => setSettings({ ...settings, webPath: normalizeWebPath(e.target.value) })}
            className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden"
            placeholder="web"
          />
        </div>
        <p className="text-2xs text-muted-foreground leading-relaxed">
          Usada para abrir o Portal Web no navegador (<code>http://localhost:{settings.webPort || 8889}{settings.webPath || ''}</code>) e verificar o status ativo.
        </p>
      </div>

      {/* Porta SSH do Apache Karaf */}
      <div className="bg-card border border-border hover:border-amber-500/40 rounded-xl p-3.5 space-y-2 transition-all">
        <div className="flex items-center justify-between">
          <label htmlFor="ports-main-card-2" className="font-bold text-foreground flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-500" /> Porta SSH Karaf (client.bat):
          </label>
          <span className="text-2xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
            SSH
          </span>
        </div>
        <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
          <span className="text-amber-500 font-mono text-xs select-none mr-1 font-bold">:</span>
          <input id="ports-main-card-2"
            type="number"
            value={settings.karafSshPort ?? 8101}
            onChange={(e) => setSettings({ ...settings, karafSshPort: parsePortInput(e.target.value) })}
            className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden"
            placeholder="8101"
          />
        </div>
        <p className="text-2xs text-muted-foreground leading-relaxed">
          Usada pelo <code>client.bat -a {settings.karafSshPort || 8101}</code> para envio de comandos OSGi e deploy de bundles.
        </p>
      </div>

      {/* Porta Remote Debug Java */}
      <div className="bg-card border border-border hover:border-emerald-500/40 rounded-xl p-3.5 space-y-2 transition-all">
        <div className="flex items-center justify-between">
          <label htmlFor="ports-main-card-3" className="font-bold text-foreground flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-emerald-500" /> Porta Debug JVM (Java):
          </label>
          <span className="text-2xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-mono font-bold">
            JDWP
          </span>
        </div>
        <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
          <span className="text-emerald-500 font-mono text-xs select-none mr-1 font-bold">:</span>
          <input id="ports-main-card-3"
            type="number"
            value={settings.karafDebugPort ?? 5005}
            onChange={(e) => setSettings({ ...settings, karafDebugPort: parsePortInput(e.target.value) })}
            className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden"
            placeholder="5005"
          />
        </div>
        <p className="text-2xs text-muted-foreground leading-relaxed">
          Porta TCP onde a JVM do Karaf aguarda conexão de Remote Debug da IDE (IntelliJ, VS Code, etc.).
        </p>
      </div>
    </div>
  </div>
);
