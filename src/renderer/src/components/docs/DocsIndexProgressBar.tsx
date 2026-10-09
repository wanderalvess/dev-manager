import React from 'react';
import type { DocsIndexProgress } from '../../../../shared/types';

const PHASE_LABELS: Record<DocsIndexProgress['phase'], string> = {
  'loading-model': 'Carregando modelo de IA (pode baixar na primeira vez)...',
  scanning: 'Descobrindo projetos e arquivos de documentação...',
  embedding: 'Processando documentos...',
  saving: 'Salvando índice...',
  done: 'Indexação concluída.'
};

interface DocsIndexProgressBarProps {
  progress: DocsIndexProgress;
}

export const DocsIndexProgressBar: React.FC<DocsIndexProgressBarProps> = ({ progress }) => (
  <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
    <div className="flex items-center justify-between text-2xs text-muted-foreground">
      <span>{PHASE_LABELS[progress.phase]}</span>
      {progress.total > 0 && (
        <span className="font-mono">
          {progress.current}/{progress.total}
        </span>
      )}
    </div>
    {progress.total > 0 && (
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
        />
      </div>
    )}
    {progress.currentFile && (
      <p className="text-2xs text-muted-foreground font-mono truncate">{progress.currentFile}</p>
    )}
  </div>
);
