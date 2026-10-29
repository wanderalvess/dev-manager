import React, { useState } from 'react';
import { Play, RefreshCw, Square, Terminal } from 'lucide-react';
import { GitProjectInfo } from '../../../shared/types';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { KARAF_TOUR_STEPS, KARAF_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/karafTour';
import { DeployDiagnosticsPanel } from '../components/deploy/DeployDiagnosticsPanel';
import { KarafToolCards, type KarafTool } from '../components/karaf/page/KarafToolCards';
import { KarafBundleManagerModal } from '../components/KarafBundleManagerModal';
import { KarafFeaturesModal } from '../components/karaf/modals/KarafFeaturesModal';
import { KarafJvmMemoryModal } from '../components/KarafJvmMemoryModal';
import { Routine801CatalogModal } from '../components/Routine801CatalogModal';
import { useKarafStatus } from '../hooks/deploy/useKarafStatus';
import { useKarafDiagnostics } from '../hooks/deploy/useKarafDiagnostics';
import { useKarafConsole } from '../hooks/karafConsole/KarafConsoleContext';

interface KarafPageProps {
  projects: GitProjectInfo[];
}

const STATUS_STYLE: Record<'online' | 'offline' | 'checking', { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-success/10 text-success' },
  offline: { label: 'Offline', className: 'bg-danger/10 text-danger' },
  checking: { label: 'Verificando…', className: 'bg-muted text-muted-foreground' }
};

/** Gestão e diagnóstico do Apache Karaf: bundles, features, catálogo 801, memória da JVM e diagnósticos rápidos. */
export const KarafPage: React.FC<KarafPageProps> = ({ projects }) => {
  const tour = usePageTour(KARAF_TOUR_STORAGE_KEY);
  const karaf = useKarafStatus();
  const diagnostics = useKarafDiagnostics(false);
  const { setOpen: setConsoleOpen } = useKarafConsole();
  const [openTool, setOpenTool] = useState<KarafTool | null>(null);

  const statusKey = karaf.isKarafOnline === null ? 'checking' : karaf.isKarafOnline ? 'online' : 'offline';
  const status = STATUS_STYLE[statusKey];
  const closeTool = () => setOpenTool(null);

  return (
    <div className="h-full flex flex-col px-4 py-3 md:px-5 md:py-4 space-y-3 overflow-y-auto max-w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-bold tracking-tight text-foreground flex items-center gap-3">
              Karaf
              <span className={`text-[13px] font-medium px-2.5 py-0.5 rounded-full ${status.className}`}>
                {status.label}
              </span>
            </h1>
            <p className="sr-only">
              Bundles, features, catálogo 801, memória da JVM e diagnósticos do servidor OSGi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {diagnostics.isDiagRunning !== null && (
            <button
              type="button"
              onClick={() => void diagnostics.abortDiagnostic()}
              className="px-3 h-10 rounded-[10px] bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3" />
              Interromper diagnóstico
            </button>
          )}
          {karaf.isKarafOnline === false && (
            <button
              type="button"
              onClick={() => void karaf.handleStartEmbeddedKaraf()}
              disabled={karaf.isStartingKaraf}
              className="px-4 h-10 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {karaf.isStartingKaraf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Iniciar Karaf embedded
            </button>
          )}
          <button
            type="button"
            onClick={() => setConsoleOpen(true)}
            className="px-3 h-10 rounded-[10px] bg-card hover:bg-muted text-foreground border border-border text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir o Console Karaf (Ctrl+`)"
          >
            <Terminal className="w-4 h-4 text-muted-foreground" />
            Console
          </button>
          <button
            type="button"
            onClick={tour.open}
            className="px-3 h-10 rounded-[10px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Rever o tour guiado desta tela"
          >
            Tour
          </button>
        </div>
      </div>

      <KarafToolCards onOpen={setOpenTool} />

      <DeployDiagnosticsPanel
        isDeploying={false}
        isDiagRunning={diagnostics.isDiagRunning}
        onRunDiagnostic={(cmd, label) => void diagnostics.runDiagnostic(cmd, label)}
      />

      <KarafBundleManagerModal isOpen={openTool === 'bundles'} onClose={closeTool} projects={projects} />
      <KarafFeaturesModal isOpen={openTool === 'features'} onClose={closeTool} />
      <Routine801CatalogModal isOpen={openTool === 'catalog801'} onClose={closeTool} />
      <KarafJvmMemoryModal isOpen={openTool === 'jvm'} onClose={closeTool} />

      <OnboardingTour
        steps={KARAF_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={KARAF_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
