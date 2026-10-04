import React from 'react';
import type { LlmProviderConfig } from '../../../../shared/types';

interface DocSettingsFooterProps {
  onClose: () => void;
  foldersCount: number;
  sourcesCount: number;
  activeProvider?: LlmProviderConfig;
}

export const DocSettingsFooter: React.FC<DocSettingsFooterProps> = ({
  onClose,
  foldersCount,
  sourcesCount,
  activeProvider
}) => (
  <div className="p-3.5 px-5 border-t border-border bg-muted/25 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="hidden sm:inline">
        {foldersCount} {foldersCount === 1 ? 'pasta local' : 'pastas locais'} · {sourcesCount} integrações Atlassian
        {activeProvider && activeProvider.enabled && ` · IA: ${activeProvider.name}`}
      </span>
      <span className="sm:hidden">
        {foldersCount} locais · {sourcesCount} cloud
      </span>
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 rounded-xl transition cursor-pointer"
      >
        Fechar (Esc)
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
      >
        Concluir
      </button>
    </div>
  </div>
);
