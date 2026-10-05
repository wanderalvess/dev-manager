import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  hasWinthorCandidates,
  type CleanContainer,
  type SaveEnvironmentPreset
} from '../../../utils/saveEnvironmentUtils';

interface SaveEnvironmentPresetsProps {
  cleanContainers: CleanContainer[];
  selectedCount: number;
  onApplyPreset: (preset: SaveEnvironmentPreset) => void;
}

export const SaveEnvironmentPresets: React.FC<SaveEnvironmentPresetsProps> = ({
  cleanContainers,
  selectedCount,
  onApplyPreset
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold text-muted-foreground mr-1">Atalhos:</span>
      <button
        type="button"
        onClick={() => onApplyPreset('all')}
        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-muted/60 hover:bg-muted text-foreground border border-border/70 transition cursor-pointer"
      >
        Todos ({cleanContainers.length})
      </button>
      <button
        type="button"
        onClick={() => onApplyPreset('running')}
        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
      >
        Apenas Rodando ({cleanContainers.filter((c) => c.state === 'running').length})
      </button>
      {hasWinthorCandidates(cleanContainers) && (
        <button
          type="button"
          onClick={() => onApplyPreset('winthor')}
          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition cursor-pointer flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          <span>WinThor Stack</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onApplyPreset('clear')}
        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-muted/40 hover:bg-muted text-muted-foreground transition cursor-pointer"
      >
        Limpar
      </button>
    </div>

    {/* Contador Selecionados */}
    <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
      {selectedCount} de {cleanContainers.length} selecionados
    </span>
  </div>
);
