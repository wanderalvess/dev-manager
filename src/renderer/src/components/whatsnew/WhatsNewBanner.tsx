import React from 'react';
import { History, Layers, RotateCcw, Sparkles } from 'lucide-react';
import type { ChangelogVersion } from '../../utils/changelogUtils';

interface WhatsNewBannerProps {
  isAllVersions: boolean;
  isLatestVersion: boolean;
  selectedVersion: string;
  latestVersion?: string;
  currentVersionItem: ChangelogVersion | null;
  onSelectVersion: (version: string) => void;
}

/** Banner compacto: versão histórica ou histórico completo; null na versão mais recente. */
export const WhatsNewBanner: React.FC<WhatsNewBannerProps> = ({
  isAllVersions,
  isLatestVersion,
  selectedVersion,
  latestVersion,
  currentVersionItem,
  onSelectVersion
}) => {
  if (!isAllVersions && !isLatestVersion && currentVersionItem) {
    return (
      <div className="px-5 py-2 flex items-center justify-between gap-3 text-xs bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">
            Você está visualizando as notas históricas da versão <strong>v{selectedVersion}</strong>
            {currentVersionItem.date ? ` (lançada em ${currentVersionItem.date})` : ''}.
          </span>
        </div>
        {latestVersion && (
          <button
            type="button"
            onClick={() => onSelectVersion(latestVersion)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 text-2xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Voltar para v{latestVersion} (Mais recente)</span>
          </button>
        )}
      </div>
    );
  }

  if (isAllVersions && latestVersion) {
    return (
      <div className="px-5 py-2 flex items-center justify-between gap-3 text-xs bg-primary/10 border-b border-primary/20 text-primary">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 shrink-0 text-primary" />
          <span className="truncate">
            Visualizando o <strong>histórico completo</strong> com todas as versões registradas.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelectVersion(latestVersion)}
          className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-2xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Ver apenas a versão atual (v{latestVersion})</span>
        </button>
      </div>
    );
  }

  return null;
};
