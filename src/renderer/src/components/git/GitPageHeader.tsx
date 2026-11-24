import React from 'react';
import { RefreshCw, HelpCircle } from 'lucide-react';

interface GitPageHeaderProps {
  projectCount: number;
  /** Repositórios com a branch atual só local e com alterações pendentes: avisos de atenção (somem quando zero). */
  localOnlyCount: number;
  changesCount: number;
  isBusy: boolean;
  onOpenTour: () => void;
  onSync: () => void;
}

export const GitPageHeader: React.FC<GitPageHeaderProps> = ({
  projectCount,
  localOnlyCount,
  changesCount,
  isBusy,
  onOpenTour,
  onSync
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
    <div className="flex items-baseline gap-3 min-w-0 flex-wrap">
      <h1 className="text-lg leading-tight font-semibold tracking-tight text-foreground">Git</h1>
      <p className="text-[13px] text-muted-foreground">
        <span className="tabular-nums">{projectCount}</span> {projectCount === 1 ? 'repositório' : 'repositórios'}
        {changesCount > 0 && (
          <span title="Repositórios com alterações pendentes">
            {' · '}
            <span className="text-warning font-medium tabular-nums">{changesCount}</span> com alterações
          </span>
        )}
        {localOnlyCount > 0 && (
          <span title="Repositórios cuja branch atual ainda não existe no origin">
            {' · '}
            <span className="text-warning font-medium tabular-nums">{localOnlyCount}</span>{' '}
            {localOnlyCount === 1 ? 'só local' : 'só locais'}
          </span>
        )}
      </p>
      <span className="sr-only">Branches locais, sincronização com o remoto e Pull Requests (Azure DevOps, GitHub ou GitLab).</span>
    </div>

    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onOpenTour}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        title="Rever o tour guiado desta página"
        aria-label="Rever o tour guiado desta página"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onSync}
        disabled={isBusy}
        className="h-8 px-3 bg-card hover:bg-muted border border-border rounded-lg text-[13px] font-medium text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
        title="Reescanear diretório de projetos Git"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
        <span>Sincronizar todos</span>
      </button>
    </div>
  </div>
);
