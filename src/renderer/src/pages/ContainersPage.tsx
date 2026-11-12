import React, { useEffect, useState } from 'react';
import { Box, Play, Square, RotateCw, RefreshCw } from 'lucide-react';
import type { DockerContainerInfo, DockerContainerStats } from '../../../shared/types';
import { showToast } from '../components/ToastHost';

export const ContainersPage: React.FC<{ isActive: boolean; settingsVersion: number }> = () => {
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [stats, setStats] = useState<Record<string, DockerContainerStats>>({});

  const load = async () => {
    const [list, st] = await Promise.all([
      window.electronAPI.listDockerContainers(),
      window.electronAPI.getDockerContainerStats()
    ]);
    if (Array.isArray(list)) setContainers(list);
    if (Array.isArray(st)) {
      const map: Record<string, DockerContainerStats> = {};
      st.forEach((item) => { map[item.id] = item; });
      setStats(map);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (id: string, action: 'start' | 'stop' | 'restart') => {
    if (action === 'start') await window.electronAPI.startDockerContainer(id);
    if (action === 'stop') await window.electronAPI.stopDockerContainer(id);
    if (action === 'restart') await window.electronAPI.restartDockerContainer(id);
    showToast(`Container atualizado (${action}).`, 'info');
    await load();
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" /> Containers Docker &amp; Podman
          </h1>
          <p className="text-xs text-muted-foreground">Ciclo de vida, portas expostas e telemetria de CPU/RAM.</p>
        </div>
        <button type="button" onClick={() => void load()} className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {containers.map((c) => {
          const st = stats[c.id];
          const running = c.state === 'running';
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                    <span className="text-sm font-bold text-foreground truncate">{c.name}</span>
                  </div>
                  <div className="text-2xs font-mono text-muted-foreground truncate mt-0.5">{c.image}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${running ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {c.state}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {c.ports.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-muted text-2xs font-mono text-foreground">{p}</span>
                ))}
              </div>

              {st && running && (
                <div className="grid grid-cols-2 gap-2 text-2xs bg-muted/30 p-2.5 rounded-lg border border-border/50 font-mono">
                  <div>CPU: <strong className="text-primary">{st.cpuPercent}%</strong></div>
                  <div>RAM: <strong className="text-foreground">{st.memUsageMb} MB ({st.memPercent}%)</strong></div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-2xs text-muted-foreground">{c.status}</span>
                <div className="flex items-center gap-1.5">
                  {!running ? (
                    <button type="button" onClick={() => void act(c.id, 'start')} className="px-2.5 py-1 rounded-lg bg-success/15 text-success text-2xs font-bold flex items-center gap-1 cursor-pointer">
                      <Play className="w-3 h-3" /> Iniciar
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => void act(c.id, 'restart')} className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-2xs font-bold flex items-center gap-1 cursor-pointer">
                        <RotateCw className="w-3 h-3" /> Reiniciar
                      </button>
                      <button type="button" onClick={() => void act(c.id, 'stop')} className="px-2.5 py-1 rounded-lg bg-danger/15 text-danger text-2xs font-bold flex items-center gap-1 cursor-pointer">
                        <Square className="w-3 h-3" /> Parar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
