import React from 'react';
import {
  Globe,
  Terminal,
  Code2,
  Radio,
  RotateCcw,
  Plus,
  ToggleRight,
  ToggleLeft,
  Trash2
} from 'lucide-react';
import { AppSettings, MonitoredPortConfig } from '../../../../../shared/types';

interface PortsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  defaultPorts: MonitoredPortConfig[];
  handleResetPorts: () => void;
  handleAddPort: (port?: number, label?: string) => void;
  handleUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: any) => void;
  handleRemovePort: (index: number) => void;
}

export const PortsTab: React.FC<PortsTabProps> = ({
  settings,
  setSettings,
  defaultPorts,
  handleResetPorts,
  handleAddPort,
  handleUpdatePort,
  handleRemovePort
}) => {
  return (
    <div className="space-y-4 flex-1 flex flex-col" id="field-ports">
      {/* Card: Portas Principais de Integração */}
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
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" /> Porta do Portal Web Local:
              </label>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                HTTP
              </span>
            </div>
            <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
              <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
              <input
                type="number"
                value={settings.webPort ?? 8889}
                onChange={(e) => {
                  const portNum = parseInt(e.target.value) || 0;
                  setSettings({ ...settings, webPort: portNum });
                }}
                className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                placeholder="8889"
              />
            </div>
            <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner mt-2">
              <span className="text-primary font-mono text-xs select-none mr-1 font-bold">/</span>
              <input
                type="text"
                value={settings.webPath?.replace(/^\//, '') ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? `/${e.target.value.replace(/^\//, '')}` : '';
                  setSettings({ ...settings, webPath: val });
                }}
                className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                placeholder="web"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Usada para abrir o Portal Web no navegador (<code>http://localhost:{settings.webPort || 8889}{settings.webPath || ''}</code>) e verificar o status ativo.
            </p>
          </div>

          {/* Porta SSH do Apache Karaf */}
          <div className="bg-card border border-border hover:border-amber-500/40 rounded-xl p-3.5 space-y-2 transition-all">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-500" /> Porta SSH Karaf (client.bat):
              </label>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
                SSH
              </span>
            </div>
            <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
              <span className="text-amber-500 font-mono text-xs select-none mr-1 font-bold">:</span>
              <input
                type="number"
                value={settings.karafSshPort ?? 8101}
                onChange={(e) =>
                  setSettings({ ...settings, karafSshPort: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                placeholder="8101"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Usada pelo <code>client.bat -a {settings.karafSshPort || 8101}</code> para envio de comandos OSGi e deploy de bundles.
            </p>
          </div>

          {/* Porta Remote Debug Java */}
          <div className="bg-card border border-border hover:border-emerald-500/40 rounded-xl p-3.5 space-y-2 transition-all">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-500" /> Porta Debug JVM (Java):
              </label>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-mono font-bold">
                JDWP
              </span>
            </div>
            <div className="flex items-center bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
              <span className="text-emerald-500 font-mono text-xs select-none mr-1 font-bold">:</span>
              <input
                type="number"
                value={settings.karafDebugPort ?? 5005}
                onChange={(e) =>
                  setSettings({ ...settings, karafDebugPort: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                placeholder="5005"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Porta TCP onde a JVM do Karaf aguarda conexão de Remote Debug da IDE (IntelliJ, VS Code, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* Card: Portas de Rede Monitoradas em Tempo Real */}
      <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" /> Lista Geral de Portas TCP Monitoradas
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Portas consultadas em tempo real na barra de status do painel de ambiente.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetPorts}
              className="px-2.5 py-1 bg-card hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:border-rose-500/70 rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
              title="Restaurar portas padrão (:8889, :8101, :5005, :1521)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrões</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPort()}
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Porta</span>
            </button>
          </div>
        </div>

        {/* Lista Rolável de Portas Configuradas */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {(settings.monitoredPorts || defaultPorts).map((portCfg, index) => (
            <div
              key={index}
              className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                portCfg.enabled
                  ? 'bg-card border-border hover:border-primary/40'
                  : 'bg-muted/40 border-border/40 opacity-60'
              }`}
            >
              <button
                type="button"
                onClick={() => handleUpdatePort(index, 'enabled', !portCfg.enabled)}
                className={`p-1 rounded text-xs transition-colors ${
                  portCfg.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                }`}
                title={portCfg.enabled ? 'Clique para Desativar' : 'Clique para Ativar'}
              >
                {portCfg.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>

              {/* Número da Porta */}
              <div className="w-28">
                <div className="flex items-center bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
                  <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
                  <input
                    type="number"
                    value={portCfg.port || ''}
                    onChange={(e) => handleUpdatePort(index, 'port', e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                    placeholder="8889"
                  />
                </div>
              </div>

              {/* Descrição da Porta */}
              <div className="flex-1">
                <input
                  type="text"
                  value={portCfg.label}
                  onChange={(e) => handleUpdatePort(index, 'label', e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="Descrição do serviço (ex: Portal Web, Banco de Dados...)"
                />
              </div>

              {/* Botão Remover */}
              <button
                type="button"
                onClick={() => handleRemovePort(index)}
                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Remover Porta da Lista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Presets Rápidos de Portas Comuns */}
        <div className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Atalhos Rápidos de Adição:
          </span>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleAddPort(8889, 'Portal Web Local')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
            >
              + :8889 (Portal Web)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(8181, 'Karaf Web Alternativo')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
            >
              + :8181 (Karaf Web)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(8101, 'Karaf SSH (client.bat)')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-amber-500/40 transition-colors shadow-sm"
            >
              + :8101 (Karaf SSH)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(8080, 'Tomcat / Web')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors shadow-sm"
            >
              + :8080 (Web)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(5005, 'Java Remote Debug')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-emerald-500/40 transition-colors shadow-sm"
            >
              + :5005 (Debug JVM)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(1521, 'Oracle DB Listener')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-blue-500/40 transition-colors shadow-sm"
            >
              + :1521 (Oracle DB)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(6379, 'Redis Cache')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-rose-500/40 transition-colors shadow-sm"
            >
              + :6379 (Redis)
            </button>
            <button
              type="button"
              onClick={() => handleAddPort(8085, 'Serviço API Local')}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border hover:border-emerald-500/40 transition-colors shadow-sm"
            >
              + :8085 (API Local)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
