import React from 'react';
import { GitMerge, ArrowRight, ExternalLink, Upload, Loader2, Info } from 'lucide-react';
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
}) => (
  <div className="space-y-4 pt-4 border-t border-border">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        <GitMerge className="w-4 h-4 text-muted-foreground" />
        {getPrPanelTitle(project.provider)}
      </h3>

      <div className="flex items-center gap-2 text-[13px]" data-tour="selecionar-branch-destino">
        <span className="text-muted-foreground">Branch de destino</span>
        <select
          value={targetBranch}
          onChange={(e) => onTargetBranchChange(e.target.value)}
          disabled={isBusy}
          aria-label="Branch de destino do Pull Request"
          className="h-8 bg-card border border-input rounded-lg px-2.5 text-[13px] text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          {targetBranchOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
    </div>

    <GitPrSteps
      steps={getPrSteps({
        branch: project.currentBranch,
        localOnly: isLocalOnly,
        unpushedCommits: unpushedCount,
        blockedReason: prBlockedReason
      })}
    />

    {/* Diagrama Visual das Branches */}
    <div className="bg-muted/60 rounded-xl p-3.5 flex items-center justify-between text-[13px] font-mono">
      <div className="flex items-center gap-2 truncate">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <span className="text-foreground font-medium truncate max-w-[200px]" title={project.currentBranch}>
          {project.currentBranch}
        </span>
        {isLocalOnly && (
          <span className="text-[13px] font-sans bg-warning/10 text-warning px-2.5 py-0.5 rounded-full font-medium shrink-0">
            só local
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground shrink-0 px-3 font-sans">
        <div className="h-px w-8 bg-border" />
        <span className="text-xs font-medium">Pull Request</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-foreground font-medium">{targetBranch}</span>
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
      </div>
    </div>

    {isLocalOnly && !prBlockedReason && (
      <p className="flex items-start gap-2 text-[13px] text-muted-foreground bg-warning/10 rounded-[10px] px-3.5 py-2.5">
        <Info className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
        <span>
          Esta branch ainda não está no origin. Ao abrir o PR ela é publicada antes (
          <code className="font-mono text-foreground">git push --set-upstream origin {project.currentBranch}</code>
          ), senão o provedor não encontra a branch de origem.
        </span>
      </p>
    )}

    {/* Botão de Criação de PR */}
    <button
      type="button"
      data-tour="criar-pull-request"
      onClick={onOpenPr}
      disabled={Boolean(prBlockedReason) || isBusy}
      className={`w-full h-11 px-4 rounded-[10px] font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
        !prBlockedReason && !isBusy
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
          : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
      }`}
    >
      {isBusy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isLocalOnly && !prBlockedReason ? (
        <Upload className="w-4 h-4" />
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      <span>{prBlockedReason ? prBlockedReason : isBusy ? 'Preparando Pull Request...' : getPrActionLabel(project.provider, isLocalOnly)}</span>
    </button>
  </div>
);
