import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Search,
  Star,
  Play,
  RefreshCw,
  Layers,
  X,
  Settings,
  FolderOpen,
  Plus,
  Trash2,
  AppWindow,
  Sparkles,
  AlertTriangle,
  Activity,
  Server,
  Terminal
} from 'lucide-react';
import { RoutineItem, MappedProgram, AppSettings, KarafWtaStatusResult } from '../../../shared/types';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { ROUTINES_TOUR_STEPS, ROUTINES_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/routinesTour';
import { getKarafWtaBadgeInfo, shouldShowKarafWarningBanner } from '../utils/routineLaunchUiUtils';

interface RoutinesPageProps {
  onNavigateToSettings?: () => void;
  onNavigateToEnv?: () => void;
  settingsVersion?: number;
}

export const RoutinesPage: React.FC<RoutinesPageProps> = ({
  onNavigateToSettings,
  onNavigateToEnv,
  settingsVersion
}) => {
  const tour = usePageTour(ROUTINES_TOUR_STORAGE_KEY);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('TODOS');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [mappedPrograms, setMappedPrograms] = useState<MappedProgram[]>([]);
  const [runningMappedId, setRunningMappedId] = useState<string | null>(null);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [appPath, setAppPath] = useState<string>('');
  const [winthorStartActive, setWinthorStartActive] = useState<boolean>(true);

  // Status e controle do servidor Apache Karaf / WTA
  const [karafStatus, setKarafStatus] = useState<KarafWtaStatusResult | null>(null);
  const [isCheckingKaraf, setIsCheckingKaraf] = useState<boolean>(false);
  const [isStartingKaraf, setIsStartingKaraf] = useState<boolean>(false);

  const checkKaraf = useCallback(async () => {
    if (!window.electronAPI?.checkRoutineKarafStatus) return;
    setIsCheckingKaraf(true);
    try {
      const status = await window.electronAPI.checkRoutineKarafStatus();
      setKarafStatus(status);
    } catch {
      setKarafStatus({
        online: false,
        wtaUrl: 'http://localhost:8889',
        message: 'Apache Karaf / WTA não está respondendo.'
      });
    } finally {
      setIsCheckingKaraf(false);
    }
  }, []);

  const handleStartEmbeddedKaraf = async () => {
    if (!window.electronAPI?.startEmbeddedKaraf) return;
    setIsStartingKaraf(true);
    try {
      await window.electronAPI.startEmbeddedKaraf();
      setTimeout(async () => {
        await checkKaraf();
        setIsStartingKaraf(false);
      }, 3500);
    } catch {
      setIsStartingKaraf(false);
    }
  };

  const loadRoutines = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const [data] = await Promise.all([
          window.electronAPI.listRoutines(),
          checkKaraf()
        ]);
        setRoutines(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkKaraf]);

  const loadSettingsAndPrograms = useCallback(async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const st: AppSettings = await window.electronAPI.getSettings();
        setMappedPrograms(st.mappedPrograms || []);
        setAppPath(st.appPath || '');
        setWinthorStartActive(st.winthorStartEnabled ?? true);
      } catch (err) {
        console.warn('Erro ao carregar configurações de rotinas:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadRoutines();
    loadSettingsAndPrograms();
  }, [loadRoutines, loadSettingsAndPrograms, settingsVersion]);

  // Polling periódico suave para verificar status do Karaf/WTA
  useEffect(() => {
    const interval = setInterval(() => {
      checkKaraf();
    }, 12000);
    return () => clearInterval(interval);
  }, [checkKaraf]);

  const handleToggleFavorite = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.toggleFavoriteRoutine(id);
      setRoutines((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
      );
    }
  };

  const [launchFeedback, setLaunchFeedback] = useState<{
    id: string;
    routine: RoutineItem;
    success: boolean;
    message: string;
    karafOffline?: boolean;
    authFailed?: boolean;
    winthorStartOffline?: boolean;
  } | null>(null);

  const handleLaunchRoutine = async (routine: RoutineItem, forceDirect = false) => {
    setRunningId(routine.id);
    setLaunchFeedback(null);
    try {
      if (window.electronAPI) {
        console.log(`[RoutinesPage] Chamando launchRoutine para: ${routine.fullPath} (forceDirect: ${forceDirect})`);
        const result = await window.electronAPI.launchRoutine(routine.fullPath, forceDirect);
        console.log(`[RoutinesPage] Resultado da abertura:`, result);
        if (!result.success) {
          setLaunchFeedback({
            id: routine.id,
            routine,
            success: false,
            message: result.message || 'Não foi possível iniciar a rotina.',
            karafOffline: result.karafOffline,
            authFailed: result.authFailed,
            winthorStartOffline: result.winthorStartOffline
          });
          if (result.karafOffline) {
            setKarafStatus((prev) => ({
              online: false,
              wtaUrl: prev?.wtaUrl || 'http://localhost:8889',
              message: result.message || 'Apache Karaf / WTA não está em execução.'
            }));
          }
        } else {
          // Em caso de sucesso pelo WinThor Start, sabemos que o Karaf está online
          if (!result.fallbackDirect) {
            setKarafStatus((prev) => (prev ? { ...prev, online: true } : null));
          }
        }
      }
    } catch (err: any) {
      console.error(`[RoutinesPage] Erro ao disparar rotina:`, err);
      setLaunchFeedback({
        id: routine.id,
        routine,
        success: false,
        message: err?.message || 'Erro inesperado ao iniciar a rotina.'
      });
    } finally {
      setTimeout(() => setRunningId(null), 1500);
    }
  };

  const persistMappedPrograms = async (updated: MappedProgram[]) => {
    setMappedPrograms(updated);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ mappedPrograms: updated });
    }
  };

  const handleAddMappedProgram = async () => {
    if (!window.electronAPI) return;
    setIsAddingProgram(true);
    try {
      const picked = await window.electronAPI.selectFile({
        filters: [{ name: 'Executáveis', extensions: ['exe', 'bat', 'cmd'] }]
      });
      if (!picked) return;
      const baseName = picked.split(/[\\/]/).pop() || picked;
      const name = baseName.replace(/\.[^.]+$/, '');
      const entry: MappedProgram = { id: `mp-${Date.now()}`, name, fullPath: picked };
      await persistMappedPrograms([...mappedPrograms, entry]);
    } finally {
      setIsAddingProgram(false);
    }
  };

  const handleRenameMappedProgram = (id: string, name: string) => {
    setMappedPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleRenameMappedProgramBlur = () => {
    persistMappedPrograms(mappedPrograms);
  };

  const handleRemoveMappedProgram = (id: string) => {
    persistMappedPrograms(mappedPrograms.filter((p) => p.id !== id));
  };

  const handleLaunchMappedProgram = async (id: string) => {
    setRunningMappedId(id);
    try {
      if (window.electronAPI) {
        await window.electronAPI.launchMappedProgram(id);
      }
    } finally {
      setTimeout(() => setRunningMappedId(null), 1500);
    }
  };

  const modules = ['TODOS', ...Array.from(new Set(routines.map((r) => r.module)))];

  const filteredRoutines = routines.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.module.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = selectedModule === 'TODOS' || r.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  const favoriteRoutines = filteredRoutines.filter((r) => r.isFavorite);
  const otherRoutines = filteredRoutines.filter((r) => !r.isFavorite);

  return (
    <div className="h-full flex flex-col p-4 md:p-5 space-y-3.5 overflow-hidden max-w-full select-none">
      {/* 1. Topo / Cockpit Header Unificado */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-col space-y-3.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2" data-tour="catalogo-rotinas">
                  Catálogo de Rotinas &amp; Atalhos
                </h2>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {routines.length} {routines.length === 1 ? 'Rotina' : 'Rotinas'}
                </span>
                {mappedPrograms.length > 0 && (
                  <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-mono font-bold">
                    {mappedPrograms.length} {mappedPrograms.length === 1 ? 'Atalho' : 'Atalhos'}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border ${
                    winthorStartActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                  title={
                    winthorStartActive
                      ? 'WinThor Start ativado: Rotinas serão iniciadas via serviço local autenticado (DataSnap)'
                      : 'WinThor Start desativado: Rotinas serão disparadas via executável direto'
                  }
                >
                  <Activity className="w-2.5 h-2.5" />
                  <span>WinThor Start: {winthorStartActive ? 'Ativo' : 'Desativado'}</span>
                </span>
                {(() => {
                  const badgeInfo = getKarafWtaBadgeInfo(karafStatus, isCheckingKaraf, winthorStartActive);
                  return (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border ${badgeInfo.colorClass}`}
                      title={badgeInfo.tooltip}
                    >
                      <Server className="w-2.5 h-2.5" />
                      <span>{badgeInfo.label}</span>
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Escaneia a pasta configurada em busca de executáveis WinThor, com busca instantânea, favoritos e programas mapeados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-tour="atualizar-catalogo"
              type="button"
              onClick={loadRoutines}
              disabled={isLoading}
              className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/40 rounded-xl text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Reescanear diretório de rotinas e revalidar status dos serviços"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              <span>Atualizar Catálogo</span>
            </button>

            <button
              type="button"
              onClick={tour.open}
              className="h-9 w-9 rounded-xl border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-primary transition flex items-center justify-center shrink-0 cursor-pointer"
              title="Rever o tour guiado desta página"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60">
          <div className="relative flex-1 min-w-[280px]" data-tour="busca-rotina">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar rotina por número ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border/80 rounded-xl pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2" data-tour="filtro-modulo">
            <span className="text-xs text-muted-foreground font-medium">Filtrar por Módulo:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-card border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono cursor-pointer shadow-2xs"
            >
              {modules.map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerta Preventivo: Apache Karaf não está em execução */}
      {shouldShowKarafWarningBanner(karafStatus, winthorStartActive) && (
        <div className="shrink-0 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start justify-between space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
          <div className="flex items-start space-x-2.5 flex-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Apache Karaf não está em execução (WTA offline)</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5 leading-relaxed">
                O WinThor Start está ativado e depende do servidor Apache Karaf / WTA ({karafStatus?.wtaUrl || 'http://localhost:8889'}) em execução para autenticar a sessão do usuário. Se você iniciar uma rotina agora, ela apresentará erro por falta de autenticação.
              </span>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {onNavigateToEnv && (
                  <button
                    type="button"
                    onClick={onNavigateToEnv}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Abrir o Gestor de Ambiente para iniciar o Karaf e ver logs"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Ir para Ambiente Dev (Alt+1)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStartEmbeddedKaraf}
                  disabled={isStartingKaraf}
                  className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Disparar inicialização do Apache Karaf embedded em segundo plano"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isStartingKaraf ? 'Iniciando Karaf...' : 'Iniciar Karaf'}</span>
                </button>
                <button
                  type="button"
                  onClick={checkKaraf}
                  disabled={isCheckingKaraf}
                  className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-[11px] font-semibold text-foreground flex items-center gap-1 transition-all cursor-pointer"
                  title="Verificar novamente se a porta 8889 do Karaf já está respondendo"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingKaraf ? 'animate-spin' : ''}`} />
                  <span>Verificar Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Feedback de Execução de Rotina */}
      {launchFeedback && (
        <div className={`shrink-0 rounded-xl p-3 flex items-start justify-between space-x-2.5 text-xs border ${
          launchFeedback.karafOffline
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-200'
            : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-200'
        }`}>
          <div className="flex items-start space-x-2.5 flex-1">
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${launchFeedback.karafOffline ? 'text-amber-500' : 'text-rose-500'}`} />
            <div className="flex-1">
              <span className="font-bold block">
                {launchFeedback.karafOffline
                  ? `Erro de Autenticação: Apache Karaf não está em execução (${launchFeedback.id})`
                  : launchFeedback.authFailed
                  ? `Falha de Autenticação no WTA (${launchFeedback.id})`
                  : `Falha ao abrir rotina (${launchFeedback.id})`}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5 leading-relaxed">
                {launchFeedback.message}
              </span>

              {/* Ações contextuais de ajuda */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {launchFeedback.karafOffline && (
                  <>
                    {onNavigateToEnv && (
                      <button
                        type="button"
                        onClick={onNavigateToEnv}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>Ir para Ambiente Dev &amp; Iniciar Karaf (Alt+1)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartEmbeddedKaraf}
                      disabled={isStartingKaraf}
                      className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isStartingKaraf ? 'Iniciando Karaf...' : 'Iniciar Karaf Agora'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchRoutine(launchFeedback.routine, true)}
                      className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-[11px] font-semibold text-foreground flex items-center gap-1 transition-all cursor-pointer"
                      title="Abre o executável diretamente pelo Windows sem passar pelos parâmetros autenticados do WinThor Start"
                    >
                      <span>Tentar abrir direto (sem autenticação)</span>
                    </button>
                  </>
                )}
                {launchFeedback.authFailed && onNavigateToSettings && (
                  <button
                    type="button"
                    onClick={onNavigateToSettings}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Configurar Credenciais do WTA</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLaunchFeedback(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Alerta de diretório não configurado */}
      {!appPath && (
        <div className="shrink-0 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Diretório de Rotinas WinThor não configurado</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Defina a pasta onde os executáveis das rotinas estão localizados (ex: P:\ ou C:\Totvs\Winthor\Rotinas) para catalogá-los automaticamente.
            </span>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="mt-2 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Configurar Diretório</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Programas Mapeados */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <AppWindow className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Programas Mapeados &amp; Atalhos Rápidos ({mappedPrograms.length})
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Atalhos diretos para executáveis (.exe, .bat, .cmd) independente da pasta padrão.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddMappedProgram}
            disabled={isAddingProgram}
            className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer shadow-primary/20"
            title="Selecionar um executável para mapear"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Atalho</span>
          </button>
        </div>

        {mappedPrograms.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center bg-card/40 rounded-xl border border-dashed border-border/70">
            Nenhum programa mapeado ainda. Clique em "Adicionar Atalho" e escolha um executável do seu computador.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {mappedPrograms.map((program) => (
              <div
                key={program.id}
                className="cockpit-card rounded-xl p-2.5 flex items-center gap-2 border border-border shadow-xs hover:border-primary/40 transition-colors"
              >
                <input
                  type="text"
                  value={program.name}
                  onChange={(e) => handleRenameMappedProgram(program.id, e.target.value)}
                  onBlur={handleRenameMappedProgramBlur}
                  title={program.fullPath}
                  className="flex-1 min-w-0 bg-transparent text-xs font-bold text-foreground focus:outline-none focus:underline"
                />
                <button
                  type="button"
                  onClick={() => handleLaunchMappedProgram(program.id)}
                  disabled={runningMappedId === program.id}
                  className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                    runningMappedId === program.id
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-card hover:bg-primary text-foreground hover:text-primary-foreground border border-border'
                  }`}
                  title="Executar este programa"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMappedProgram(program.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
                  title="Remover atalho"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Área rolável: catálogo de rotinas (favoritas + todas) rola independente do cabeçalho */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-3.5">
      {/* 3. Rotinas Favoritas */}
      {favoriteRoutines.length > 0 && (
        <div className="space-y-2.5 shrink-0" data-tour="rotinas-favoritas">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Rotinas Favoritas ({favoriteRoutines.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {favoriteRoutines.map((routine) => (
              <RoutineCard
                key={routine.fullPath}
                routine={routine}
                onToggleFavorite={() => handleToggleFavorite(routine.id)}
                onLaunch={() => handleLaunchRoutine(routine)}
                isRunning={runningId === routine.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Todas as Rotinas */}
      <div className="space-y-2.5">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Todas as Rotinas ({otherRoutines.length})
          </h3>
        </div>

        {routines.length === 0 ? (
          <div className="cockpit-panel rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 border border-dashed border-border/80">
            <FolderOpen className="w-10 h-10 text-muted-foreground/60 mb-1" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Nenhuma rotina encontrada</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Verifique se o diretório de rotinas está configurado corretamente nas Configurações ou clique em "Atualizar Catálogo".
              </p>
            </div>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="mt-2 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer shadow-primary/25"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Diretório de Rotinas</span>
              </button>
            )}
          </div>
        ) : otherRoutines.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground bg-card/30 rounded-xl border border-border">
            Nenhuma rotina encontrada para os filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {otherRoutines.map((routine) => (
              <RoutineCard
                key={routine.fullPath}
                routine={routine}
                onToggleFavorite={() => handleToggleFavorite(routine.id)}
                onLaunch={() => handleLaunchRoutine(routine)}
                isRunning={runningId === routine.id}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      <OnboardingTour
        steps={ROUTINES_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={ROUTINES_TOUR_STORAGE_KEY}
      />
    </div>
  );
};

interface RoutineCardProps {
  routine: RoutineItem;
  onToggleFavorite: () => void;
  onLaunch: () => void;
  isRunning: boolean;
}

const RoutineCard: React.FC<RoutineCardProps> = ({
  routine,
  onToggleFavorite,
  onLaunch,
  isRunning
}) => {
  const extension = routine.name.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="cockpit-card rounded-2xl p-3.5 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md border border-border">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80">
              {routine.module}
            </span>
            {extension && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {extension}
              </span>
            )}
          </div>

          <button
            type="button"
            data-tour="favoritar-rotina"
            onClick={onToggleFavorite}
            className="p-1 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
            title={routine.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star
              className={`w-4 h-4 ${
                routine.isFavorite ? 'text-amber-500 fill-amber-500' : ''
              }`}
            />
          </button>
        </div>

        <h4 className="text-xs font-bold font-mono text-foreground mt-2.5 truncate group-hover:text-primary transition-colors">
          {routine.name}
        </h4>
        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{routine.sizeMb}</span>
      </div>

      <button
        type="button"
        data-tour="executar-rotina"
        onClick={onLaunch}
        disabled={isRunning}
        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
          isRunning
            ? 'bg-primary/20 text-primary border border-primary/40 animate-pulse'
            : 'bg-card hover:bg-primary text-foreground hover:text-primary-foreground border border-border hover:border-primary shadow-xs'
        }`}
        title="Executar esta rotina no Windows"
      >
        <Play className="w-3 h-3 fill-current" />
        <span>{isRunning ? 'Inicializando...' : 'Executar Rotina'}</span>
      </button>
    </div>
  );
};
