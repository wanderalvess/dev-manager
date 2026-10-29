import React from 'react';
import {
  Cpu,
  GitMerge,
  History,
  Pencil,
  Play,
  Sparkles,
  Square
} from 'lucide-react';
import type { DeployProfile } from '../../../../shared/types';
import { countEnabledSteps } from '../../utils/deployProfileUtils';
import { DeployProfileMenu } from './DeployProfileMenu';

interface DeployHeaderProps {
  profiles: DeployProfile[];
  activeProfile: DeployProfile | null;
  activeProfileId: string;
  isDeploying: boolean;
  runningStepId?: string | null;
  isDiagRunning?: string | null;
  onOpenTour: () => void;
  onSelectProfile: (id: string) => void;
  onEditProfile: () => void;
  onNewProfile: () => void;
  onDuplicateProfile: () => void;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onOpenHistory: () => void;
  onOpenKaraf: () => void;
  onOpenChainModal?: () => void;
  onAbort: () => void;
  onRun: () => void;
}

const toolbarBtn =
  'h-10 px-3 rounded-[10px] font-medium text-sm flex items-center gap-1.5 transition-colors bg-card hover:bg-muted border text-foreground cursor-pointer';

export const DeployHeader: React.FC<DeployHeaderProps> = ({
  profiles,
  activeProfile,
  activeProfileId,
  isDeploying,
  runningStepId,
  isDiagRunning,
  onOpenTour,
  onSelectProfile,
  onEditProfile,
  onNewProfile,
  onDuplicateProfile,
  onExportProfile,
  onImportProfile,
  onOpenHistory,
  onOpenKaraf,
  onOpenChainModal,
  onAbort,
  onRun
}) => {
  const { enabledCount, totalCount } = countEnabledSteps(activeProfile);
  const isBusy = isDeploying || !!runningStepId || !!isDiagRunning;

  return (
    <div className="shrink-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-bold tracking-tight text-foreground flex items-center gap-3">
            Deploy
            <button
              type="button"
              onClick={onOpenTour}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title="Rever o tour guiado desta página"
              aria-label="Rever o tour guiado desta página"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </h1>
          <p className="sr-only">
            {activeProfile?.description || 'Monte etapas sequenciais de build e publicação para qualquer alvo (Karaf, Docker ou genérico).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-tour="select-deploy-profile">
          <select
            value={activeProfileId}
            onChange={(e) => onSelectProfile(e.target.value)}
            disabled={isBusy}
            className="h-10 bg-card border border-input rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors max-w-[240px]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            data-tour="edit-deploy-profile"
            onClick={onEditProfile}
            disabled={!activeProfile || isBusy}
            className="h-10 w-10 flex items-center justify-center bg-card hover:bg-muted border border-border rounded-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            title="Editar Perfil"
            aria-label="Editar Perfil"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <DeployProfileMenu
            hasActiveProfile={!!activeProfile}
            onNew={onNewProfile}
            onDuplicate={onDuplicateProfile}
            onExport={onExportProfile}
            onImport={onImportProfile}
          />

          <button
            type="button"
            onClick={onOpenHistory}
            className={`${toolbarBtn} border-border`}
            title="Ver histórico completo das últimas execuções de deploy"
          >
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Histórico</span>
          </button>

          <button
            type="button"
            onClick={onOpenKaraf}
            className={`${toolbarBtn} border-border`}
            title="Bundles, features, catálogo 801, memória da JVM e diagnósticos do Karaf"
          >
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span>Karaf</span>
          </button>

          {onOpenChainModal && (
            <button
              type="button"
              onClick={onOpenChainModal}
              className={`${toolbarBtn} border-border`}
              title="Criar e executar esteira automatizada de compilação multi-camadas (ex: Venda -> Pedido -> Varejo)"
            >
              <GitMerge className="w-4 h-4 text-muted-foreground" />
              <span>Cadeia multi-módulos</span>
            </button>
          )}

          {isBusy ? (
            <button
              type="button"
              onClick={onAbort}
              className="h-10 px-4 rounded-[10px] font-medium text-sm flex items-center gap-1.5 transition-colors bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
              title={
                isDeploying
                  ? 'Interromper execução do perfil imediatamente'
                  : isDiagRunning
                  ? 'Interromper diagnóstico em execução'
                  : 'Interromper etapa em execução'
              }
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancelar</span>
            </button>
          ) : (
            <button
              data-tour="run-active-profile"
              onClick={onRun}
              disabled={isBusy || !activeProfile || enabledCount === 0}
              className="h-10 px-4 rounded-[10px] font-medium text-sm flex items-center gap-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              title={
                enabledCount === 0
                  ? 'Selecione ao menos uma etapa para executar'
                  : enabledCount < totalCount
                  ? `Executar ${enabledCount} etapa(s) selecionada(s) automaticamente`
                  : 'Executar todas as etapas do perfil em sequência'
              }
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {enabledCount === 0
                  ? 'Nenhuma selecionada'
                  : enabledCount < totalCount
                  ? `Executar selecionadas (${enabledCount})`
                  : 'Executar perfil'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
