import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Square,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  History,
  Info,
  Trash2,
  Terminal
} from 'lucide-react';
import {
  GitProjectInfo,
  DeployProfile,
  DeployStep,
  DeployProgressEvent,
  DeployProfileHistoryEntry
} from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';
import { DeployProfileEditorModal } from '../components/DeployProfileEditorModal';
import { KarafBundleManagerModal } from '../components/KarafBundleManagerModal';
import { DeployHistoryModal } from '../components/DeployHistoryModal';
import { Routine801CatalogModal } from '../components/Routine801CatalogModal';
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
  const [stepStatuses, setStepStatuses] = useState<
    Record<string, { status: 'running' | 'completed' | 'failed' | 'skipped'; durationMs?: number; ignoredError?: boolean; error?: string }>
  >({});
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; stepId: string } | null>(null);

  const [isDiagRunning, setIsDiagRunning] = useState<string | null>(null);
  const [diagTab, setDiagTab] = useState<'quick' | 'feature' | 'bundle'>('quick');
  const [diagFeatureName, setDiagFeatureName] = useState('');
  const [diagBundleId, setDiagBundleId] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number>(-1);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const streamRemainderRef = useRef<string>('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Histórico e Gestão de Bundles OSGi
  const [isBundlesModalOpen, setIsBundlesModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isRoutine801ModalOpen, setIsRoutine801ModalOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<DeployProfileHistoryEntry[]>([]);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState<boolean>(false);

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

  // Descarrega qualquer resto de linha pendente no buffer do stream
  const flushRemainder = () => {
    if (streamRemainderRef.current) {
      const leftover = streamRemainderRef.current;
      streamRemainderRef.current = '';
      setTerminalLogs((prev) => {
        const next = [...prev, leftover];
        return next.length > 5000 ? next.slice(next.length - 5000) : next;
      });
    }
  };

  // Listeners de log e progresso em tempo real
  useEffect(() => {
    if (!window.electronAPI) return;

    const appendChunks = (chunk: string) => {
      const text = streamRemainderRef.current + chunk;
      const lines = text.split(/\r?\n/);
      streamRemainderRef.current = lines.pop() ?? '';

      if (lines.length > 0) {
        setTerminalLogs((prev) => {
          const next = [...prev, ...lines];
          return next.length > 5000 ? next.slice(next.length - 5000) : next;
        });
      }
    };

    const unsubDeploy = window.electronAPI.onDeployLogChunk(appendChunks);
    const unsubKaraf = window.electronAPI.onKarafLogChunk(appendChunks);

    const unsubProgress = window.electronAPI.onDeployStepProgress
      ? window.electronAPI.onDeployStepProgress((progress: DeployProgressEvent) => {
          setStepStatuses((prev) => ({
            ...prev,
            [progress.stepId]: {
              status: progress.status,
              durationMs: progress.durationMs,
              ignoredError: progress.ignoredError,
              error: progress.error
            }
          }));

          if (progress.status === 'running') {
            setRunningStepId(progress.stepId);
            setCurrentProgress({
              current: progress.stepIndex + 1,
              total: progress.totalSteps,
              stepId: progress.stepId
            });
          }

          if (progress.durationMs !== undefined) {
            setStepExecutionTimes((prev) => ({
              ...prev,
              [progress.stepId]: progress.durationMs!
            }));
          }
        })
      : () => {};

    return () => {
      unsubDeploy();
      unsubKaraf();
      unsubProgress();
    };
  }, []);

  // Atalho Escape para restaurar console se estiver maximizado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConsoleMaximized) {
        setIsConsoleMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleMaximized]);

  const persistProfiles = async (updated: DeployProfile[], activeId: string) => {
    setProfiles(updated);
    setActiveProfileId(activeId);
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings({ deployProfiles: updated, activeDeployProfileId: activeId });
    }
  };

  const handleSelectProfile = (id: string) => {
    persistProfiles(profiles, id);
    setStepStatuses({});
    setCurrentProgress(null);
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

  const handleExportProfile = () => {
    if (!activeProfile) return;
    const jsonStr = JSON.stringify(activeProfile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perfil-deploy-${activeProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportProfileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.name || !Array.isArray(parsed.steps)) {
        alert('Arquivo JSON inválido para Perfil de Deploy.');
        return;
      }
      const imported: DeployProfile = {
        ...parsed,
        id: `deploy-profile-${Date.now()}`,
        name: `${parsed.name} (Importado)`
      };
      await persistProfiles([...profiles, imported], imported.id);
    } catch (err: any) {
      alert(`Falha ao importar perfil: ${err?.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenHistory = async () => {
    if (window.electronAPI?.getDeployProfileHistory) {
      const history = await window.electronAPI.getDeployProfileHistory();
      setHistoryList(history || []);
    }
    setIsHistoryModalOpen(true);
  };

  const handleClearHistory = async () => {
    if (window.electronAPI?.clearDeployProfileHistory) {
      await window.electronAPI.clearDeployProfileHistory();
      setHistoryList([]);
    }
  };

  const handleAbortDeploy = async () => {
    if (!isDeploying && !runningStepId) return;
    try {
      if (window.electronAPI?.abortDeploy) {
        await window.electronAPI.abortDeploy();
        setTerminalLogs((prev) => [...prev, '\r\n[INFO] Solicitando cancelamento da execução do deploy...\r\n']);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] Falha ao abortar deploy: ${err?.message || err}\r\n`]);
    }
  };

  const handleRunActiveProfile = async () => {
    if (isDeploying || isDiagRunning || !activeProfile) return;
    setIsDeploying(true);
    setStepStatuses({});
    const enabledSteps = activeProfile.steps.filter((s) => s.enabled !== false);
    setCurrentProgress({ current: 0, total: enabledSteps.length, stepId: enabledSteps[0]?.id || '' });
    streamRemainderRef.current = '';
    setTerminalLogs([]);

    try {
      await window.electronAPI.runDeployProfile(activeProfile);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      flushRemainder();
      setIsDeploying(false);
      setCurrentProgress(null);
      setRunningStepId(null);
    }
  };

  const handleRunSingleStep = async (step: DeployStep) => {
    if (isDeploying || runningStepId || isDiagRunning || !window.electronAPI?.runDeployStep) return;
    setRunningStepId(step.id);
    setStepStatuses((prev) => ({
      ...prev,
      [step.id]: { status: 'running' }
    }));
    streamRemainderRef.current = '';
    setTerminalLogs([]);
    const startTime = Date.now();

    try {
      const res = await window.electronAPI.runDeployStep(step, activeProfile?.name);
      const dur = Date.now() - startTime;
      setStepExecutionTimes((prev) => ({ ...prev, [step.id]: dur }));
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: {
          status: res.success ? 'completed' : 'failed',
          durationMs: dur,
          error: res.error
        }
      }));
    } catch (err: any) {
      const dur = Date.now() - startTime;
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: { status: 'failed', durationMs: dur, error: err?.message || err }
      }));
    } finally {
      flushRemainder();
      setRunningStepId(null);
    }
  };

  const handleRunDiagnostic = async (cmd: string, label: string) => {
    if (isDeploying || isDiagRunning) return;
    setIsDiagRunning(label);
    streamRemainderRef.current = '';
    setTerminalLogs([`--- Executando Diagnóstico: ${cmd} ---\r\n`]);

    try {
      const res = await window.electronAPI.execKarafDiagnostic(cmd);
      if (res && res.code !== 0) {
        setTerminalLogs((prev) => [
          ...prev,
          `\r\n[ERRO] Diagnóstico finalizou com código de saída ${res.code}.${res.stderr ? `\r\n${res.stderr}` : ''}\r\n`
        ]);
      } else if (res && !res.stdout?.trim() && !res.stderr?.trim()) {
        if (cmd.includes('log:clear')) {
          setTerminalLogs((prev) => [
            ...prev,
            `[ OK ] Buffer de logs em memória do Karaf (log:clear) limpo com sucesso.\r\n`
          ]);
        } else if (cmd.includes('log:display')) {
          setTerminalLogs((prev) => [
            ...prev,
            `[INFO] O buffer de logs em memória do Karaf está vazio no momento.\r\n`
          ]);
        } else {
          setTerminalLogs((prev) => [
            ...prev,
            `[ OK ] Comando executado com sucesso (nenhuma saída retornada pelo Karaf).\r\n`
          ]);
        }
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      flushRemainder();
      setIsDiagRunning(null);
    }
  };

  const handleCustomCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = customCommand.trim();
    if (!cmd || isDeploying || isDiagRunning !== null) return;
    setCommandHistory((prev) => [...prev, cmd]);
    setCommandHistoryIndex(-1);
    setCustomCommand('');
    handleRunDiagnostic(cmd, 'custom');
  };

  const handleCustomCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = commandHistoryIndex === -1 ? commandHistory.length - 1 : Math.max(0, commandHistoryIndex - 1);
      setCommandHistoryIndex(nextIdx);
      setCustomCommand(commandHistory[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistoryIndex === -1) return;
      const nextIdx = commandHistoryIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setCommandHistoryIndex(-1);
        setCustomCommand('');
      } else {
        setCommandHistoryIndex(nextIdx);
        setCustomCommand(commandHistory[nextIdx] || '');
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden max-w-full">
      {/* Input oculto para importação de perfil JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportProfileFile}
        accept=".json"
        className="hidden"
      />

      {/* Cabeçalho de Deploy */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Perfis de Deploy
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
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
              className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              title="Editar Perfil"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <div className="relative" data-tour="profile-menu-options">
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                title="Mais opções de perfil"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setEditingProfile(null);
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" /> Novo Perfil
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleDuplicateProfile();
                        }}
                        disabled={!activeProfile}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-primary" /> Duplicar Perfil
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleExportProfile();
                        }}
                        disabled={!activeProfile}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-500" /> Exportar Perfil (.json)
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleImportProfileClick();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-500" /> Importar Perfil (.json)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground shadow-xs cursor-pointer"
              title="Ver histórico completo das últimas execuções de deploy"
            >
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Histórico</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBundlesModalOpen(true)}
              className="px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground shadow-xs cursor-pointer"
              title="Abrir gerenciador visual de bundles OSGi"
            >
              <ListTree className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Bundles OSGi</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRoutine801ModalOpen(true)}
              className="px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-primary/30 text-foreground shadow-xs cursor-pointer"
              title="Abrir catálogo oficial de serviços e rotinas (Rotina 801 - Atualização de Serviços Web)"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Catálogo 801</span>
            </button>

            {isDeploying ? (
              <button
                type="button"
                onClick={handleAbortDeploy}
                className="px-4 py-2 rounded-lg font-semibold text-xs flex items-center space-x-1.5 transition-colors bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                title="Interromper execução do perfil imediatamente"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancelar</span>
              </button>
            ) : (
              <button
                data-tour="run-active-profile"
                onClick={handleRunActiveProfile}
                disabled={isDeploying || !activeProfile || activeProfile.steps.length === 0}
                className="px-5 py-2 rounded-lg font-semibold text-xs flex items-center space-x-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-xs cursor-pointer disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar Perfil</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        {/* Coluna Esquerda: Etapas do Perfil & Diagnósticos */}
        <div className={`${isConsoleMaximized ? 'hidden' : 'lg:col-span-4 xl:col-span-4'} flex flex-col space-y-3 min-w-0 min-h-[320px] lg:min-h-0 overflow-y-auto pr-1`}>
          {karafValid === false && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-200">
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
                    className="mt-2 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-200 flex items-center gap-1 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Ajustar Diretório nas Configurações</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Etapas do Perfil Ativo */}
          <div className="cockpit-panel rounded-xl p-3.5 space-y-2.5 border border-border/80 shadow-xs" data-tour="steps-list-panel">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Etapas ({activeProfile?.steps?.length || 0})
              </span>
              <button
                onClick={() => {
                  setEditingProfile(activeProfile);
                  setIsProfileModalOpen(true);
                }}
                disabled={!activeProfile || isDeploying}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Pencil className="w-3 h-3" /> Editar Etapas
              </button>
            </div>

            {/* Barra de Progresso Durante Execução Geral */}
            {currentProgress && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-2.5 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    Etapa {currentProgress.current} de {currentProgress.total}
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {currentProgress.total > 0 ? Math.round((currentProgress.current / currentProgress.total) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${currentProgress.total > 0 ? Math.round((currentProgress.current / currentProgress.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {!activeProfile || activeProfile.steps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma etapa configurada. Clique em "Editar Etapas" para montar a sequência de deploy.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeProfile.steps.map((step, idx) => {
                  const isStepRunning = runningStepId === step.id;
                  const isBusy = isDeploying || runningStepId !== null || isDiagRunning !== null;
                  const stepStatus = stepStatuses[step.id];

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs group transition-all ${
                        step.enabled === false
                          ? 'border-border/40 bg-muted/20 opacity-50'
                          : isStepRunning
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : stepStatus?.status === 'completed'
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : stepStatus?.status === 'failed'
                          ? 'border-rose-500/40 bg-rose-500/5'
                          : 'border-border/70 bg-card hover:border-border'
                      }`}
                    >
                      {/* Ícone ou Número com Status */}
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                        {isStepRunning ? (
                          <RotateCw className="w-3 h-3 text-primary animate-spin" />
                        ) : stepStatus?.status === 'completed' ? (
                          stepStatus.ignoredError ? (
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          )
                        ) : stepStatus?.status === 'failed' ? (
                          <XCircle className="w-3 h-3 text-rose-500" />
                        ) : (
                          idx + 1
                        )}
                      </span>

                      <div className="truncate flex-1">
                        <p className="font-semibold text-foreground truncate">{step.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{step.type}</span>
                          {step.continueOnError && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-mono" title="Tolerante a falhas">
                              tolerante
                            </span>
                          )}
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
          <div className="cockpit-panel rounded-xl p-3.5 space-y-3 border border-border/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Diagnósticos Rápidos OSGi (client.bat)
              </div>
            </div>

            {/* Abas de Escopo: Rápidos | Features | Bundles */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/70 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDiagTab('quick')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  diagTab === 'quick'
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Rápidos</span>
              </button>

              <button
                type="button"
                onClick={() => setDiagTab('feature')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  diagTab === 'feature'
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListTree className="w-3.5 h-3.5 text-primary" />
                <span>Features</span>
              </button>

              <button
                type="button"
                onClick={() => setDiagTab('bundle')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  diagTab === 'bundle'
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-primary" />
                <span>Bundles</span>
              </button>
            </div>

            {/* Conteúdo da Aba 1: Comandos Rápidos */}
            {diagTab === 'quick' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('feature:list -i', 'features-i')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="feature:list -i"
                >
                  <ListTree className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Features Ativas</span>
                    <span className="text-[10px] text-muted-foreground font-mono">feature:list -i</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('bundle:list -s', 'bundles-s')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="bundle:list -s"
                >
                  <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Bundles Ativos</span>
                    <span className="text-[10px] text-muted-foreground font-mono">bundle:list -s</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('bundle:diag', 'bundles-diag')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="bundle:diag (diagnostica todos os bundles com falha de resolução)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Diag Falhas</span>
                    <span className="text-[10px] text-muted-foreground font-mono">bundle:diag</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('feature:repo-list', 'repos')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="feature:repo-list"
                >
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Repositórios</span>
                    <span className="text-[10px] text-muted-foreground font-mono">feature:repo-list</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('log:display -n 50', 'logs-50')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="log:display -n 50"
                >
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Últimos Logs</span>
                    <span className="text-[10px] text-muted-foreground font-mono">log:display -n 50</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunDiagnostic('log:clear', 'clear')}
                  disabled={isDeploying || isDiagRunning !== null}
                  className="p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  title="log:clear"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">Limpar Logs</span>
                    <span className="text-[10px] text-muted-foreground font-mono">log:clear</span>
                  </div>
                </button>
              </div>
            )}

            {/* Conteúdo da Aba 2: Features Karaf */}
            {diagTab === 'feature' && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('feature:list -i', 'features-i')}
                    disabled={isDeploying || isDiagRunning !== null}
                    className="flex-1 p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    <ListTree className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Listar Instaladas</span>
                      <span className="text-[10px] text-muted-foreground font-mono">feature:list -i</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('feature:repo-list', 'repos')}
                    disabled={isDeploying || isDiagRunning !== null}
                    className="flex-1 p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Repositórios</span>
                      <span className="text-[10px] text-muted-foreground font-mono">feature:repo-list</span>
                    </div>
                  </button>
                </div>

                {/* Ação pontual por Nome da Feature */}
                <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Feature</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">feature:cmd</span>
                  </div>
                  <input
                    type="text"
                    value={diagFeatureName}
                    onChange={(e) => setDiagFeatureName(e.target.value)}
                    placeholder="Ex: winthor-integracao-varejo"
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:border-primary transition"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`feature:info ${diagFeatureName.trim()}`, 'feat-info')}
                      disabled={!diagFeatureName.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1"
                      title="Ver detalhes, bundles e dependências da feature"
                    >
                      <Info className="w-3 h-3 text-muted-foreground" />
                      <span>Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`feature:install -r -u ${diagFeatureName.trim()}`, 'feat-install')}
                      disabled={!diagFeatureName.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1"
                      title="Instalar / atualizar feature (-r -u)"
                    >
                      <Download className="w-3 h-3 text-emerald-500" />
                      <span>Instalar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`feature:uninstall -r ${diagFeatureName.trim()}`, 'feat-uninstall')}
                      disabled={!diagFeatureName.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 disabled:opacity-40 cursor-pointer transition flex items-center gap-1 ml-auto"
                      title="Desinstalar feature com -r (definitivo)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Desinstalar (-r)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da Aba 3: Bundles OSGi */}
            {diagTab === 'bundle' && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('bundle:list -s', 'bundles-s')}
                    disabled={isDeploying || isDiagRunning !== null}
                    className="flex-1 p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Listar Bundles</span>
                      <span className="text-[10px] text-muted-foreground font-mono">bundle:list -s</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('bundle:diag', 'bundles-diag')}
                    disabled={isDeploying || isDiagRunning !== null}
                    className="flex-1 p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Diag Falhas</span>
                      <span className="text-[10px] text-muted-foreground font-mono">bundle:diag</span>
                    </div>
                  </button>
                </div>

                {/* Ação pontual por ID do Bundle */}
                <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Bundle ID</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">bundle:cmd</span>
                  </div>
                  <input
                    type="text"
                    value={diagBundleId}
                    onChange={(e) => setDiagBundleId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 185"
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:border-primary transition"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`bundle:diag ${diagBundleId.trim()}`, 'b-diag')}
                      disabled={!diagBundleId.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1"
                      title="Diagnosticar falha de resolução do bundle"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Diag</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`bundle:headers ${diagBundleId.trim()}`, 'b-headers')}
                      disabled={!diagBundleId.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1"
                      title="Ver headers e Manifest do bundle"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span>Headers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`bundle:restart ${diagBundleId.trim()}`, 'b-restart')}
                      disabled={!diagBundleId.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1"
                      title="Reiniciar bundle"
                    >
                      <RotateCw className="w-3 h-3 text-muted-foreground" />
                      <span>Restart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(`bundle:uninstall ${diagBundleId.trim()}`, 'b-uninstall')}
                      disabled={!diagBundleId.trim() || isDeploying || isDiagRunning !== null}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 disabled:opacity-40 cursor-pointer transition flex items-center gap-1 ml-auto"
                      title="Desinstalar bundle da memória"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Desinstalar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prompt de Comando Karaf (CLI Input) */}
            <div className="pt-2.5 border-t border-border/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-primary" /> Prompt Karaf
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Histórico: ↑ / ↓</span>
              </div>
              <form onSubmit={handleCustomCommandSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-[11px] font-mono text-muted-foreground/70 pointer-events-none select-none">
                    $
                  </span>
                  <input
                    type="text"
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyDown={handleCustomCommandKeyDown}
                    placeholder="feature:uninstall -r winthor-integracao-varejo/versao"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:border-primary transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customCommand.trim() || isDeploying || isDiagRunning !== null}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-md text-xs hover:bg-primary/90 disabled:opacity-40 cursor-pointer transition flex items-center gap-1.5 shrink-0"
                  title="Executar comando no shell Karaf (Enter)"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Executar</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Terminal com Streaming de Saída */}
        <div
          className={`${
            isConsoleMaximized
              ? 'col-span-12 min-h-[calc(100vh-210px)] h-full'
              : 'lg:col-span-8 xl:col-span-8 min-h-[580px] lg:min-h-full'
          } flex flex-col min-w-0 transition-all duration-200`}
          data-tour="deploy-console-output"
        >
          <TerminalViewer
            logs={terminalLogs}
            onClear={() => {
              streamRemainderRef.current = '';
              setTerminalLogs([]);
            }}
            title={isConsoleMaximized ? 'Console de Deploy (Modo Expandido)' : 'Console de Deploy'}
            isRunning={isDeploying || runningStepId !== null || isDiagRunning !== null}
            onSendCommand={(cmd) => handleRunDiagnostic(cmd, 'terminal')}
            inputPlaceholder="Digite um comando Karaf (ex: feature:uninstall -r winthor-integracao-varejo/versao, bundle:diag, la)..."
            isMaximized={isConsoleMaximized}
            onToggleMaximize={() => setIsConsoleMaximized((prev) => !prev)}
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

      {/* Modal Gerenciador de Bundles OSGi */}
      <KarafBundleManagerModal
        isOpen={isBundlesModalOpen}
        onClose={() => setIsBundlesModalOpen(false)}
        projects={projects}
      />

      {/* Modal Catálogo Oficial WinThor - Rotina 801 */}
      <Routine801CatalogModal
        isOpen={isRoutine801ModalOpen}
        onClose={() => setIsRoutine801ModalOpen(false)}
      />

      {/* Modal Histórico de Execuções de Deploy */}
      <DeployHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={historyList}
        onClear={handleClearHistory}
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
