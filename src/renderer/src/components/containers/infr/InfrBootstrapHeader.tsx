import React from 'react';
import { BookOpen, ChevronLeft, Server, X } from 'lucide-react';
import { INFR_VIEW_TITLE, type InfrBootstrapTab, type InfrFolderStatus } from '../../../utils/infrBootstrapModalUtils';

/**
 * Cabeçalho do assistente. Na tela de ambientes mostra onde tudo roda (distro e pasta do INFR-Docker, numa linha);
 * nas outras telas, o caminho de volta para Ambientes e o nome da tela, sem navegação lateral.
 */
export const InfrBootstrapHeader: React.FC<{
  view: InfrBootstrapTab;
  onHome: () => void;
  onClose: () => void;
  /** Distro escolhida na tela */
  distro?: string;
  /** Distro que o Hub achou sozinho (a com Docker e "winthor" no nome), quando a tela está no Windows */
  detectedDistro?: string;
  folder: InfrFolderStatus;
  onOpenScripts: () => void;
  /** Abre o guia "Ambientes WinThor no Docker" (o mesmo da Central de Ajuda → Guias) */
  onOpenGuide: () => void;
}> = ({ view, onHome, onClose, distro, detectedDistro, folder, onOpenScripts, onOpenGuide }) => {
  const distroName = distro || detectedDistro;
  const ok = folder.ok && !!distroName;

  return (
    <div className="shrink-0 px-4 md:px-5 py-2.5 border-b border-border/80 bg-card flex flex-wrap items-center gap-x-3 gap-y-2">
      {view === 'home' ? (
        <>
          <span className="w-8 h-8 shrink-0 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
            <Server className="w-4 h-4" />
          </span>
          <h3 className="font-bold text-foreground text-base">{INFR_VIEW_TITLE.home}</h3>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center gap-1 h-8 pl-1 pr-2 rounded-lg text-xs font-semibold text-warning hover:bg-warning/10 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Ambientes
          </button>
          <span className="text-muted-foreground/60" aria-hidden="true">
            /
          </span>
          <h3 className="font-bold text-foreground text-base">{INFR_VIEW_TITLE[view]}</h3>
        </>
      )}
      <div className="flex-1 min-w-0 flex">
        <button
          type="button"
          onClick={onOpenScripts}
          title={ok ? 'Pasta do INFR-Docker com todos os scripts (clique para conferir)' : 'Faltam scripts ou a pasta não foi achada: clique para conferir'}
          className="inline-flex items-center gap-1.5 min-w-0 max-w-full px-2 h-7 rounded-md text-2xs text-foreground/80 hover:text-foreground hover:bg-muted cursor-pointer"
        >
          <span className={`w-2 h-2 shrink-0 rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
          <span className="truncate">
            {distroName ? `${distroName}${distro ? '' : ' (detectada)'}` : 'distro detectada ao rodar'}
            {' · '}
            {folder.folder ? (folder.ok ? folder.folder : `${folder.folder}: faltam ${folder.missing} scripts`) : 'pasta do INFR-Docker não encontrada'}
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenGuide}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-2xs font-semibold text-primary hover:bg-primary/10 cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5" /> Como funciona
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar o assistente"
        className="w-9 h-9 -mr-1.5 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
