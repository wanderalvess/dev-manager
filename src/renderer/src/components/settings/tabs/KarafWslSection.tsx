import React, { useEffect, useState } from 'react';
import { Terminal, Monitor, RefreshCw, Network } from 'lucide-react';
import { AppSettings, WslDistroInfo } from '../../../../../shared/types';
import { apiBridge } from '../../../services/apiBridge';

interface KarafWslSectionProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const KarafWslSection: React.FC<KarafWslSectionProps> = ({ settings, setSettings }) => {
  const [distros, setDistros] = useState<WslDistroInfo[]>([]);
  const [loadingDistros, setLoadingDistros] = useState(false);

  const fetchDistros = async () => {
    setLoadingDistros(true);
    try {
      const list = await apiBridge.listWslDistros();
      setDistros(list || []);
      if (list && list.length > 0 && !settings.karafWslDistro) {
        const defaultDistro = list.find((d) => d.isDefault) || list[0];
        setSettings((prev) => ({ ...prev, karafWslDistro: defaultDistro.name }));
      }
    } catch {
      // Falha tratada silenciosamente
    } finally {
      setLoadingDistros(false);
    }
  };

  useEffect(() => {
    if (settings.karafEnvironment === 'wsl') {
      fetchDistros();
    }
    // fetchDistros é recriada a cada render; listar só ao trocar o ambiente evita refazer a consulta ao WSL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.karafEnvironment]);

  const isWsl = settings.karafEnvironment === 'wsl';

  return (
    <div id="field-karafWsl" className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> Ambiente de Execução do Karaf
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Defina o runtime do contêiner OSGi: execução nativa no host Windows ou isolada no subsistema Linux (WSL 2).
          </p>
        </div>

        {/* Segmented Control - Ergonomia de Cockpit */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/40 border border-border/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setSettings({ ...settings, karafEnvironment: 'local' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isWsl
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Host Windows</span>
          </button>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, karafEnvironment: 'wsl' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isWsl
                ? 'bg-card text-primary shadow-2xs border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>WSL 2 Linux</span>
          </button>
        </div>
      </div>

      {/* Configurações específicas quando WSL ativo */}
      {isWsl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <label htmlFor="karaf-wsl-section-1" className="block font-bold text-foreground mb-1 flex items-center justify-between">
              <span>Distribuição WSL Alvo:</span>
              <button
                type="button"
                onClick={fetchDistros}
                disabled={loadingDistros}
                className="text-2xs text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Recarregar distribuições do wsl --list"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDistros ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </label>
            {distros.length > 0 ? (
              <select id="karaf-wsl-section-1"
                value={settings.karafWslDistro || ''}
                onChange={(e) => setSettings({ ...settings, karafWslDistro: e.target.value })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-hidden focus:border-primary text-xs"
              >
                <option value="">Selecione uma distribuição instalada...</option>
                {distros.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.state === 'Running' ? 'Em execução' : 'Parada'}{d.isDefault ? ', Padrão' : ''})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.karafWslDistro || ''}
                onChange={(e) => setSettings({ ...settings, karafWslDistro: e.target.value })}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-hidden focus:border-primary text-xs"
                placeholder="Ex: Ubuntu, Debian"
              />
            )}
            <p className="text-2xs text-muted-foreground mt-1">
              O caminho do Karaf pode ser Linux (<code className="font-mono text-foreground">/home/...</code>) ou rede UNC (<code className="font-mono text-foreground">\\wsl.localhost\...</code>).
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1.5 flex flex-col justify-center">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <Network className="w-3.5 h-3.5 text-primary shrink-0" /> Integração de Rede Localhost
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O Hub Manager conecta na porta SSH (<code className="font-mono text-foreground">{settings.karafSshPort ?? 8101}</code>) e JDWP (<code className="font-mono text-foreground">{settings.karafDebugPort ?? 5005}</code>). Para conexões instantâneas sem NAT, configure <code className="font-mono text-foreground">[wsl2] networkingMode=mirrored</code> no <code className="font-mono text-foreground">%USERPROFILE%\.wslconfig</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
