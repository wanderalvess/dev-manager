import React from 'react';
import { Settings, FolderOpen } from 'lucide-react';

interface GitEmptyStateProps {
  hasProjects: boolean;
  onNavigateToSettings?: () => void;
}

export const GitEmptyState: React.FC<GitEmptyStateProps> = ({ hasProjects, onNavigateToSettings }) => {
  if (hasProjects) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
        Selecione um repositório na lista para visualizar status e criar Pull Requests.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center cockpit-panel rounded-2xl border border-border space-y-3">
      <FolderOpen className="w-10 h-10 text-primary/50" />
      <div>
        <h4 className="text-sm font-bold text-foreground">Nenhum repositório Git encontrado</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          Nenhum projeto com diretório <code className="text-primary font-mono">.git</code> foi localizado no caminho configurado.
        </p>
      </div>
      {onNavigateToSettings && (
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurar Diretório de Projetos</span>
        </button>
      )}
    </div>
  );
};
