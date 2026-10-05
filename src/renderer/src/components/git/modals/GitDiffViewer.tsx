import React from 'react';
import { RefreshCw, AlertCircle, FileCode } from 'lucide-react';
import { classifyDiffLine, MAX_RENDERED_DIFF_LINES } from '../../../utils/gitViewUtils';

interface GitDiffViewerProps {
  isLoading: boolean;
  error: string | null;
  diffText: string;
  lines: string[];
  hiddenCount: number;
}

/** Visualizador de diff com coloração por tipo de linha e calha de numeração. */
export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({ isLoading, error, diffText, lines, hiddenCount }) => (
  <div className="flex-1 bg-background flex flex-col min-h-0 overflow-hidden">
    {isLoading ? (
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span className="font-mono">Carregando diff do Git...</span>
      </div>
    ) : error ? (
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-rose-500 p-6 space-y-2 text-center">
        <AlertCircle className="w-6 h-6 opacity-70" />
        <p className="font-semibold text-foreground">Erro ao carregar diff</p>
        <p className="font-mono text-muted-foreground">{error}</p>
      </div>
    ) : !diffText || diffText.trim() === '' ? (
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-1.5">
        <FileCode className="w-6 h-6 opacity-30" />
        <p>Nenhuma alteração detectada para este arquivo.</p>
      </div>
    ) : (
      <div className="flex-1 overflow-auto font-mono text-[12px] leading-5 select-text">
        {hiddenCount > 0 && (
          <div className="m-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-sans text-xs">
            Diff extenso: exibindo as primeiras {MAX_RENDERED_DIFF_LINES} linhas ({hiddenCount} ocultas).
            Selecione um arquivo na lista ou use "Copiar Diff" para obter o conteúdo completo.
          </div>
        )}
        <div className="min-w-full divide-y divide-border/20">
          {lines.map((line, idx) => {
            const { rowClass, gutterClass } = classifyDiffLine(line);
            return (
              <div key={idx} className={`flex items-start ${rowClass} ${gutterClass} px-2 py-0.2`}>
                <span className="w-10 shrink-0 text-right pr-3 select-none text-[11px] text-muted-foreground/40 font-mono">
                  {idx + 1}
                </span>
                <span className="whitespace-pre overflow-x-auto flex-1 font-mono">{line || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
