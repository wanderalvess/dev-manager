import React from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { Play, RefreshCw, Terminal, Sparkles } from 'lucide-react';
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
    <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-col space-y-3.5 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-foreground">
                Preparação de Ambiente &amp; Workflows
              </h2>

              <div className="relative inline-block" data-tour="profile-selector">
                <select
                  value={activeProfileId}
                  onChange={(e) => onSelectProfile(e.target.value)}
                  className="bg-card border border-primary/40 rounded-lg px-3 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground font-medium">
                      📁 {p.name} ({p.steps?.length || 0} passos)
                    </option>
                  ))}
                </select>
              </div>

              {isRunningProfile && (
                <span className="text-2xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Executando [{activeStepIndex}/{activeStepTotal}]...
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeProfile?.description || 'Ambiente 100% configurável sem nomes fixos. Suba projetos e libere portas em sequência.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* BOTÃO PRINCIPAL: Subir Ambiente em Sequência */}
          <button
            type="button"
            data-tour="run-profile-button"
            onClick={onRun}
            disabled={isRunDisabled}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
              isRunDisabled
                ? 'bg-primary/40 text-muted-foreground cursor-not-allowed border border-primary/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.02] border border-primary/40'
            }`}
          >
            <Play className={`w-4 h-4 fill-current ${isRunningProfile ? 'animate-spin' : ''}`} />
            <span>{isRunningProfile ? 'Executando Esteira...' : 'Subir Ambiente em Sequência'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenTour}
            className="h-9 w-9 rounded-xl border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-primary transition flex items-center justify-center shrink-0 cursor-pointer"
            title="Rever o tour guiado desta página"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
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
  );
};
