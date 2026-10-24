import React from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { Play, RefreshCw, Sparkles } from 'lucide-react';
import type {
  AutomationProfile,
  PortStatus,
  ProcessStatus,
  ServiceStatus
} from '../../../../shared/types';
import { ProfileToolbar } from './ProfileToolbar';
import { ProfileActionsMenu } from './ProfileActionsMenu';
import { ProfileStepper } from './ProfileStepper';

interface EnvironmentCockpitPanelProps {
  profiles: AutomationProfile[];
  activeProfile: AutomationProfile | null;
  activeProfileId: string;
  services: ServiceStatus[];
  processes: ProcessStatus[];
  ports: PortStatus[];
  isRunningProfile: boolean;
  activeStepIndex: number;
  activeStepTotal: number;
  currentRunningStepId: string | null;
  isStoppingAll: boolean;
  importFileInputRef: RefObject<HTMLInputElement>;
  onSelectProfile: (id: string) => void;
  onNewProfile: () => void;
  onEditProfile: () => void;
  onDuplicateProfile: () => void;
  onExportProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onImportFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRun: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
  onOpenTour: () => void;
}

/** Cockpit unificado: seletor de perfis, gestão do perfil, execução da esteira e stepper. */
export const EnvironmentCockpitPanel: React.FC<EnvironmentCockpitPanelProps> = ({
  profiles,
  activeProfile,
  activeProfileId,
  services,
  processes,
  ports,
  isRunningProfile,
  activeStepIndex,
  activeStepTotal,
  currentRunningStepId,
  isStoppingAll,
  importFileInputRef,
  onSelectProfile,
  onNewProfile,
  onEditProfile,
  onDuplicateProfile,
  onExportProfile,
  onDeleteProfile,
  onImportFileChange,
  onRun,
  onStopAll,
  onRestartAll,
  onOpenTour
}) => {
  const isRunDisabled = isRunningProfile || !activeProfile?.steps || activeProfile.steps.length === 0;

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Título da página (sem cartão) + perfil e ação principal */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground">Ambiente Dev</h1>
            {isRunningProfile && (
              <span className="text-xs bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full font-medium animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Executando {activeStepIndex} de {activeStepTotal}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {activeProfile?.description ||
              'Prepara a máquina para desenvolver: para serviços, libera portas, abre a IDE e sobe o Karaf, nessa ordem.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative inline-block" data-tour="profile-selector">
            <select
              value={activeProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              aria-label="Perfil do ambiente"
              className="h-10 bg-card border border-input rounded-[10px] px-3 text-sm font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-foreground font-medium">
                  {p.name} ({p.steps?.length || 0} passos)
                </option>
              ))}
            </select>
          </div>

          {/* Ação principal da tela: Subir Ambiente em Sequência */}
          <button
            type="button"
            data-tour="run-profile-button"
            onClick={onRun}
            disabled={isRunDisabled}
            className={`h-10 px-4 rounded-[10px] font-medium text-sm flex items-center gap-2 transition-colors ${
              isRunDisabled
                ? 'bg-primary/40 text-primary-foreground/80 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Play className={`w-4 h-4 fill-current ${isRunningProfile ? 'animate-spin' : ''}`} />
            <span>{isRunningProfile ? 'Executando esteira...' : 'Subir ambiente'}</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[14px] p-4 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ProfileToolbar
            profiles={profiles}
            activeProfile={activeProfile}
            importFileInputRef={importFileInputRef}
            onNew={onNewProfile}
            onEdit={onEditProfile}
            onDuplicate={onDuplicateProfile}
            onExport={onExportProfile}
            onDelete={onDeleteProfile}
            onImportFileChange={onImportFileChange}
          />

          <ProfileActionsMenu
            isRunningProfile={isRunningProfile}
            isStoppingAll={isStoppingAll}
            onStopAll={onStopAll}
            onRestartAll={onRestartAll}
          />

          <button
            type="button"
            onClick={onOpenTour}
            className="ml-auto h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center justify-center shrink-0 cursor-pointer"
            title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

      {activeProfile?.steps && activeProfile.steps.length > 0 && (
        <ProfileStepper
          profile={activeProfile}
          services={services}
          processes={processes}
          ports={ports}
          isRunningProfile={isRunningProfile}
          activeStepIndex={activeStepIndex}
          currentRunningStepId={currentRunningStepId}
        />
      )}
      </div>
    </div>
  );
};
