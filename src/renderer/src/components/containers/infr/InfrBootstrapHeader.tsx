import React from 'react';
import { Server, X } from 'lucide-react';
import type { InfrFolderStatus } from '../../../utils/infrBootstrapModalUtils';

const Chip: React.FC<{ ok: boolean | null; title: string; children: React.ReactNode; onClick?: () => void }> = ({ ok, title, children, onClick }) => {
  const cls = 'inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 border border-border/80 rounded-full text-2xs text-foreground/80';
  const dot = <span className={`w-2 h-2 shrink-0 rounded-full ${ok === null ? 'bg-muted-foreground/40' : ok ? 'bg-success' : 'bg-danger'}`} />;
  const text = <span className="truncate">{children}</span>;
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={`${cls} hover:bg-muted cursor-pointer`}>
      {dot}
      {text}
    </button>
  ) : (
    <span title={title} className={cls}>
      {dot}
      {text}
    </span>
  );
};

/** Cabeçalho do assistente: o que ele faz e onde vai rodar (distro e pasta do INFR-Docker). */
export const InfrBootstrapHeader: React.FC<{
  onClose: () => void;
  /** Distro escolhida na tela */
  distro?: string;
  /** Distro que o Hub achou sozinho (a com Docker e "winthor" no nome), quando a tela está no Windows */
  detectedDistro?: string;
  folder: InfrFolderStatus;
  onOpenScripts: () => void;
}> = ({ onClose, distro, detectedDistro, folder, onOpenScripts }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-start gap-3">
    <div className="flex-1 min-w-0 flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex items-start gap-3 min-w-0 flex-1 basis-72">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
          <Server className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-foreground text-base">Assistente INFR-Docker</h3>
          <p className="text-xs text-muted-foreground">Cria e atualiza ambientes WinThor (Oracle, WTA e WSH) em containers dentro do WSL.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <Chip
          ok={distro || detectedDistro ? true : null}
          title={distro ? 'Distro WSL onde os containers rodam' : 'Nenhuma distro escolhida na tela: o Hub usa a que tem Docker e "winthor" no nome'}
        >
          {distro ? `Distro ${distro}` : detectedDistro ? `Distro ${detectedDistro} (detectada)` : 'Distro detectada ao rodar'}
        </Chip>
        <Chip
          ok={folder.ok}
          onClick={onOpenScripts}
          title={folder.ok ? 'Pasta do INFR-Docker (clique para conferir os scripts)' : 'Faltam scripts nesta pasta: clique para conferir'}
        >
          {folder.folder ? `Pasta ${folder.folder}` : 'Pasta do INFR-Docker não encontrada'}
          {folder.missing > 0 && ` · faltam ${folder.missing} scripts`}
        </Chip>
      </div>
    </div>

    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar o assistente"
      className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
