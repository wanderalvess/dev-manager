import React from 'react';
import { RefreshCw, Layers, Sparkles, Server, DownloadCloud, Hammer } from 'lucide-react';
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
  onOpenDelphiBuild: () => void;
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
  onOpenDelphiBuild,
  onOpenTour
}) => {
  const badgeInfo = getKarafWtaBadgeInfo(karafStatus, isCheckingKaraf, winthorStartActive);

  return (
    <div className="flex flex-col gap-4 shrink-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground" data-tour="catalogo-rotinas">
                Rotinas
              </h1>
              <span className="text-[13px] bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                {routinesCount} {routinesCount === 1 ? 'rotina' : 'rotinas'}
              </span>
              {mappedProgramsCount > 0 && (
                <span className="text-[13px] bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                  {mappedProgramsCount} {mappedProgramsCount === 1 ? 'atalho' : 'atalhos'}
                </span>
              )}
              <span
                className={`text-[13px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
                  winthorStartActive
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
                title={
                  winthorStartActive
                    ? 'WinThor Start ativado: Rotinas serão iniciadas via serviço local autenticado (DataSnap)'
                    : 'WinThor Start desativado: Rotinas serão disparadas via executável direto'
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${winthorStartActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                <span>WinThor Start {winthorStartActive ? 'ativo' : 'desativado'}</span>
              </span>
              <span
                className={`text-[13px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${badgeInfo.colorClass}`}
                title={badgeInfo.tooltip}
              >
                <Server className="w-3 h-3" />
                <span>{badgeInfo.label}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              Pasta das rotinas: <span className="text-foreground font-mono text-[13px]">{appPath || 'não configurada'}</span>. Busca instantânea, favoritos e rollback (.bak).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCcwModal(undefined, 'download')}
            className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[10px] text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
            title="Baixar ou atualizar rotinas diretamente da Central de Controle ou de arquivo local"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Atualizar rotina (CCW)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCcwModal(undefined, 'batch')}
            className="h-10 px-3 bg-card hover:bg-muted text-foreground border border-border rounded-[10px] text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download e atualização em lote de rotinas favoritas ou de um módulo inteiro"
          >
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span>Atualização em lote</span>
          </button>

          <button
            type="button"
            onClick={onOpenDelphiBuild}
            className="h-10 px-3 bg-card hover:bg-muted text-foreground border border-border rounded-[10px] text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Compilar um projeto Delphi (.dproj) e, se quiser, publicar e abrir o executável"
          >
            <Hammer className="w-4 h-4 text-muted-foreground" />
            <span>Build Delphi</span>
          </button>

          <button
            data-tour="atualizar-catalogo"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-10 px-3 bg-card hover:bg-muted border border-border rounded-[10px] text-sm font-medium text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reescanear diretório de rotinas e revalidar status dos serviços"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Atualizar catálogo</span>
          </button>

          <button
            type="button"
            onClick={onOpenTour}
            className="h-10 w-10 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center justify-center shrink-0 cursor-pointer"
            title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[14px] p-3 shadow-xs">
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
    </div>
  );
};
