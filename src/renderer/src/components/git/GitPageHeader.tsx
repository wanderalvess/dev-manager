import React from 'react';
import { GitPullRequest, RefreshCw, HelpCircle } from 'lucide-react';

interface GitPageHeaderProps {
  projectCount: number;
  isBusy: boolean;
  onOpenTour: () => void;
  onSync: () => void;
}

export const GitPageHeader: React.FC<GitPageHeaderProps> = ({ projectCount, isBusy, onOpenTour, onSync }) => (
  <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
          <GitPullRequest className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            Controle de Versão (Git)
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
              {projectCount} {projectCount === 1 ? 'Repositório Ativo' : 'Repositórios Ativos'}
            </span>
            <button
              type="button"
              onClick={onOpenTour}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
              title="Rever o tour guiado desta página"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Gestão de branches locais, sincronização remota e criação direta de Pull Requests (Azure DevOps, GitHub ou GitLab).
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSync}
          disabled={isBusy}
          className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-60"
          title="Reescanear diretório de projetos Git"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-primary' : ''}`} />
          <span>Sincronizar Repositórios</span>
        </button>
      </div>
    </div>
  </div>
);
