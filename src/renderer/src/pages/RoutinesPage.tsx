import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { RoutineItem, MappedProgram } from '../../../shared/types';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { ROUTINES_TOUR_STEPS, ROUTINES_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/routinesTour';

interface RoutinesPageProps {
  onNavigateToSettings?: () => void;
}

export const RoutinesPage: React.FC<RoutinesPageProps> = ({ onNavigateToSettings }) => {
  const tour = usePageTour(ROUTINES_TOUR_STORAGE_KEY);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('TODOS');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [mappedPrograms, setMappedPrograms] = useState<MappedProgram[]>([]);
  const [runningMappedId, setRunningMappedId] = useState<string | null>(null);
  const [isAddingProgram, setIsAddingProgram] = useState(false);

  const loadRoutines = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.listRoutines();
        setRoutines(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappedPrograms = async () => {
    if (window.electronAPI) {
      const st = await window.electronAPI.getSettings();
      setMappedPrograms(st.mappedPrograms || []);
    }
  };

  useEffect(() => {
    loadRoutines();
    loadMappedPrograms();
  }, []);

  const handleToggleFavorite = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.toggleFavoriteRoutine(id);
      setRoutines((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
      );
    }
  };

  const handleLaunchRoutine = async (routine: RoutineItem) => {
    setRunningId(routine.id);
    try {
      if (window.electronAPI) {
        await window.electronAPI.launchRoutine(routine.fullPath);
      }
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
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
      {/* Programas Mapeados */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <AppWindow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Programas Mapeados</h2>
              <p className="text-[11px] text-muted-foreground">
                Atalhos pra qualquer programa que você escolher — não depende de pasta configurada.
              </p>
            </div>
          </div>
          <button
            onClick={handleAddMappedProgram}
            disabled={isAddingProgram}
            className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            title="Selecionar um executável para mapear"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Programa</span>
          </button>
        </div>

        {mappedPrograms.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum programa mapeado ainda. Clique em "Adicionar Programa" e escolha um executável.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {mappedPrograms.map((program) => (
              <div
                key={program.id}
                className="cockpit-card rounded-xl p-2.5 flex items-center gap-2 border border-border shadow-sm"
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
                  onClick={() => handleLaunchMappedProgram(program.id)}
                  disabled={runningMappedId === program.id}
                  className={`p-1.5 rounded-lg transition-all shrink-0 ${
                    runningMappedId === program.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-card hover:bg-primary text-foreground hover:text-primary-foreground border border-border'
                  }`}
                  title="Executar"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <button
                  onClick={() => handleRemoveMappedProgram(program.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topo / Filtros Cockpit */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2" data-tour="catalogo-rotinas">
                Catálogo de Rotinas
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {routines.length} {routines.length === 1 ? 'Rotina Catalogada' : 'Rotinas Catalogadas'}
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
                Escaneia a pasta configurada em busca de executáveis, com busca instantânea e favoritos.
              </p>
            </div>
          </div>

          <button
            data-tour="atualizar-catalogo"
            onClick={loadRoutines}
            disabled={isLoading}
            className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shadow-sm"
            title="Reescanear diretório de rotinas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>Atualizar Catálogo</span>
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-border/60">
          <div className="relative flex-1 min-w-[280px]" data-tour="busca-rotina">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar rotina por número ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
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
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            >
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Rolável com Cartões */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
        {/* Favoritos */}
        {favoriteRoutines.length > 0 && (
          <div className="space-y-2.5" data-tour="rotinas-favoritas">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
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

        {/* Todas as Outras */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              Todas as Rotinas ({otherRoutines.length})
            </h3>
          </div>

          {otherRoutines.length === 0 && favoriteRoutines.length === 0 ? (
            <div className="cockpit-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 border border-border">
              <FolderOpen className="w-10 h-10 text-primary/50" />
              <div>
                <h4 className="text-sm font-bold text-foreground">Nenhuma rotina encontrada</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Nenhum executável foi localizado no diretório de rotinas configurado.
                </p>
              </div>
              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar Diretório de Rotinas</span>
                </button>
              )}
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
            data-tour="favoritar-rotina"
            onClick={onToggleFavorite}
            className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
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
        data-tour="executar-rotina"
        onClick={onLaunch}
        disabled={isRunning}
        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
          isRunning
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-card hover:bg-primary text-foreground hover:text-primary-foreground border border-border hover:border-primary shadow-sm'
        }`}
        title="Executar esta rotina no Windows"
      >
        <Play className="w-3 h-3 fill-current" />
        <span>{isRunning ? 'Inicializando...' : 'Executar Rotina'}</span>
      </button>
    </div>
  );
};
