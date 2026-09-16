import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Play,
  AlertTriangle,
  Plus,
  Pencil,
  Copy,
  ListTree,
  Package,
  FileText,
  RotateCcw,
  RotateCw,
  Zap,
  Settings,
  ChevronDown,
  Search,
  Square,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { GitProjectInfo, DeployProfile, DeployStep } from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';
import { DeployProfileEditorModal } from '../components/DeployProfileEditorModal';
import { KarafBundleManagerModal } from '../components/KarafBundleManagerModal';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DEPLOY_TOUR_STEPS, DEPLOY_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/deployTour';

interface DeployPageProps {
  projects: GitProjectInfo[];
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

export const DeployPage: React.FC<DeployPageProps> = ({ projects, onNavigateToSettings, settingsVersion }) => {
  const tour = usePageTour(DEPLOY_TOUR_STORAGE_KEY);
  const [profiles, setProfiles] = useState<DeployProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DeployProfile | null>(null);

  const [karafPath, setKarafPath] = useState<string>('');
  const [karafValid, setKarafValid] = useState<boolean | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [stepExecutionTimes, setStepExecutionTimes] = useState<Record<string, number>>({});
  const [isDiagRunning, setIsDiagRunning] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Modal e Gestão de Bundles OSGi
  const [isBundlesModalOpen, setIsBundlesModalOpen] = useState<boolean>(false);

  const activeProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  // Carregar e sincronizar configurações do Karaf e perfis de deploy
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(async (st) => {
        setKarafPath(st.karafPath || '');
        if (st.karafPath) {
          const candidates = [
            `${st.karafPath}/bin/client.bat`,
            `${st.karafPath}/bin/client`,
            `${st.karafPath}/bin/client.sh`
          ];
          let found = false;
          for (const cand of candidates) {
            const check = await window.electronAPI.checkPath(cand);
            if (check && check.exists) {
              found = true;
              break;
            }
          }
          setKarafValid(found);
        }
        if (st.deployProfiles && st.deployProfiles.length > 0) {
          setProfiles(st.deployProfiles);
          setActiveProfileId((curr) => curr || st.activeDeployProfileId || st.deployProfiles?.[0]?.id || '');
        }
      });
    }
  }, [settingsVersion]);

  // Listeners de log em tempo real (registrados uma vez na montagem)
  useEffect(() => {
    if (!window.electronAPI) return;

    const appendChunks = (chunk: string) => {
      const rawLines = chunk.split(/\r?\n/);
      const linesToAdd = rawLines.length === 1 ? [rawLines[0]] : rawLines.filter((l, i) => i < rawLines.length - 1 || l.length > 0);
      setTerminalLogs((prev) => {
        const next = [...prev, ...linesToAdd];
        return next.length > 2000 ? next.slice(next.length - 2000) : next;
      });
    };

    const unsubDeploy = window.electronAPI.onDeployLogChunk(appendChunks);
    const unsubKaraf = window.electronAPI.onKarafLogChunk(appendChunks);
    return () => {
      unsubDeploy();
      unsubKaraf();
    };
  }, []);

  const persistProfiles = async (updated: DeployProfile[], activeId: string) => {
    setProfiles(updated);
    setActiveProfileId(activeId);
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings({ deployProfiles: updated, activeDeployProfileId: activeId });
    }
  };

  const handleSelectProfile = (id: string) => {
    persistProfiles(profiles, id);
  };

  const handleSaveProfile = async (saved: DeployProfile) => {
    const exists = profiles.some((p) => p.id === saved.id);
    const updated = exists ? profiles.map((p) => (p.id === saved.id ? saved : p)) : [...profiles, saved];
    await persistProfiles(updated, saved.id);
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      alert('Mantenha ao menos um perfil de deploy.');
      return;
    }
    const remaining = profiles.filter((p) => p.id !== id);
    await persistProfiles(remaining, remaining[0]?.id || '');
  };

  const handleDuplicateProfile = async () => {
    if (!activeProfile) return;
    const duplicated: DeployProfile = {
      ...activeProfile,
      id: `deploy-profile-${Date.now()}`,
      name: `${activeProfile.name} (Cópia)`,
      steps: activeProfile.steps.map((s) => ({ ...s, id: `deploy-step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }))
    };
    await persistProfiles([...profiles, duplicated], duplicated.id);
  };

  const handleRunActiveProfile = async () => {
    if (isDeploying || isDiagRunning || !activeProfile) return;
    setIsDeploying(true);
    setTerminalLogs([]);

    try {
      await window.electronAPI.runDeployProfile(activeProfile);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRunSingleStep = async (step: DeployStep) => {
    if (isDeploying || runningStepId || isDiagRunning || !window.electronAPI?.runDeployStep) return;
    setRunningStepId(step.id);
    setTerminalLogs([]);
    const startTime = Date.now();

    try {
      await window.electronAPI.runDeployStep(step, activeProfile?.name);
      setStepExecutionTimes((prev) => ({ ...prev, [step.id]: Date.now() - startTime }));
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunDiagnostic = async (cmd: string, label: string) => {
    if (isDeploying || isDiagRunning) return;
    setIsDiagRunning(label);
    setTerminalLogs((prev) => [...prev, `\r\n--- Executando Diagnóstico: ${cmd} ---\r\n`]);

    try {
      await window.electronAPI.execKarafDiagnostic(cmd);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      setIsDiagRunning(null);
    }
  };



  return (
    <div className="h-full flex flex-col p-5 pb-8 space-y-4 overflow-y-auto">
      {/* Cabeçalho de Deploy */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Perfis de Deploy
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Karaf · Docker · Genérico
                </span>
                <button
                  type="button"
                  onClick={tour.open}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                  title="Rever o tour guiado desta página"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {activeProfile?.description || 'Monte etapas sequenciais de build e publicação para qualquer alvo.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" data-tour="select-deploy-profile">
            <select
              value={activeProfileId}
              onChange={(e) => handleSelectProfile(e.target.value)}
              disabled={isDeploying}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono max-w-[220px]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              data-tour="edit-deploy-profile"
              onClick={() => {
                setEditingProfile(activeProfile);
                setIsProfileModalOpen(true);
              }}
              disabled={!activeProfile}
              className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors disabled:opacity-40"
              title="Editar Perfil"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <div className="relative" data-tour="profile-menu-options">
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors flex items-center gap-1"
                title="Mais opções"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setEditingProfile(null);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Perfil
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleDuplicateProfile();
                      }}
                      disabled={!activeProfile}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicar Perfil
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsBundlesModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground shadow-xs"
              title="Abrir gerenciador visual de bundles OSGi"
            >
              <ListTree className="w-3.5 h-3.5 text-primary" />
              <span>Bundles OSGi</span>
            </button>

            <button
              data-tour="run-active-profile"
              onClick={handleRunActiveProfile}
              disabled={isDeploying || !activeProfile || activeProfile.steps.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                isDeploying
                  ? 'bg-primary/40 text-muted-foreground cursor-not-allowed border border-primary/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.02] border border-primary/40'
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${isDeploying ? 'animate-pulse' : ''}`} />
              <span>{isDeploying ? 'Executando Perfil...' : 'Executar Perfil'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[480px]">
        {/* Coluna Esquerda: Etapas do Perfil & Diagnósticos */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {karafValid === false && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Executável client.bat não localizado</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Não foi possível encontrar <code className="font-mono text-foreground">{karafPath}\bin\client.bat</code>. Isso só afeta etapas do tipo Karaf.
                </span>
                {onNavigateToSettings && (
                  <button
                    type="button"
                    onClick={onNavigateToSettings}
                    className="mt-2 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Ajustar Diretório nas Configurações</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Etapas do Perfil Ativo */}
          <div className="cockpit-panel rounded-2xl p-4 space-y-2.5 border border-border" data-tour="steps-list-panel">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                Etapas ({activeProfile?.steps?.length || 0})
              </span>
              <button
                onClick={() => {
                  setEditingProfile(activeProfile);
                  setIsProfileModalOpen(true);
                }}
                disabled={!activeProfile}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                <Pencil className="w-3 h-3" /> Editar Etapas
              </button>
            </div>

            {!activeProfile || activeProfile.steps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma etapa configurada. Clique em "Editar Etapas" para montar a sequência de deploy.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeProfile.steps.map((step, idx) => {
                  const isStepRunning = runningStepId === step.id;
                  const isBusy = isDeploying || runningStepId !== null || isDiagRunning !== null;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs group transition-colors ${
                        step.enabled === false
                          ? 'border-border/40 bg-muted/20 opacity-50'
                          : isStepRunning
                          ? 'border-primary bg-primary/10'
                          : 'border-border/70 bg-card hover:border-border'
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate flex-1">
                        <p className="font-semibold text-foreground truncate">{step.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{step.type}</span>
                          {stepExecutionTimes[step.id] !== undefined && (
                            <span className="text-[9px] font-mono font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {(stepExecutionTimes[step.id] / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        data-tour="run-single-step"
                        onClick={() => handleRunSingleStep(step)}
                        disabled={isBusy}
                        className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isStepRunning
                            ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                            : 'bg-card hover:bg-primary/15 text-primary border-border hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                        title={isStepRunning ? 'Executando esta etapa...' : `Executar somente esta etapa (${step.name})`}
                      >
                        {isStepRunning ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span className="text-[10px] font-semibold hidden group-hover:inline sm:inline">
                          {isStepRunning ? 'Rodando...' : 'Executar'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ferramentas de Diagnóstico Rápido do Karaf */}
          <div className="cockpit-panel rounded-2xl p-4 space-y-2.5 shadow-xl border border-border">
            <div className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Diagnósticos Rápidos Karaf OSGi (client.bat)
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRunDiagnostic('feature:list -i', 'features')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <ListTree className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Features Instaladas</span>
                  <span className="text-[10px] text-muted-foreground font-mono">feature:list -i</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('bundle:list -s', 'bundles')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <Package className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Bundles Ativos</span>
                  <span className="text-[10px] text-muted-foreground font-mono">bundle:list -s</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('log:display -n 50', 'logs')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Logs Recentes</span>
                  <span className="text-[10px] text-muted-foreground font-mono">log:display -n 50</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('log:clear', 'clear')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Limpar Logs</span>
                  <span className="text-[10px] text-muted-foreground font-mono">log:clear</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Terminal com Streaming de Saída */}
        <div className="lg:col-span-7 min-h-[450px] lg:min-h-full flex flex-col" data-tour="deploy-console-output">
          <TerminalViewer
            logs={terminalLogs}
            onClear={() => setTerminalLogs([])}
            title="Console de Deploy"
            isRunning={isDeploying || runningStepId !== null || isDiagRunning !== null}
          />
        </div>
      </div>

      <DeployProfileEditorModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setEditingProfile(null);
        }}
        profile={editingProfile}
        projects={projects}
        onSave={handleSaveProfile}
        onDelete={handleDeleteProfile}
      />

      {/* Modal Gerenciador de Bundles OSGi com Verificação de Dependências e Confirmação */}
      <KarafBundleManagerModal
        isOpen={isBundlesModalOpen}
        onClose={() => setIsBundlesModalOpen(false)}
        projects={projects}
      />

      <OnboardingTour
        steps={DEPLOY_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={DEPLOY_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
