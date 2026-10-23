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
  online: { label: 'Online', className: 'bg-success/10 text-success border-success/30' },
  offline: { label: 'Offline', className: 'bg-danger/10 text-danger border-danger/30' },
  checking: { label: 'Verificando…', className: 'bg-muted text-muted-foreground border-border' }
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
    <div className="h-full flex flex-col p-5 space-y-4 overflow-y-auto max-w-full">
      <div className="cockpit-panel rounded-xl p-4 border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/30 text-warning shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Karaf
              <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded border ${status.className}`}>
                {status.label}
              </span>
            </h1>
            <p className="text-2xs text-muted-foreground">
              Bundles, features, catálogo 801, memória da JVM e diagnósticos do servidor OSGi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {diagnostics.isDiagRunning !== null && (
            <button
              type="button"
              onClick={() => void diagnostics.abortDiagnostic()}
              className="px-3 py-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {karaf.isStartingKaraf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Iniciar Karaf embedded
            </button>
          )}
          <button
            type="button"
            onClick={() => setConsoleOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Abrir o Console Karaf (Ctrl+`)"
          >
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            Console
          </button>
          <button
            type="button"
            onClick={tour.open}
            className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
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
