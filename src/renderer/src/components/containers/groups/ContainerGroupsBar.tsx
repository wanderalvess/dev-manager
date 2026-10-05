import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Play,
  Square,
  Pencil,
  Trash2,
  RotateCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ContainerEnvironment, DockerContainerInfo } from '../../../../../shared/types';
import { computeGroupStatus, getGroupContainerNames } from '../../../utils/dockerContainerUtils';

export interface ContainerGroupsBarProps {
  environments: ContainerEnvironment[];
  containers: DockerContainerInfo[];
  sequenceProgress: {
    running: boolean;
    currentName?: string;
    index?: number;
    total?: number;
    waitingSeconds?: number;
  };
  activeGroupId?: string | null;
  onStartGroup: (group: ContainerEnvironment) => void;
  onStopGroup: (group: ContainerEnvironment) => void;
  onEditGroup: (group: ContainerEnvironment) => void;
  onDeleteGroup: (group: ContainerEnvironment) => void;
  onCreateGroup: () => void;
}

export const ContainerGroupsBar: React.FC<ContainerGroupsBarProps> = ({
  environments,
  containers,
  sequenceProgress,
  activeGroupId,
  onStartGroup,
  onStopGroup,
  onEditGroup,
  onDeleteGroup,
  onCreateGroup
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="mx-4 mt-3 p-3 bg-card/75 border border-border/80 rounded-2xl shadow-xs transition-all">
      {/* Topo do Painel de Grupos */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground">Grupos de Containers</h3>
              <span className="text-2xs px-2 py-0.2 rounded-full font-semibold bg-muted text-muted-foreground border border-border/60">
                {environments.length} {environments.length === 1 ? 'grupo' : 'grupos'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Agrupe containers relacionados para subir ou parar todos em sequência com um único clique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateGroup}
            disabled={sequenceProgress.running}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 disabled:opacity-50"
            title="Criar novo grupo personalizado de containers"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Grupo</span>
          </button>

          {environments.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title={isExpanded ? 'Recolher painel de grupos' : 'Expandir painel de grupos'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Expansível com os Cards dos Grupos */}
      {isExpanded && (
        <div className="mt-3">
          {environments.length === 0 ? (
            <div className="py-4 px-3 border border-dashed border-border/70 rounded-xl bg-muted/20 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">Nenhum grupo configurado</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Organize seus containers em grupos (ex: Microserviços, Stack Financeiro, Bancos) para subi-los juntos rapidamente.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateGroup}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs hover:bg-primary/90"
              >
                + Criar Primeiro Grupo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {environments.map((env) => {
                const status = computeGroupStatus(env, containers);
                const containerNames = getGroupContainerNames(env);
                const isGroupRunningNow = sequenceProgress.running && activeGroupId === env.id;

                return (
                  <div
                    key={env.id}
                    className="relative overflow-hidden rounded-xl border border-border/80 bg-background/80 hover:border-border transition-all p-3 flex flex-col justify-between gap-2 shadow-2xs group"
                  >
                    {/* Linha indicadora de cor do grupo */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: env.color || '#0066cc' }}
                    />

                    <div className="pl-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground truncate" title={env.name}>
                              {env.name}
                            </h4>
                            {env.wslDistro && (
                              <span className="text-2xs px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-medium">
                                {env.wslDistro}
                              </span>
                            )}
                          </div>

                          {/* Status dos Containers */}
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-2xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                status.isAllRunning
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                  : status.running > 0
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-muted text-muted-foreground border-border/60'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  status.isAllRunning
                                    ? 'bg-emerald-500 animate-pulse'
                                    : status.running > 0
                                    ? 'bg-amber-500'
                                    : 'bg-zinc-400 dark:bg-zinc-600'
                                }`}
                              />
                              <span>
                                {status.running}/{status.total} rodando
                              </span>
                            </span>

                            <span className="text-2xs text-muted-foreground">
                              {containerNames.length} {containerNames.length === 1 ? 'container' : 'containers'}
                            </span>
                          </div>
                        </div>

                        {/* Ações de Edição e Exclusão */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditGroup(env)}
                            disabled={sequenceProgress.running}
                            title="Editar grupo (alterar containers, ordem ou delays)"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteGroup(env)}
                            disabled={sequenceProgress.running}
                            title="Excluir este grupo"
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Lista de Containers do Grupo em Pills */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {containerNames.slice(0, 4).map((name) => {
                          const isCrunning = containers.some(
                            (c) => c.names.replace(/^\//, '').toLowerCase() === name.toLowerCase() && c.state === 'running'
                          );
                          return (
                            <span
                              key={name}
                              className={`text-2xs font-mono px-1.5 py-0.5 rounded border max-w-[120px] truncate ${
                                isCrunning
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                  : 'bg-muted/60 text-muted-foreground border-border/50'
                              }`}
                              title={name}
                            >
                              {name}
                            </span>
                          );
                        })}
                        {containerNames.length > 4 && (
                          <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                            +{containerNames.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botões Principais de Controle do Grupo */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 pl-1.5">
                      <button
                        type="button"
                        onClick={() => onStartGroup(env)}
                        disabled={sequenceProgress.running}
                        title={`Subir todos os containers de "${env.name}" em sequência`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        {isGroupRunningNow ? (
                          <RotateCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>Subir Grupo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStopGroup(env)}
                        disabled={sequenceProgress.running || status.running === 0}
                        title={`Parar todos os containers de "${env.name}"`}
                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-card hover:bg-zinc-800 hover:text-white border border-border/80 rounded-lg text-xs font-semibold text-muted-foreground transition cursor-pointer disabled:opacity-40 active:scale-98"
                      >
                        <Square className="w-3 h-3" />
                        <span>Parar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
