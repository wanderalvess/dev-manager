import React, { useEffect, useState } from 'react';
import { Play, Square, RefreshCw, Terminal, Network, Cpu, Settings, HelpCircle, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { PortStatus, ProcessStatus, ServiceStatus } from '../../../shared/types';
import type { SettingsTab } from '../components/settings/settingsSearchData';
import { showToast } from '../components/ToastHost';
import { useKarafConsole } from '../hooks/karafConsole/KarafConsoleContext';
import { SystemHealthDashboard } from '../components/environment/SystemHealthDashboard';

interface EnvironmentPageProps {
  services: ServiceStatus[];
  onRefreshServices: () => Promise<void>;
  onNavigateToSettings: (tab: SettingsTab) => void;
  onNavigateToHelp: (search?: string) => void;
  isActive: boolean;
  settingsVersion: number;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = ({
  services,
  onRefreshServices,
  onNavigateToSettings,
  onNavigateToHelp,
  isActive
}) => {
  const [ports, setPorts] = useState<PortStatus[]>([]);
  const [processes, setProcesses] = useState<ProcessStatus[]>([]);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const { openWithTail } = useKarafConsole();

  const loadData = async () => {
    try {
      const [p, procs] = await Promise.all([
        window.electronAPI.checkPorts(),
        window.electronAPI.getProcessesStatus()
      ]);
      if (Array.isArray(p)) setPorts(p);
      if (Array.isArray(procs)) setProcesses(procs);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleService = async (svc: ServiceStatus) => {
    const isRunning = svc.status === 'Running';
    if (isRunning) await window.electronAPI.stopService(svc.name);
    else await window.electronAPI.startService(svc.name);
    showToast(`${svc.displayName} ${isRunning ? 'parado' : 'iniciado'}.`, 'success');
    await onRefreshServices();
    await loadData();
  };

  const runDefaultPipeline = async () => {
    setRunningPipeline(true);
    setPipelineLogs(['[PIPELINE] Iniciando preparação do ambiente Dev Karaf...']);
    try {
      const res = await window.electronAPI.runProfile({
        id: 'default-dev',
        name: 'Pipeline Dev Karaf Padrão',
        steps: [
          { id: '1', name: 'Parar serviços conflitantes', type: 'stop-services', enabled: true },
          { id: '2', name: 'Encerrar processos java.exe presos', type: 'kill-processes', enabled: true },
          { id: '3', name: 'Aguardar liberação de sockets', type: 'wait', enabled: true },
          { id: '4', name: 'Iniciar Apache Karaf Debug (:5005)', type: 'start-server', enabled: true }
        ]
      });
      setPipelineLogs((res.logs || []).map((l) => `[${l.level.toUpperCase()}] ${l.message}`));
      showToast('Pipeline de ambiente concluído!', 'success');
      await onRefreshServices();
      await loadData();
    } finally {
      setRunningPipeline(false);
    }
  };

  const killProcess = async (name: string) => {
    await window.electronAPI.batchKillProcesses([name]);
    showToast(`Processo ${name} encerrado.`, 'info');
    await loadData();
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Ambiente Dev &amp; Orquestração</h1>
          <p className="text-xs text-muted-foreground">Pipeline de preparação, serviços locais, processos JVM e scanner de portas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openWithTail()}
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Terminal className="w-3.5 h-3.5 text-primary shrink-0" /> Console Karaf
          </button>
          <button
            type="button"
            onClick={() => onNavigateToSettings('karaf')}
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" /> Configurar
          </button>
          <button
            type="button"
            onClick={() => onNavigateToHelp('ambiente')}
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Ajuda
          </button>
          <button
            type="button"
            onClick={runDefaultPipeline}
            disabled={runningPipeline}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            {runningPipeline ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Play className="w-3.5 h-3.5 shrink-0" />}
            Executar Pipeline 1-Clique
          </button>
        </div>
      </div>

      {pipelineLogs.length > 0 && (
        <div className="bg-card border border-primary/40 rounded-xl p-4 space-y-2 animate-fade-in">
          <div className="text-xs font-bold text-primary flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Log da última execução do pipeline
          </div>
          <div className="font-mono text-2xs text-foreground/90 space-y-1 bg-muted/40 p-3 rounded-lg">
            {pipelineLogs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      <SystemHealthDashboard isActive={isActive} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <section className="xl:col-span-2 bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" /> Serviços Monitorados
            </h2>
            <button type="button" onClick={() => { void onRefreshServices(); void loadData(); }} className="text-2xs text-primary hover:underline cursor-pointer">
              Atualizar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {services.map((svc) => {
              const running = svc.status === 'Running';
              return (
                <div key={svc.name} className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${running ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                      <span className="text-xs font-bold text-foreground truncate">{svc.displayName}</span>
                    </div>
                    <div className="text-2xs font-mono text-muted-foreground mt-0.5 truncate">
                      {svc.name} {svc.pid ? `• PID ${svc.pid}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleService(svc)}
                    className={`px-2.5 py-1.5 rounded-lg text-2xs font-bold flex items-center gap-1 cursor-pointer ${
                      running ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-success/10 text-success hover:bg-success/20'
                    }`}
                  >
                    {running ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {running ? 'Parar' : 'Iniciar'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" /> Scanner de Portas
          </h2>
          <div className="space-y-2">
            {ports.map((p) => (
              <div key={p.port} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/70 bg-muted/20 text-xs">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="font-mono font-bold text-primary shrink-0">:{p.port}</span>
                  <span className="text-foreground truncate">{p.label}</span>
                </div>
                <span className={`shrink-0 text-2xs font-mono px-2 py-0.5 rounded-full ${p.inUse ? 'bg-success/15 text-success font-bold' : 'bg-muted text-muted-foreground'}`}>
                  {p.inUse ? 'ATIVA' : 'LIVRE'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Processos Críticos
          </h2>
          <div className="space-y-2">
            {processes.map((proc) => (
              <div key={proc.name} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                <div>
                  <span className="font-bold text-foreground">{proc.displayName || proc.name}</span>
                  <span className="ml-2 font-mono text-2xs text-muted-foreground">{proc.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xs font-mono ${proc.running ? 'text-success' : 'text-muted-foreground'}`}>
                    {proc.running ? `PID ${proc.pid} (${proc.memoryMb} MB)` : 'Inativo'}
                  </span>
                  {proc.running && (
                    <button
                      type="button"
                      onClick={() => void killProcess(proc.name)}
                      className="px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 text-2xs font-bold cursor-pointer"
                    >
                      Encerrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" /> Acessos Rápidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'Portal WTA', url: 'http://localhost:8889' },
              { label: 'Felix Console', url: 'http://localhost:8889/system/console' },
              { label: 'Swagger CXF', url: 'http://localhost:8889/cxf/api-docs' }
            ].map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(link.url).catch(() => {});
                  showToast(`URL copiada: ${link.url}`, 'info');
                }}
                className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/60 hover:border-primary/40 text-left transition cursor-pointer"
                title={`Copiar URL ${link.url}`}
              >
                <div className="text-xs font-bold text-foreground flex items-center justify-between gap-1">
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </div>
                <div className="text-2xs font-mono text-muted-foreground truncate mt-0.5">{link.url}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
