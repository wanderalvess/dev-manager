import React from 'react';
import { Grid, RefreshCw, Layers, Sparkles, Server, DownloadCloud } from 'lucide-react';
import { KarafWtaStatusResult } from '../../../../shared/types';
import { getKarafWtaBadgeInfo } from '../../utils/routineLaunchUiUtils';
import { CcwInitialTab } from '../../utils/routinesPageUtils';
import { RoutinesFilterBar } from './RoutinesFilterBar';

interface RoutinesHeaderProps {
  routinesCount: number;
  filteredCount: number;
  mappedProgramsCount: number;
  appPath: string;
  winthorStartActive: boolean;
  karafStatus: KarafWtaStatusResult | null;
  isCheckingKaraf: boolean;
  isLoading: boolean;
  searchTerm: string;
  selectedModule: string;
  modules: string[];
  onSearchChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onOpenCcwModal: (routineName?: string, tab?: CcwInitialTab) => void;
  onRefresh: () => void;
  onOpenTour: () => void;
}

export const RoutinesHeader: React.FC<RoutinesHeaderProps> = ({
  routinesCount,
  filteredCount,
  mappedProgramsCount,
  appPath,
  winthorStartActive,
  karafStatus,
  isCheckingKaraf,
  isLoading,
  searchTerm,
  selectedModule,
  modules,
  onSearchChange,
  onModuleChange,
  onOpenCcwModal,
  onRefresh,
  onOpenTour
}) => {
  const badgeInfo = getKarafWtaBadgeInfo(karafStatus, isCheckingKaraf, winthorStartActive);

  return (
    <div className="cockpit-panel rounded-xl p-3 shadow-2xs border border-border/80 flex flex-col space-y-3 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Grid className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground tracking-tight" data-tour="catalogo-rotinas">
                Catálogo de Rotinas &amp; Atalhos
              </h1>
              <span className="text-2xs bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                {routinesCount} {routinesCount === 1 ? 'Rotina' : 'Rotinas'}
              </span>
              {mappedProgramsCount > 0 && (
                <span className="text-2xs bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  {mappedProgramsCount} {mappedProgramsCount === 1 ? 'Atalho' : 'Atalhos'}
                </span>
              )}
              <span
                className={`text-2xs px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 border uppercase tracking-wider ${
                  winthorStartActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted/70 text-muted-foreground border-border'
                }`}
                title={
                  winthorStartActive
                    ? 'WinThor Start ativado: Rotinas serão iniciadas via serviço local autenticado (DataSnap)'
                    : 'WinThor Start desativado: Rotinas serão disparadas via executável direto'
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${winthorStartActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                <span>WinThor Start: {winthorStartActive ? 'Ativo' : 'Desativado'}</span>
              </span>
              <span
                className={`text-2xs px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 border uppercase tracking-wider ${badgeInfo.colorClass}`}
                title={badgeInfo.tooltip}
              >
                <Server className="w-3 h-3" />
                <span>{badgeInfo.label}</span>
              </span>
            </div>
            <p className="text-2xs text-muted-foreground font-mono mt-0.5 truncate">
              Pasta configurada: <span className="text-foreground">{appPath || 'não configurada'}</span> | Busca instantânea, favoritos e rollback (.bak).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenCcwModal(undefined, 'download')}
            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            title="Baixar ou atualizar rotinas diretamente da Central de Controle ou de arquivo local"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Atualizar Rotina (CCW)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCcwModal(undefined, 'batch')}
            className="px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 hover:border-primary/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            title="Download e atualização em lote de rotinas favoritas ou de um módulo inteiro"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Atualização em Lote</span>
          </button>

          <button
            data-tour="atualizar-catalogo"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 hover:border-primary/40 rounded-lg text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            title="Reescanear diretório de rotinas e revalidar status dos serviços"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Atualizar Catálogo</span>
          </button>

          <button
            type="button"
            onClick={onOpenTour}
            className="h-8 w-8 rounded-lg border border-border/70 hover:border-primary/40 text-muted-foreground hover:text-primary transition flex items-center justify-center shrink-0 cursor-pointer active:scale-[0.98]"
            title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <RoutinesFilterBar
        searchTerm={searchTerm}
        selectedModule={selectedModule}
        modules={modules}
        filteredCount={filteredCount}
        routinesCount={routinesCount}
        onSearchChange={onSearchChange}
        onModuleChange={onModuleChange}
      />
    </div>
  );
};
