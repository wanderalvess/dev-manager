import React, { useState } from 'react';
import {
  RotateCw,
  Square,
  Play,
  Terminal,
  Download,
  ChevronDown,
  FileCode,
  FileSpreadsheet,
  Camera,
  Layers,
  History,
  UploadCloud
} from 'lucide-react';
import { KarafContainerStatus } from '../../utils/karafBundleUtils';

export interface KarafHeaderActionsProps {
  karafStatus: KarafContainerStatus;
  snapshotsCount: number;
  isLoading: boolean;
  isStartingKaraf: boolean;
  isStoppingKaraf: boolean;
  onLaunchKarafDebug: () => void;
  onStartEmbeddedKaraf: () => void;
  onStopKaraf: () => void;
  onExportBundles: (format: 'json' | 'csv') => void;
  onOpenLog: () => void;
  onOpenSnapshots: () => void;
  onOpenFeatures: () => void;
  onOpenDeployHistory: () => void;
  onOpenCatalog801: () => void;
  onOpenInstall: () => void;
  onRefresh: () => void;
}

export const KarafHeaderActions: React.FC<KarafHeaderActionsProps> = ({
  karafStatus,
  snapshotsCount,
  isLoading,
  isStartingKaraf,
  isStoppingKaraf,
  onLaunchKarafDebug,
  onStartEmbeddedKaraf,
  onStopKaraf,
  onExportBundles,
  onOpenLog,
  onOpenSnapshots,
  onOpenFeatures,
  onOpenDeployHistory,
  onOpenCatalog801,
  onOpenInstall,
  onRefresh
}) => {
  const [isKarafStartMenuOpen, setIsKarafStartMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  return (
    <div className="flex items-center flex-wrap gap-1.5 ml-auto">
      {/* Controle de Inicialização / Parada do Karaf */}
      {karafStatus === 'ONLINE' ? (
        <button
          type="button"
          onClick={onStopKaraf}
          disabled={isStoppingKaraf}
          className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-rose-600 dark:text-rose-400 cursor-pointer shadow-2xs disabled:opacity-50"
          title="Encerrar a execução do container Apache Karaf"
        >
          {isStoppingKaraf ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
              <span>Parando...</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 fill-current text-rose-500" />
              <span className="hidden sm:inline">Parar Karaf</span>
            </>
          )}
        </button>
      ) : (
        <div className="relative">
          <div className="inline-flex rounded-md shadow-2xs overflow-hidden border border-emerald-600">
            <button
              type="button"
              onClick={onLaunchKarafDebug}
              disabled={isStartingKaraf}
              className="h-[30px] px-3 py-1.5 font-semibold text-xs flex items-center space-x-1.5 transition-colors bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50"
              title="Iniciar o Apache Karaf em modo Debug com JDWP (:5005) em terminal"
            >
              {isStartingKaraf ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Iniciando Karaf...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Subir Karaf (Debug)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsKarafStartMenuOpen((prev) => !prev)}
              disabled={isStartingKaraf}
              className="h-[30px] px-1.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border-l border-emerald-500 cursor-pointer disabled:opacity-50"
              title="Mais opções de inicialização do Karaf"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isKarafStartMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsKarafStartMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-60 bg-card border border-border rounded-lg shadow-xl z-40 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsKarafStartMenuOpen(false);
                    onLaunchKarafDebug();
                  }}
                  className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-start gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0 fill-current" />
                  <div>
                    <div className="font-semibold text-xs">Subir em Modo Debug</div>
                    <div className="text-2xs text-muted-foreground">karaf.bat debug com porta JDWP (:5005)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsKarafStartMenuOpen(false);
                    onStartEmbeddedKaraf();
                  }}
                  className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-start gap-2 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">Iniciar Console Embutido</div>
                    <div className="text-2xs text-muted-foreground">Executa o Karaf no console interno do app</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Exportar Inventário */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsExportMenuOpen((prev) => !prev)}
          className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-2xs"
          title="Exportar inventário de bundles OSGi filtrados"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Exportar</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {isExportMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsExportMenuOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-40 py-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportBundles('json');
                }}
                className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer font-mono"
              >
                <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Exportar JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportBundles('csv');
                }}
                className="w-full text-left px-3 py-2 text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer font-mono"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenLog}
        className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-2xs"
        title="Ver log interno do Karaf (log:display)"
      >
        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Log do Karaf</span>
      </button>

      <button
        type="button"
        onClick={onOpenSnapshots}
        className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-2xs"
        title="Comparar estado atual de bundles com snapshot salvo"
      >
        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Snapshots / Diff</span>
        {snapshotsCount > 0 && (
          <span className="bg-muted text-foreground text-2xs px-1.5 py-0.2 rounded font-mono font-semibold border border-border/60">
            {snapshotsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenFeatures}
        className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-2xs"
        title="Gerenciar Features instaladas do Karaf (feature:list -i, feature:uninstall -r, feature:install)"
      >
        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Features Karaf</span>
      </button>

      <button
        type="button"
        onClick={onOpenDeployHistory}
        className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer shadow-2xs"
        title="Ver histórico de deploys/builds Karaf já executados"
      >
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Histórico</span>
      </button>

      <button
        type="button"
        onClick={onOpenCatalog801}
        className="h-[30px] px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-primary/30 text-foreground cursor-pointer shadow-2xs"
        title="Abrir catálogo oficial de serviços e rotinas (Rotina 801)"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>Catálogo 801</span>
      </button>

      <button
        type="button"
        onClick={onOpenInstall}
        className="h-[30px] px-3.5 py-1.5 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
        title="Instalar novo bundle ou outra versão"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Instalar Bundle</span>
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="h-[30px] w-[30px] flex items-center justify-center bg-card hover:bg-muted border border-border rounded-md text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer shadow-2xs"
        title="Atualizar lista de bundles"
      >
        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
      </button>
    </div>
  );
};
