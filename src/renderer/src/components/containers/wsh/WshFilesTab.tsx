import React from 'react';
import { FolderOpen, RotateCw } from 'lucide-react';
import type { WshPrerequisiteStatus } from '../../../../../shared/types';
import { wshUtilsModalPrereqVisual } from '../../../utils/wshUtilsModalUtils';

interface WshFilesTabProps {
  prereqs: WshPrerequisiteStatus[];
  isLoadingPrereqs: boolean;
  isOpeningOptFolder: boolean;
  onLoadPrereqs: () => void;
  onOpenOptFolder: () => void;
}

export const WshFilesTab: React.FC<WshFilesTabProps> = ({
  prereqs,
  isLoadingPrereqs,
  isOpeningOptFolder,
  onLoadPrereqs,
  onOpenOptFolder
}) => (
  <div className="space-y-4">
    <div className="bg-info/5 border border-info/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0 mt-0.5">
          <FolderOpen className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-semibold block mb-0.5">Diretório Compartilhado /opt (WSL)</strong>
          O container WSH monta o JAR e o Winthor.ini diretamente de <code className="text-foreground font-mono">/opt</code>. Se esses arquivos não estiverem lá, o container não iniciará.
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenOptFolder}
        disabled={isOpeningOptFolder}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-info/20 hover:bg-info/30 text-info rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-98"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        <span>{isOpeningOptFolder ? 'Abrindo...' : 'Abrir /opt no Explorer'}</span>
      </button>
    </div>

    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
        <span>Status dos Arquivos Necessários</span>
        <button
          onClick={onLoadPrereqs}
          disabled={isLoadingPrereqs}
          className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <RotateCw className={`w-3 h-3 ${isLoadingPrereqs ? 'animate-spin text-primary' : ''}`} />
          <span>Reverificar</span>
        </button>
      </div>

      {prereqs.map((prereq) => {
        const visual = wshUtilsModalPrereqVisual(prereq);
        return (
          <div
            key={prereq.file}
            className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${visual.cardClass}`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs font-mono">{prereq.file}</span>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.2 rounded border ${visual.badgeClass}`}
                >
                  {visual.label}
                </span>
                {prereq.size && (
                  <span className="text-2xs font-mono text-muted-foreground">
                    ({prereq.formattedSize})
                  </span>
                )}
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                {prereq.description}
              </p>
            </div>

            {!prereq.exists && (
              <button
                onClick={onOpenOptFolder}
                className="px-2.5 py-1 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-2xs font-semibold transition cursor-pointer shrink-0"
              >
                Copiar para cá
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
