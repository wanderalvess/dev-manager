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
  <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
        <GitMerge className="w-4 h-4" />
        {getPrPanelTitle(project.provider)}
      </span>

      <div className="flex items-center space-x-2 text-xs" data-tour="selecionar-branch-destino">
        <span className="text-muted-foreground font-medium">Branch de Destino:</span>
        <select
          value={targetBranch}
          onChange={(e) => onTargetBranchChange(e.target.value)}
          disabled={isBusy}
          aria-label="Branch de destino do Pull Request"
          className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary disabled:opacity-60"
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
    <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center space-x-2 truncate">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
        <span className="text-success font-bold truncate max-w-[200px]" title={project.currentBranch}>
          {project.currentBranch}
        </span>
        {isLocalOnly && (
          <span className="text-2xs bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.5 rounded font-bold shrink-0">
            SÓ LOCAL
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 text-muted-foreground shrink-0 px-3">
        <div className="h-px w-8 bg-border" />
        <span className="text-2xs font-bold text-primary">PULL REQUEST</span>
        <ArrowRight className="w-3.5 h-3.5 text-primary" />
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <span className="text-foreground font-bold">{targetBranch}</span>
        <span className="w-2 h-2 rounded-full bg-primary" />
      </div>
    </div>

    {isLocalOnly && !prBlockedReason && (
      <p className="flex items-start gap-2 text-2xs text-muted-foreground bg-warning/5 border border-warning/25 rounded-lg px-3 py-2">
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
      className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
        !prBlockedReason && !isBusy
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.01] border border-primary/40 cursor-pointer'
          : 'bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none'
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
