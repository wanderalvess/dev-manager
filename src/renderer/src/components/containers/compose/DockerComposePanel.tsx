import React from 'react';
import {
  Layers,
  Play,
  Square,
  RotateCw,
  Terminal,
  RefreshCw
} from 'lucide-react';
import type { ComposeServiceStatus } from '../../../../../shared/types';

export interface DockerComposePanelProps {
  composeFilePath: string;
  setComposeFilePath: (path: string) => void;
  composeProfile: string;
  setComposeProfile: (profile: string) => void;
  composeBuild: boolean;
  setComposeBuild: (build: boolean) => void;
  composeVolumes: boolean;
  setComposeVolumes: (volumes: boolean) => void;
  isComposeRunning: 'up' | 'down' | null;
  isComposeRestarting: boolean;
  isLoadingComposeStatus: boolean;
  composeServices: ComposeServiceStatus[];
  composeOutput: string;
  recentComposeFiles: string[];
  onSelectComposeFile: () => void;
  onComposeUp: () => void;
  onComposeDown: () => void;
  onComposeRestart: () => void;
  onComposeLogs: () => void;
  onComposeStatus: () => void;
  isComposeExpanded: boolean;
  setIsComposeExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  composeOutputRef: React.RefObject<HTMLPreElement>;
}

export const DockerComposePanel: React.FC<DockerComposePanelProps> = ({
  composeFilePath,
  setComposeFilePath,
  composeProfile,
  setComposeProfile,
  composeBuild,
  setComposeBuild,
  composeVolumes,
  setComposeVolumes,
  isComposeRunning,
  isComposeRestarting,
  isLoadingComposeStatus,
  composeServices,
  composeOutput,
  recentComposeFiles,
  onSelectComposeFile,
  onComposeUp,
  onComposeDown,
  onComposeRestart,
  onComposeLogs,
  onComposeStatus,
  isComposeExpanded,
  setIsComposeExpanded,
  composeOutputRef
}) => {
  return (
    <div
      className="mx-4 mt-3 p-3 bg-card/60 backdrop-blur-sm border border-border/70 rounded-xl shrink-0 space-y-2.5 shadow-2xs"
      data-tour="compose-panel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Docker Compose</span>
          {composeServices.length > 0 && (
            <span className="text-2xs font-mono px-2 py-0.2 rounded-full bg-muted border border-border/50 text-muted-foreground font-normal">
              {composeServices.length} serviços
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {recentComposeFiles.length > 0 && (
            <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="hidden sm:inline">Recentes:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) setComposeFilePath(e.target.value);
                }}
                value=""
                className="bg-muted/70 text-foreground text-2xs border border-border/70 rounded px-1.5 py-0.5 cursor-pointer focus:outline-hidden max-w-[140px] truncate"
              >
                <option value="">Selecionar recente...</option>
                {recentComposeFiles.map((file, idx) => (
                  <option key={idx} value={file}>
                    {file.split(/[\\/]/).pop()} ({file})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsComposeExpanded((prev) => !prev)}
            className="text-2xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
          >
            {isComposeExpanded ? 'Recolher Opções' : 'Configurar Compose'}
          </button>
        </div>
      </div>

      {isComposeExpanded && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <input
            type="text"
            value={composeFilePath}
            onChange={(e) => setComposeFilePath(e.target.value)}
            placeholder="Caminho do docker-compose.yml"
            className="flex-1 min-w-[220px] bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-muted-foreground/60"
          />
          <button
            onClick={onSelectComposeFile}
            className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
          >
            Selecionar
          </button>
          <input
            type="text"
            value={composeProfile}
            onChange={(e) => setComposeProfile(e.target.value)}
            placeholder="Profile (opcional)"
            className="w-32 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-muted-foreground/60"
          />

          <label className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={composeBuild}
              onChange={(e) => setComposeBuild(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <span>--build</span>
          </label>

          <label className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={composeVolumes}
              onChange={(e) => setComposeVolumes(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <span>-v (volumes)</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onComposeUp}
          disabled={!composeFilePath.trim() || isComposeRunning !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
        >
          {isComposeRunning === 'up' ? (
            <RotateCw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          Up
        </button>
        <button
          onClick={onComposeDown}
          disabled={!composeFilePath.trim() || isComposeRunning !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
        >
          {isComposeRunning === 'down' ? (
            <RotateCw className="w-3 h-3 animate-spin" />
          ) : (
            <Square className="w-3 h-3 fill-current" />
          )}
          Down
        </button>
        <button
          onClick={onComposeRestart}
          disabled={!composeFilePath.trim() || isComposeRestarting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
          title="Reiniciar serviços do Compose"
        >
          <RotateCw className={`w-3 h-3 ${isComposeRestarting ? 'animate-spin text-amber-500' : ''}`} />
          Restart
        </button>
        <button
          onClick={onComposeLogs}
          disabled={!composeFilePath.trim()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
          title="Buscar últimos logs do Compose"
        >
          <Terminal className="w-3 h-3" />
          Logs
        </button>
        <button
          onClick={onComposeStatus}
          disabled={!composeFilePath.trim() || isLoadingComposeStatus}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98 shadow-2xs"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingComposeStatus ? 'animate-spin text-primary' : ''}`} />
          Status
        </button>
      </div>

      {composeServices.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {composeServices.map((s) => (
            <span
              key={s.name}
              className={`text-2xs font-mono px-2 py-0.5 rounded-md border ${
                s.state.toLowerCase().includes('running')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted/80 border-border text-muted-foreground'
              }`}
            >
              {s.name}: {s.state}
            </span>
          ))}
        </div>
      )}

      {composeOutput && (
        <pre
          ref={composeOutputRef}
          className="max-h-32 overflow-auto bg-muted/60 dark:bg-muted/20 text-foreground text-2xs font-mono p-2.5 rounded-lg whitespace-pre-wrap border border-border/70 shadow-inner"
        >
          {composeOutput}
        </pre>
      )}
    </div>
  );
};
