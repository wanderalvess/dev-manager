import React from 'react';
import {
  Activity,
  Boxes,
  Download,
  History,
  Layers,
  ListTree,
  Pencil,
  Play,
  Sparkles,
  Square
} from 'lucide-react';
import type { DeployProfile } from '../../../../shared/types';
import { DeployProfileMenu } from './DeployProfileMenu';

interface DeployHeaderProps {
  profiles: DeployProfile[];
  activeProfile: DeployProfile | null;
  activeProfileId: string;
  isDeploying: boolean;
  onOpenTour: () => void;
  onSelectProfile: (id: string) => void;
  onEditProfile: () => void;
  onNewProfile: () => void;
  onDuplicateProfile: () => void;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onOpenHistory: () => void;
  onOpenBundles: () => void;
  onOpenRoutine801: () => void;
  onOpenFeatures: () => void;
  onOpenJvmMemory: () => void;
  onAbort: () => void;
  onRun: () => void;
}

const toolbarBtn =
  'px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border text-foreground shadow-2xs cursor-pointer';

export const DeployHeader: React.FC<DeployHeaderProps> = ({
  profiles,
  activeProfile,
  activeProfileId,
  isDeploying,
  onOpenTour,
  onSelectProfile,
  onEditProfile,
  onNewProfile,
  onDuplicateProfile,
  onExportProfile,
  onImportProfile,
  onOpenHistory,
  onOpenBundles,
  onOpenRoutine801,
  onOpenFeatures,
  onOpenJvmMemory,
  onAbort,
  onRun
}) => (
  <div className="cockpit-panel rounded-xl p-4 shadow-xl border border-border shrink-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            Perfis de Deploy
            <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
              Karaf · Docker · Genérico
            </span>
            <button
              type="button"
              onClick={onOpenTour}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
              title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </h1>
          <p className="text-2xs text-muted-foreground">
            {activeProfile?.description || 'Monte etapas sequenciais de build e publicação para qualquer alvo.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2" data-tour="select-deploy-profile">
        <select
          value={activeProfileId}
          onChange={(e) => onSelectProfile(e.target.value)}
          disabled={isDeploying}
          className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary transition-colors font-mono max-w-[220px]"
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
          disabled={!activeProfile}
          className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          title="Editar Perfil" aria-label="Editar Perfil"
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
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Histórico</span>
        </button>

        <button
          type="button"
          onClick={onOpenBundles}
          className={`${toolbarBtn} border-border`}
          title="Abrir gerenciador visual de bundles OSGi"
        >
          <ListTree className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Bundles OSGi</span>
        </button>

        <button
          type="button"
          onClick={onOpenRoutine801}
          className={`${toolbarBtn} border-primary/30`}
          title="Abrir catálogo oficial de serviços e rotinas (Rotina 801 - Atualização de Serviços Web)"
        >
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Catálogo 801</span>
        </button>

        <button
          type="button"
          onClick={onOpenFeatures}
          className={`${toolbarBtn} border-border`}
          title="Gerenciador de Features Maven/Karaf e repositórios (feature:repo-list)"
        >
          <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Features Karaf</span>
        </button>

        <button
          type="button"
          onClick={onOpenJvmMemory}
          className={`${toolbarBtn} border-border`}
          title="Monitor de Memória Heap e Non-Heap da JVM em tempo real (JMX / Karaf)"
        >
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Memória JVM</span>
        </button>

        {isDeploying ? (
          <button
            type="button"
            onClick={onAbort}
            className="px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-1.5 transition-colors bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer"
            title="Interromper execução do perfil imediatamente"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Cancelar</span>
          </button>
        ) : (
          <button
            data-tour="run-active-profile"
            onClick={onRun}
            disabled={isDeploying || !activeProfile || activeProfile.steps.length === 0}
            className="px-5 py-2 rounded-lg font-semibold text-xs flex items-center space-x-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar Perfil</span>
          </button>
        )}
      </div>
    </div>
  </div>
);
