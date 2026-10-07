import React, { useState } from 'react';
import { ListTree, Package, Zap } from 'lucide-react';
import { DeployDiagQuickTab } from './DeployDiagQuickTab';
import { DeployDiagFeatureTab } from './DeployDiagFeatureTab';
import { DeployDiagBundleTab } from './DeployDiagBundleTab';
import { DeployKarafPrompt } from './DeployKarafPrompt';
import { useKarafCommandPrompt } from '../../hooks/deploy/useKarafCommandPrompt';

type DiagTab = 'quick' | 'feature' | 'bundle';

interface DeployDiagnosticsPanelProps {
  isDeploying: boolean;
  isDiagRunning: string | null;
  onRunDiagnostic: (cmd: string, label: string) => void;
}

const tabClass = (active: boolean) =>
  `flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
    active
      ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
      : 'text-muted-foreground hover:text-foreground'
  }`;

/** Ferramentas de diagnóstico rápido do Karaf (abas + prompt de comando). */
export const DeployDiagnosticsPanel: React.FC<DeployDiagnosticsPanelProps> = ({
  isDeploying,
  isDiagRunning,
  onRunDiagnostic
}) => {
  const [diagTab, setDiagTab] = useState<DiagTab>('quick');
  const [diagFeatureName, setDiagFeatureName] = useState('');
  const [diagBundleId, setDiagBundleId] = useState('');
  const disabled = isDeploying || isDiagRunning !== null;
  const prompt = useKarafCommandPrompt({ isBlocked: disabled, onRun: onRunDiagnostic });

  return (
    <div className="cockpit-panel rounded-xl p-3.5 space-y-3 border border-border/80 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Diagnósticos Rápidos OSGi (client.bat)
        </div>
      </div>

      {/* Abas de Escopo: Rápidos | Features | Bundles */}
      <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/70 rounded-lg text-xs">
        <button type="button" onClick={() => setDiagTab('quick')} className={tabClass(diagTab === 'quick')}>
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Rápidos</span>
        </button>
        <button type="button" onClick={() => setDiagTab('feature')} className={tabClass(diagTab === 'feature')}>
          <ListTree className="w-3.5 h-3.5 text-primary" />
          <span>Features</span>
        </button>
        <button type="button" onClick={() => setDiagTab('bundle')} className={tabClass(diagTab === 'bundle')}>
          <Package className="w-3.5 h-3.5 text-primary" />
          <span>Bundles</span>
        </button>
      </div>

      {diagTab === 'quick' && <DeployDiagQuickTab disabled={disabled} onRun={onRunDiagnostic} />}
      {diagTab === 'feature' && (
        <DeployDiagFeatureTab
          disabled={disabled}
          onRun={onRunDiagnostic}
          featureName={diagFeatureName}
          onFeatureNameChange={setDiagFeatureName}
        />
      )}
      {diagTab === 'bundle' && (
        <DeployDiagBundleTab
          disabled={disabled}
          onRun={onRunDiagnostic}
          bundleId={diagBundleId}
          onBundleIdChange={setDiagBundleId}
        />
      )}

      <DeployKarafPrompt
        value={prompt.customCommand}
        disabled={disabled}
        onChange={prompt.setCustomCommand}
        onSubmit={prompt.handleCustomCommandSubmit}
        onKeyDown={prompt.handleCustomCommandKeyDown}
      />
    </div>
  );
};
