import React from 'react';
import { Star, Layers, FolderOpen, Settings } from 'lucide-react';
import { RoutineItem } from '../../../../shared/types';
import { CcwInitialTab } from '../../utils/routinesPageUtils';
import { RoutineCard } from './RoutineCard';

interface RoutinesCatalogListProps {
  routinesCount: number;
  favoriteRoutines: RoutineItem[];
  otherRoutines: RoutineItem[];
  runningId: string | null;
  onNavigateToSettings?: () => void;
  onToggleFavorite: (id: string) => void;
  onLaunch: (routine: RoutineItem) => void;
  onOpenCcwModal: (routineName?: string, tab?: CcwInitialTab) => void;
}

const GRID_CLASS = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3';

export const RoutinesCatalogList: React.FC<RoutinesCatalogListProps> = ({
  routinesCount,
  favoriteRoutines,
  otherRoutines,
  runningId,
  onNavigateToSettings,
  onToggleFavorite,
  onLaunch,
  onOpenCcwModal
}) => {
  const renderCard = (routine: RoutineItem) => (
    <RoutineCard
      key={routine.fullPath}
      routine={routine}
      onToggleFavorite={() => onToggleFavorite(routine.id)}
      onLaunch={() => onLaunch(routine)}
      onUpdateCcw={() => onOpenCcwModal(routine.name, 'download')}
      onRollback={() => onOpenCcwModal(routine.name, 'rollback')}
      isRunning={runningId === routine.id}
    />
  );

  return (
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
          <div className={GRID_CLASS}>{favoriteRoutines.map(renderCard)}</div>
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

        {routinesCount === 0 ? (
          <div className="cockpit-panel rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-2.5 border border-border/80 bg-card/40 shadow-2xs">
            <FolderOpen className="w-8 h-8 text-muted-foreground/60 mb-0.5" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Nenhuma rotina encontrada</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md font-mono">
                Verifique se o diretório de rotinas está configurado corretamente nas Configurações ou clique em "Atualizar Catálogo".
              </p>
            </div>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="mt-1 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Diretório de Rotinas</span>
              </button>
            )}
          </div>
        ) : otherRoutines.length === 0 ? (
          <div className="text-center py-5 text-xs font-mono text-muted-foreground bg-card/30 rounded-lg border border-border/60">
            Nenhuma rotina encontrada para os filtros atuais.
          </div>
        ) : (
          <div className={GRID_CLASS}>{otherRoutines.map(renderCard)}</div>
        )}
      </div>
    </div>
  );
};
