import React from 'react';
import {
  RotateCw,
  Play,
  Hammer,
  RotateCcw,
  ArrowUpCircle,
  Info,
  Wrench,
  Square,
  Trash2
} from 'lucide-react';
import type { KarafBundleInfo } from '../../../../../shared/types';

interface KarafBundleRowActionsProps {
  bundle: KarafBundleInfo;
  isWorkspace: boolean;
  isRowLoading: boolean;
  isRebuilding: boolean;
  onOneClickRebuild: (bundle: KarafBundleInfo) => void;
  onBasicAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'resolve', bundleId: string) => void;
  onOpenReinstall: (bundle: KarafBundleInfo) => void;
  onOpenInstall: (bundle: KarafBundleInfo) => void;
  onOpenDetails: (bundle: KarafBundleInfo) => void;
  onOpenUninstall: (bundle: KarafBundleInfo) => void;
}

export const KarafBundleRowActions: React.FC<KarafBundleRowActionsProps> = ({
  bundle: b,
  isWorkspace,
  isRowLoading,
  isRebuilding,
  onOneClickRebuild,
  onBasicAction,
  onOpenReinstall,
  onOpenInstall,
  onOpenDetails,
  onOpenUninstall
}) => (
  <td className="px-4 py-3 border-b border-border/40 text-right">
    <div className="flex items-center justify-end space-x-1">
      {/* Recompilar Maven & Atualizar (1 clique para projetos do workspace) */}
      {isWorkspace && (
        <button
          type="button"
          onClick={() => onOneClickRebuild(b)}
          disabled={isRebuilding || isRowLoading}
          title="Recompilar projeto Maven (clean install) e atualizar bundle no Karaf em 1 clique" aria-label="Recompilar projeto Maven (clean install) e atualizar bundle no Karaf em 1 clique"
          className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Hammer className={`w-3.5 h-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
        </button>
      )}

      {/* Atualizar Fiações (bundle:refresh) */}
      <button
        type="button"
        onClick={() => onBasicAction('refresh', b.id)}
        disabled={isRowLoading}
        title="Atualizar fiações OSGi do bundle (bundle:refresh)" aria-label="Atualizar fiações OSGi do bundle (bundle:refresh)"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* Reinstalar */}
      <button
        type="button"
        onClick={() => onOpenReinstall(b)}
        disabled={isRowLoading}
        title="Reinstalar bundle (update + refresh)" aria-label="Reinstalar bundle (update + refresh)"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Instalar Outra Versão / Atualizar */}
      <button
        type="button"
        onClick={() => onOpenInstall(b)}
        disabled={isRowLoading}
        title="Instalar outra versão ou atualizar" aria-label="Instalar outra versão ou atualizar"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
      >
        <ArrowUpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Detalhes & Dependências */}
      <button
        type="button"
        onClick={() => onOpenDetails(b)}
        disabled={isRowLoading}
        title="Inspecionar dependências e manifesto" aria-label="Inspecionar dependências e manifesto"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Resolver Dependências (bundle:resolve) */}
      {b.state === 'Installed' && (
        <button
          type="button"
          onClick={() => onBasicAction('resolve', b.id)}
          disabled={isRowLoading}
          title="Forçar resolução de dependências OSGi (bundle:resolve)" aria-label="Forçar resolução de dependências OSGi (bundle:resolve)"
          className="p-1.5 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Iniciar / Parar */}
      {b.state === 'Active' ? (
        <button
          type="button"
          onClick={() => onBasicAction('stop', b.id)}
          disabled={isRowLoading}
          title="Parar bundle" aria-label="Parar bundle"
          className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onBasicAction('start', b.id)}
          disabled={isRowLoading}
          title="Iniciar bundle" aria-label="Iniciar bundle"
          className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      {/* Desinstalar */}
      <button
        type="button"
        onClick={() => onOpenUninstall(b)}
        disabled={isRowLoading}
        title="Desinstalar bundle com verificação de dependências" aria-label="Desinstalar bundle com verificação de dependências"
        className="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </td>
);
