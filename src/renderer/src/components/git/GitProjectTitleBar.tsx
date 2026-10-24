import React from 'react';
import { ArrowUpRight, Package } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import { getRemoteProviderLabel } from '../../utils/gitViewUtils';

interface GitProjectTitleBarProps {
  project: GitProjectInfo;
  onOpenAzurePipelines: () => void;
  onOpenRemoteRepo: () => void;
  onOpenArtifacts?: () => void;
}

const LINK_BTN =
  'flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 h-8 rounded-lg font-medium transition-colors cursor-pointer';

export const GitProjectTitleBar: React.FC<GitProjectTitleBarProps> = ({
  project,
  onOpenAzurePipelines,
  onOpenRemoteRepo,
  onOpenArtifacts
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-foreground truncate">{project.name}</h2>
      <p className="text-[13px] text-muted-foreground font-mono mt-0.5 truncate">{project.path}</p>
    </div>

    {project.webUrl && (
      <div className="flex items-center gap-1 shrink-0">
        {project.isAzure && onOpenArtifacts && (
          <button
            type="button"
            onClick={onOpenArtifacts}
            className={LINK_BTN}
            title="Listar builds do Azure Pipelines e baixar os artefatos publicados"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Artefatos</span>
          </button>
        )}

        {project.isAzure && (
          <button
            type="button"
            onClick={onOpenAzurePipelines}
            className={LINK_BTN}
            title="Ver pipelines de integração contínua (CI/CD) no Azure DevOps"
          >
            <span>Pipelines CI/CD</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenRemoteRepo}
          className={`${LINK_BTN} text-primary hover:text-primary`}
          title="Abrir repositório no navegador"
        >
          <span>{getRemoteProviderLabel(project.provider)}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
  </div>
);
