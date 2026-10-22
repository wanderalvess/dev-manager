import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, ListTree, Package, Terminal, Zap } from 'lucide-react';
import { DeployDiagQuickTab } from './DeployDiagQuickTab';
import { DeployDiagFeatureTab } from './DeployDiagFeatureTab';
import { DeployDiagBundleTab } from './DeployDiagBundleTab';
import { useKarafConsole } from '../../hooks/karafConsole/KarafConsoleContext';
import { confirmKarafCommand } from '../../hooks/karafConsole/useKarafQuickCommands';

type DiagTab = 'quick' | 'feature' | 'bundle';

const COLLAPSED_KEY = 'devManager.deploy.diagnosticsCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [diagFeatureName, setDiagFeatureName] = useState('');
  const [diagBundleId, setDiagBundleId] = useState('');
  const disabled = isDeploying || isDiagRunning !== null;
  const { isOpen: isConsoleOpen, setOpen: setConsoleOpen } = useKarafConsole();

  // Botões prontos pedem confirmação nos comandos que apagam estado; o que o usuário digita no console roda direto.
  const guardedRun = useCallback(
    async (cmd: string, label: string) => {
      if (await confirmKarafCommand(cmd)) onRunDiagnostic(cmd, label);
    },
    [onRunDiagnostic]
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      /* sem storage: o painel só não lembra o estado */
    }
  };

  return (
    <div className="cockpit-panel rounded-xl p-3 space-y-3 border border-border/80 shadow-2xs">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        title={collapsed ? 'Mostrar os diagnósticos' : 'Recolher os diagnósticos'}
        className="w-full flex items-center justify-between gap-2 cursor-pointer group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-warning" /> Diagnósticos Rápidos OSGi (client.bat)
          {isDiagRunning !== null && <span className="text-2xs font-normal normal-case text-primary">executando…</span>}
        </span>
        <span className="flex items-center gap-1 text-2xs text-muted-foreground group-hover:text-foreground transition">
          {collapsed ? 'Expandir' : 'Recolher'}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </span>
      </button>

      {!collapsed && (
        <>
          {/* Abas de Escopo: Rápidos | Features | Bundles */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/70 rounded-lg text-xs">
            <button type="button" onClick={() => setDiagTab('quick')} className={tabClass(diagTab === 'quick')}>
              <Zap className="w-3.5 h-3.5 text-warning" />
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

          {diagTab === 'quick' && <DeployDiagQuickTab disabled={disabled} onRun={guardedRun} />}
          {diagTab === 'feature' && (
            <DeployDiagFeatureTab
              disabled={disabled}
              onRun={guardedRun}
              featureName={diagFeatureName}
              onFeatureNameChange={setDiagFeatureName}
            />
          )}
          {diagTab === 'bundle' && (
            <DeployDiagBundleTab
              disabled={disabled}
              onRun={guardedRun}
              bundleId={diagBundleId}
              onBundleIdChange={setDiagBundleId}
            />
          )}

          {/* Comando livre: o campo único fica no console (histórico ↑/↓ e Ctrl+C), aqui só o atalho para abri-lo. */}
          <div className="pt-2.5 border-t border-border/70 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-primary" />
              Comando livre: digite no campo do Console Karaf (Ctrl+`).
            </span>
            {!isConsoleOpen && (
              <button
                type="button"
                onClick={() => setConsoleOpen(true)}
                className="text-primary hover:underline cursor-pointer shrink-0"
              >
                Abrir console
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
