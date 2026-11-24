import React from 'react';
import { ArrowRight, ExternalLink, Upload, Loader2, Info } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import { getPrPanelTitle } from '../../utils/gitViewUtils';
import { getPrActionLabel, getPrSteps } from '../../utils/gitPublishViewUtils';
import { GitPrSteps } from './GitPrSteps';

interface GitPullRequestPanelProps {
  project: GitProjectInfo;
  targetBranch: string;
  targetBranchOptions: string[];
  prBlockedReason: string | null;
  /** A branch atual ainda não existe no origin: o botão publica antes de abrir o formulário. */
  isLocalOnly: boolean;
  /** Commits locais que o origin ainda não tem (0 quando em dia ou desconhecido). */
  unpushedCount: number;
  /** Verificando/publicando a branch ou abrindo o formulário. */
  isBusy: boolean;
  onTargetBranchChange: (value: string) => void;
  onOpenPr: () => void;
}

export const GitPullRequestPanel: React.FC<GitPullRequestPanelProps> = ({
  project,
  targetBranch,
  targetBranchOptions,
  prBlockedReason,
  isLocalOnly,
  unpushedCount,
  isBusy,
  onTargetBranchChange,
  onOpenPr
}) => {
  const canOpen = !prBlockedReason && !isBusy;
  return (
    <section className="space-y-3" aria-labelledby="git-pr-title">
      <h3 id="git-pr-title" className="text-sm font-semibold text-foreground">
        {getPrPanelTitle(project.provider)}
      </h3>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 text-[13px]" data-tour="selecionar-branch-destino">
          <span
            className="font-mono font-medium text-foreground truncate max-w-[40%] shrink"
            title={`Branch de origem: ${project.currentBranch}`}
          >
            {project.currentBranch}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="para" />
          <select
            value={targetBranch}
            onChange={(e) => onTargetBranchChange(e.target.value)}
            disabled={isBusy}
            aria-label="Branch de destino do Pull Request"
            title="Branch de destino"
            className="h-8 w-auto max-w-[50%] min-w-0 bg-card border border-input rounded-lg pl-2.5 pr-7 text-[13px] text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-ring disabled:opacity-60 cursor-pointer"
          >
            {targetBranchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          data-tour="criar-pull-request"
          onClick={onOpenPr}
          disabled={!canOpen}
          className="h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isLocalOnly && !prBlockedReason ? (
            <Upload className="w-3.5 h-3.5" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          <span>{isBusy ? 'Preparando Pull Request...' : getPrActionLabel(project.provider, isLocalOnly)}</span>
        </button>
      </div>

      <GitPrSteps
        steps={getPrSteps({
          branch: project.currentBranch,
          localOnly: isLocalOnly,
          unpushedCommits: unpushedCount,
          blockedReason: prBlockedReason
        })}
      />

      {prBlockedReason && (
        <p role="status" className="flex items-start gap-2 text-[13px] text-foreground bg-danger/10 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
          <span>{prBlockedReason}.</span>
        </p>
      )}

      {isLocalOnly && !prBlockedReason && (
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground bg-warning/10 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <span>
            Esta branch ainda não está no origin. Ao abrir o PR ela é publicada antes (
            <code className="font-mono text-foreground">git push --set-upstream origin {project.currentBranch}</code>
            ), senão o provedor não encontra a branch de origem.
          </span>
        </p>
      )}
    </section>
  );
};
