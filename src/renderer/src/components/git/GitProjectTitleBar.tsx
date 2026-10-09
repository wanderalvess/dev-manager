import React from 'react';
import { FolderGit2, ArrowUpRight } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import { getRemoteProviderLabel } from '../../utils/gitViewUtils';

interface GitProjectTitleBarProps {
  project: GitProjectInfo;
  onOpenAzurePipelines: () => void;
  onOpenRemoteRepo: () => void;
}

export const GitProjectTitleBar: React.FC<GitProjectTitleBarProps> = ({
  project,
  onOpenAzurePipelines,
  onOpenRemoteRepo
}) => (
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FolderGit2 className="w-5 h-5 text-primary" />
        {project.name}
      </h3>
      <p className="text-2xs text-muted-foreground font-mono mt-0.5">{project.path}</p>
    </div>

    {project.webUrl && (
      <div className="flex items-center space-x-2">
        {project.isAzure && (
          <button
            onClick={onOpenAzurePipelines}
            className="flex items-center space-x-1.5 text-xs text-foreground bg-card hover:bg-muted border border-border px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            title="Ver pipelines de integração contínua (CI/CD) no Azure DevOps"
          >
            <span>Pipelines CI/CD</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}

        <button
          onClick={onOpenRemoteRepo}
          className="flex items-center space-x-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
          title="Abrir repositório no navegador"
        >
          <span>{getRemoteProviderLabel(project.provider)}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
  </div>
);
