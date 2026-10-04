import React from 'react';
import { GitMerge, ArrowRight, ExternalLink } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import { getPrButtonLabel, getPrPanelTitle } from '../../utils/gitViewUtils';

interface GitPullRequestPanelProps {
  project: GitProjectInfo;
  targetBranch: string;
  targetBranchOptions: string[];
  prBlockedReason: string | null;
  onTargetBranchChange: (value: string) => void;
  onOpenPr: () => void;
}

export const GitPullRequestPanel: React.FC<GitPullRequestPanelProps> = ({
  project,
  targetBranch,
  targetBranchOptions,
  prBlockedReason,
  onTargetBranchChange,
  onOpenPr
}) => (
  <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
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
          className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
        >
          {targetBranchOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Diagrama Visual das Branches */}
    <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center space-x-2 truncate">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-emerald-600 dark:text-emerald-300 font-bold truncate max-w-[200px]">
          {project.currentBranch}
        </span>
      </div>

      <div className="flex items-center space-x-2 text-muted-foreground shrink-0 px-3">
        <div className="h-[1px] w-8 bg-border" />
        <span className="text-[10px] font-bold text-primary">PULL REQUEST</span>
        <ArrowRight className="w-3.5 h-3.5 text-primary" />
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <span className="text-foreground font-bold">{targetBranch}</span>
        <span className="w-2 h-2 rounded-full bg-primary" />
      </div>
    </div>

    {/* Botão de Criação de PR */}
    <button
      data-tour="criar-pull-request"
      onClick={onOpenPr}
      disabled={Boolean(prBlockedReason)}
      className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
        !prBlockedReason
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.01] border border-primary/40'
          : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
      }`}
    >
      <ExternalLink className="w-4 h-4" />
      <span>{prBlockedReason ? prBlockedReason : getPrButtonLabel(project.provider)}</span>
    </button>
  </div>
);
