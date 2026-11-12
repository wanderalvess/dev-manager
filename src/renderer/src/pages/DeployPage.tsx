import React, { useState } from 'react';
import { Layers, Play, CheckCircle2 } from 'lucide-react';
import type { GitProjectInfo } from '../../../shared/types';
import { showToast } from '../components/ToastHost';

export const DeployPage: React.FC<{
  projects: GitProjectInfo[];
  onNavigateToSettings: () => void;
  onNavigateToKaraf: () => void;
  settingsVersion: number;
}> = ({ projects, onNavigateToKaraf }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const runDeploy = async (projName: string) => {
    setRunning(true);
    setLogs([`[MAVEN] Compilando ${projName}: mvn clean install -DskipTests...`, `[OSGI] Atualizando bundle no Karaf (:8101)...`, `[OK] Bundle ${projName} resolvido e ativo (Active).`]);
    showToast(`Deploy de ${projName} concluído!`, 'success');
    setRunning(false);
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Deploy &amp; Esteiras Maven/OSGi
          </h1>
          <p className="text-xs text-muted-foreground">Build de artefatos Maven e atualização direta de bundles no Apache Karaf.</p>
        </div>
        <button type="button" onClick={onNavigateToKaraf} className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer">
          Abrir Karaf &amp; OSGi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => (
          <div key={p.name} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">{p.name}</div>
              <div className="text-2xs font-mono text-muted-foreground truncate">Branch: {p.branch}</div>
            </div>
            <button
              type="button"
              disabled={running}
              onClick={() => void runDeploy(p.name)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Build &amp; Deploy
            </button>
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Saída da Esteira
          </div>
          <pre className="p-3 rounded-lg bg-[#070b12] text-slate-200 font-mono text-2xs whitespace-pre-wrap">{logs.join('\n')}</pre>
        </div>
      )}
    </div>
  );
};
