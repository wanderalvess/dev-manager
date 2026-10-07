import React from 'react';
import { RotateCw, Terminal, Power, Trash2 } from 'lucide-react';
import type { WslDistroInfo, ContainerEnvironment } from '../../../../../shared/types';

interface ContainersRuntimeControlsProps {
  selectedDistro: string;
  availableDistros: WslDistroInfo[];
  isSwitchingDistro: boolean;
  isOpeningWslTerminal: boolean;
  isTerminatingDistro: boolean;
  onSelectDistro: (distro: string) => void;
  onOpenWslTerminal: (distro?: string) => void;
  onTerminateDistro: (distro?: string) => void;
  environments: ContainerEnvironment[];
  selectedEnvId: string;
  onSelectEnvId: (id: string) => void;
  onStartEnvironment: (env: ContainerEnvironment) => void;
  onDeleteEnvironmentClick: (env: ContainerEnvironment) => void;
  sequenceRunning: boolean;
}

/** Grupo 1: contexto de execução (runtime WSL e grupo/ambiente salvo). */
export const ContainersRuntimeControls: React.FC<ContainersRuntimeControlsProps> = ({
  selectedDistro,
  availableDistros,
  isSwitchingDistro,
  isOpeningWslTerminal,
  isTerminatingDistro,
  onSelectDistro,
  onOpenWslTerminal,
  onTerminateDistro,
  environments,
  selectedEnvId,
  onSelectEnvId,
  onStartEnvironment,
  onDeleteEnvironmentClick,
  sequenceRunning
}) => (
  <div className="flex items-center bg-muted/50 border border-border/80 rounded-xl p-1 gap-1.5 shadow-2xs">
    {/* Seletor WSL */}
    <div className="flex items-center px-2 py-0.5 text-xs">
      <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
        Runtime
      </span>
      <select
        value={selectedDistro}
        onChange={(e) => onSelectDistro(e.target.value)}
        disabled={isSwitchingDistro}
        className="bg-transparent text-foreground font-semibold text-xs focus:outline-hidden cursor-pointer pr-1"
      >
        <option value="" className="bg-card text-foreground">
          Windows Host (Nativo)
        </option>
        {availableDistros.map((d) => (
          <option key={d.name} value={d.name} className="bg-card text-foreground">
            WSL: {d.name} {d.state === 'Running' ? '●' : '○'}
          </option>
        ))}
      </select>
      {isSwitchingDistro && <RotateCw className="w-3 h-3 animate-spin text-primary ml-1" />}

      {selectedDistro && (
        <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border/60">
          <button
            type="button"
            onClick={() => onOpenWslTerminal()}
            disabled={isOpeningWslTerminal}
            title={`Abrir terminal WSL na distro ${selectedDistro}`}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <Terminal className="w-3 h-3 text-sky-500" />
          </button>
          <button
            type="button"
            onClick={() => onTerminateDistro()}
            disabled={isTerminatingDistro}
            title={`Desligar distro ${selectedDistro} (wsl --terminate)`}
            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <Power className={`w-3 h-3 ${isTerminatingDistro ? 'animate-spin text-rose-500' : ''}`} />
          </button>
        </div>
      )}
    </div>

    {/* Separador vertical sutil */}
    {environments.length > 0 && <div className="h-4 w-px bg-border/80" />}

    {/* Seletor de Ambientes */}
    {environments.length > 0 && (
      <div className="flex items-center px-2 py-0.5 text-xs">
        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
          Grupo
        </span>
        <select
          value={selectedEnvId}
          onChange={(e) => {
            const id = e.target.value;
            onSelectEnvId(id);
            const found = environments.find((env) => env.id === id);
            if (found) onStartEnvironment(found);
          }}
          disabled={sequenceRunning}
          className="bg-transparent text-foreground font-semibold text-xs focus:outline-hidden cursor-pointer pr-1"
        >
          <option value="" className="bg-card text-foreground">
            Escolher...
          </option>
          {environments.map((env) => (
            <option key={env.id} value={env.id} className="bg-card text-foreground">
              {env.name}
            </option>
          ))}
        </select>
        {selectedEnvId && (
          <button
            type="button"
            onClick={() => {
              const found = environments.find((env) => env.id === selectedEnvId);
              if (found) onDeleteEnvironmentClick(found);
            }}
            disabled={sequenceRunning}
            title="Excluir grupo salvo"
            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    )}
  </div>
);
