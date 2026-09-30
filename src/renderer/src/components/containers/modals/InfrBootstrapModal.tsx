import React, { useState } from 'react';
import {
  Sliders,
  X,
  Database,
  Globe,
  Key,
  Wrench,
  Play,
  RotateCw
} from 'lucide-react';
import type { InfrDockerScriptStatus } from '../../../../../shared/types';

export interface InfrBootstrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  infrScripts: InfrDockerScriptStatus[];
  isLoadingInfrScripts: boolean;
  onLoadInfrScripts: (customPath?: string) => void;
  onRunInfrScript: (
    scriptType: 'oracle' | 'wta' | 'wsh',
    options: {
      customPath: string;
      oracleContainer: string;
      oraclePort: number;
      wtaContainer: string;
      wtaPort: number;
    }
  ) => void;
  isExecutingInfr: boolean;
  infrOutput: string;
}

export const InfrBootstrapModal: React.FC<InfrBootstrapModalProps> = ({
  isOpen,
  onClose,
  infrScripts,
  isLoadingInfrScripts,
  onLoadInfrScripts,
  onRunInfrScript,
  isExecutingInfr,
  infrOutput
}) => {
  const [infrActiveTab, setInfrActiveTab] = useState<'oracle' | 'wta' | 'wsh' | 'scripts'>('oracle');
  const [infrCustomPath, setInfrCustomPath] = useState<string>('C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker');
  const [infrOracleContainer, setInfrOracleContainer] = useState<string>('oracle-winthor');
  const [infrOraclePort, setInfrOraclePort] = useState<number>(1521);
  const [infrWtaContainer, setInfrWtaContainer] = useState<string>('linux-winthor');
  const [infrWtaPort, setInfrWtaPort] = useState<number>(8080);

  if (!isOpen) return null;

  const handleRun = (type: 'oracle' | 'wta' | 'wsh') => {
    onRunInfrScript(type, {
      customPath: infrCustomPath,
      oracleContainer: infrOracleContainer,
      oraclePort: infrOraclePort,
      wtaContainer: infrWtaContainer,
      wtaPort: infrWtaPort
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Assistente de Bootstrap INFR-Docker</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  Scripts Oficiais
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Automação guiada de criação e setup dos containers Oracle XE 11g, WTA e WSH
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
          <button
            onClick={() => setInfrActiveTab('oracle')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              infrActiveTab === 'oracle'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1. Setup Oracle XE</span>
          </button>

          <button
            onClick={() => setInfrActiveTab('wta')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              infrActiveTab === 'wta'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. Setup WTA</span>
          </button>

          <button
            onClick={() => setInfrActiveTab('wsh')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              infrActiveTab === 'wsh'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>3. Setup WSH</span>
          </button>

          <button
            onClick={() => {
              setInfrActiveTab('scripts');
              onLoadInfrScripts(infrCustomPath);
            }}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              infrActiveTab === 'scripts'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Status dos Scripts</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
          {/* ABA 1: SETUP ORACLE XE */}
          {infrActiveTab === 'oracle' && (
            <div className="space-y-4">
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">
                    Setup Automatizado do Oracle XE 11g
                  </strong>
                  Executa <code className="text-foreground font-mono">oracle_setup.sh</code> na pasta <code className="text-foreground font-mono">oracle-winthor</code>. Cria o container, monta volumes de persistência e inicia o listener na porta especificada.
                </div>
              </div>

              <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Nome do Container Oracle
                    </label>
                    <input
                      type="text"
                      value={infrOracleContainer}
                      onChange={(e) => setInfrOracleContainer(e.target.value)}
                      placeholder="oracle-winthor"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Porta Externa do Host
                    </label>
                    <input
                      type="number"
                      value={infrOraclePort}
                      onChange={(e) => setInfrOraclePort(parseInt(e.target.value, 10) || 1521)}
                      placeholder="1521"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                  ./oracle_setup.sh --container {infrOracleContainer || 'oracle-winthor'} --port {infrOraclePort || 1521}
                </div>

                <button
                  onClick={() => handleRun('oracle')}
                  disabled={isExecutingInfr}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isExecutingInfr ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup Oracle XE'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA 2: SETUP WTA */}
          {infrActiveTab === 'wta' && (
            <div className="space-y-4">
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">
                    Setup Automatizado do WinThor Anywhere (WTA)
                  </strong>
                  Executa <code className="text-foreground font-mono">wta_setup.sh</code> na pasta <code className="text-foreground font-mono">linux-winthor/scripts</code>. Cria o container do WTA, mapeia a porta HTTP (8080) e as portas do Karaf (8101, 1099, 61616).
                </div>
              </div>

              <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Nome do Container WTA
                    </label>
                    <input
                      type="text"
                      value={infrWtaContainer}
                      onChange={(e) => setInfrWtaContainer(e.target.value)}
                      placeholder="linux-winthor"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Porta Web Externa
                    </label>
                    <input
                      type="number"
                      value={infrWtaPort}
                      onChange={(e) => setInfrWtaPort(parseInt(e.target.value, 10) || 8080)}
                      placeholder="8080"
                      className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                  ./wta_setup.sh --container {infrWtaContainer || 'linux-winthor'} --port {infrWtaPort || 8080}
                </div>

                <button
                  onClick={() => handleRun('wta')}
                  disabled={isExecutingInfr}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isExecutingInfr ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup WTA'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: SETUP WSH */}
          {infrActiveTab === 'wsh' && (
            <div className="space-y-4">
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">
                    Setup Automatizado do Winthor Smart Hub (WSH)
                  </strong>
                  Executa <code className="text-foreground font-mono">wsh_setup.sh</code> na pasta <code className="text-foreground font-mono">wsh-winthor</code>. Cria o container WSH configurado com o <code className="text-foreground font-mono">Winthor.ini</code> e variáveis do <code className="text-foreground font-mono">.env</code>.
                </div>
              </div>

              <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
                  ./wsh_setup.sh
                </div>

                <button
                  onClick={() => handleRun('wsh')}
                  disabled={isExecutingInfr}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isExecutingInfr ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isExecutingInfr ? 'Iniciando Setup...' : 'Executar Setup WSH'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA 4: STATUS DOS SCRIPTS */}
          {infrActiveTab === 'scripts' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  Caminho do repositório INFR-Docker
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={infrCustomPath}
                    onChange={(e) => setInfrCustomPath(e.target.value)}
                    placeholder="C:\Users\wanderson.alves\projetosTOTV\INFR-Docker"
                    className="flex-1 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => onLoadInfrScripts(infrCustomPath)}
                    disabled={isLoadingInfrScripts}
                    className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Verificar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {infrScripts.map((s) => (
                  <div
                    key={s.script}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      s.exists ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-foreground">{s.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                            s.exists
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {s.exists ? 'Disponível' : 'Não Encontrado'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{s.description}</p>
                      <div className="text-[10px] font-mono text-muted-foreground/80 truncate">{s.path}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saída da Execução */}
          {infrOutput && (
            <div className="p-3 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 select-text whitespace-pre-wrap">
              {infrOutput}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            Scripts INFR-Docker integrados
          </span>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
