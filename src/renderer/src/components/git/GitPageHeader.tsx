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

const ATTENTION_TAG = 'text-[13px] font-medium bg-warning/10 text-warning px-2.5 py-0.5 rounded-full';

export const GitPageHeader: React.FC<GitPageHeaderProps> = ({
  projectCount,
  localOnlyCount,
  changesCount,
  isBusy,
  onOpenTour,
  onSync
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4 shrink-0">
    <div className="min-w-0">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground">Git</h1>
        <button
          type="button"
          onClick={onOpenTour}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        {localOnlyCount > 0 && (
          <span className={ATTENTION_TAG} title="Repositórios cuja branch atual ainda não existe no origin">
            {localOnlyCount} {localOnlyCount === 1 ? 'só local' : 'só locais'}
          </span>
        )}
        {changesCount > 0 && (
          <span className={ATTENTION_TAG} title="Repositórios com alterações pendentes">
            {changesCount} com alterações
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {projectCount} {projectCount === 1 ? 'repositório' : 'repositórios'}. Branches locais, sincronização com o remoto e Pull Requests (Azure DevOps, GitHub ou GitLab).
      </p>
    </div>

    <button
      type="button"
      onClick={onSync}
      disabled={isBusy}
      className="h-10 px-4 bg-card hover:bg-muted border border-border rounded-[10px] text-sm font-medium text-foreground transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
      title="Reescanear diretório de projetos Git"
    >
      <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin text-primary' : ''}`} />
      <span>Sincronizar todos</span>
    </button>
  </div>
);
