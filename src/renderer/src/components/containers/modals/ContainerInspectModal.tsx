import React, { useState } from 'react';
import {
  Info,
  X,
  Box,
  Network,
  HardDrive,
  FileText,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import type { DockerContainerInspect } from '../../../../../shared/types';
import { flattenPortBindings } from '../../../utils/dockerContainerUtils';

export interface ContainerInspectModalProps {
  inspectingContainer: DockerContainerInspect | null;
  onClose: () => void;
  getStateBadge: (state: string) => React.ReactNode;
}

export const ContainerInspectModal: React.FC<ContainerInspectModalProps> = ({
  inspectingContainer,
  onClose,
  getStateBadge
}) => {
  const [inspectTab, setInspectTab] = useState<'general' | 'network' | 'mounts' | 'env'>('general');
  const [showSecretEnv, setShowSecretEnv] = useState<Record<string, boolean>>({});
  const [envSearchFilter, setEnvSearchFilter] = useState<string>('');

  if (!inspectingContainer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[84vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header do Modal */}
        <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-card/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-2xs">
              <Info className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>{inspectingContainer.name}</span>
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground font-normal">
                  {inspectingContainer.id.slice(0, 12)}
                </span>
                {getStateBadge(inspectingContainer.state.status)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-lg font-mono">
                {inspectingContainer.image}
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
        <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2 shrink-0">
          <button
            onClick={() => setInspectTab('general')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              inspectTab === 'general'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>
          <button
            onClick={() => setInspectTab('network')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              inspectTab === 'network'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Rede & Portas</span>
          </button>
          <button
            onClick={() => setInspectTab('mounts')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              inspectTab === 'mounts'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Volumes ({inspectingContainer.mounts.length})</span>
          </button>
          <button
            onClick={() => setInspectTab('env')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              inspectTab === 'env'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Variáveis ({inspectingContainer.env.length})</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-auto p-5 space-y-4 scrollbar-thin">
          {/* TAB 1: GERAL */}
          {inspectTab === 'general' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">ID Completo</span>
                  <div className="text-xs font-mono select-all text-foreground break-all">{inspectingContainer.id}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Criado em</span>
                  <div className="text-xs text-foreground font-mono">{inspectingContainer.created || 'N/D'}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Iniciado em</span>
                  <div className="text-xs text-foreground font-mono">{inspectingContainer.state.startedAt || 'N/D'}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Plataforma</span>
                  <div className="text-xs text-foreground font-mono">{inspectingContainer.platform || 'linux/amd64'}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Política de Reinício</span>
                  <div className="text-xs text-foreground font-mono">{inspectingContainer.restartPolicy?.name || 'no'}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Diretório de Trabalho</span>
                  <div className="text-xs text-foreground font-mono">{inspectingContainer.workingDir || '/'}</div>
                </div>
              </div>

              {inspectingContainer.entrypoint && inspectingContainer.entrypoint.length > 0 && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Entrypoint</span>
                  <div className="text-xs font-mono text-foreground">{inspectingContainer.entrypoint.join(' ')}</div>
                </div>
              )}

              {inspectingContainer.cmd && inspectingContainer.cmd.length > 0 && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Comando (Cmd)</span>
                  <div className="text-xs font-mono text-foreground">{inspectingContainer.cmd.join(' ')}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REDE */}
          {inspectTab === 'network' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Endereço IP</span>
                  <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 select-all">
                    {inspectingContainer.networkSettings.ipAddress || 'Host Mode / Nenhum'}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Gateway</span>
                  <div className="text-xs font-mono text-foreground select-all">
                    {inspectingContainer.networkSettings.gateway || 'N/D'}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                  <span className="text-2xs uppercase font-bold text-muted-foreground">Endereço MAC</span>
                  <div className="text-xs font-mono text-foreground select-all">
                    {inspectingContainer.networkSettings.macAddress || 'N/D'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                <span className="text-2xs uppercase font-bold text-muted-foreground block">Mapeamento de Portas</span>
                {(() => {
                  const portEntries = flattenPortBindings(inspectingContainer.networkSettings.ports);
                  return portEntries.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhuma porta mapeada para o host.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {portEntries.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/60 text-xs font-mono">
                          <span className="text-muted-foreground">Container: {p.containerPort}/{p.protocol}</span>
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">Host: {p.hostIp || '0.0.0.0'}:{p.hostPort}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: VOLUMES */}
          {inspectTab === 'mounts' && (
            <div className="space-y-2">
              {inspectingContainer.mounts.length === 0 ? (
                <div className="text-xs text-muted-foreground p-4 text-center">Nenhum volume ou bind mount configurado.</div>
              ) : (
                inspectingContainer.mounts.map((m, idx) => (
                  <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-2xs font-bold uppercase">
                        {m.type} {m.rw ? '(rw)' : '(ro)'}
                      </span>
                      <span className="text-2xs text-muted-foreground">{m.mode || 'default'}</span>
                    </div>
                    <div className="font-mono text-[11px] space-y-1 select-all">
                      <div><span className="text-muted-foreground font-sans">Host:</span> <span className="text-foreground">{m.source}</span></div>
                      <div><span className="text-muted-foreground font-sans">Destino:</span> <span className="text-sky-600 dark:text-sky-400">{m.destination}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: VARIÁVEIS DE AMBIENTE */}
          {inspectTab === 'env' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={envSearchFilter}
                  onChange={(e) => setEnvSearchFilter(e.target.value)}
                  placeholder="Filtrar variáveis de ambiente..."
                  className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="space-y-1.5 max-h-96 overflow-auto scrollbar-thin">
                {inspectingContainer.env
                  .filter((e) => e.toLowerCase().includes(envSearchFilter.toLowerCase()))
                  .map((envStr, idx) => {
                    const eqIdx = envStr.indexOf('=');
                    const key = eqIdx > -1 ? envStr.slice(0, eqIdx) : envStr;
                    const val = eqIdx > -1 ? envStr.slice(eqIdx + 1) : '';
                    const isSecret = /pass|secret|key|token|auth|pwd/i.test(key);
                    const show = showSecretEnv[key];

                    return (
                      <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-muted/40 hover:bg-muted/60 rounded-lg border border-border/60 text-xs font-mono">
                        <span className="font-bold text-foreground truncate max-w-xs">{key}</span>
                        <div className="flex items-center gap-2 truncate flex-1 justify-end">
                          <span className="text-muted-foreground truncate select-all">
                            {isSecret && !show ? '••••••••' : val}
                          </span>
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() => setShowSecretEnv((prev) => ({ ...prev, [key]: !prev[key] }))}
                              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={show ? 'Ocultar segredo' : 'Exibir segredo'}
                            >
                              {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-end bg-muted/10 shrink-0">
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
