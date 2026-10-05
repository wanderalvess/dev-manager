import React from 'react';
import { Cpu, Download } from 'lucide-react';
import type { DocsIndexStatus } from '../../../../shared/types';

interface DocSettingsEmbeddingCardProps {
  status?: DocsIndexStatus | null;
  onOpenModelHelp?: () => void;
}

export const DocSettingsEmbeddingCard: React.FC<DocSettingsEmbeddingCardProps> = ({ status, onOpenModelHelp }) => (
  <div className="p-3.5 rounded-xl border border-border/90 bg-muted/25 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
        <Cpu className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-foreground">Motor de Vetorização Local (Embeddings)</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25 font-bold">
            FastEmbed AllMiniLML6V2 (384d)
          </span>
          {status && (
            <span
              className={`text-2xs font-mono px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                !status.isTextOnly
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  !status.isTextOnly ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{!status.isTextOnly ? 'Neural Ativo' : 'Modo Textual'}</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          Executado <strong>100% localmente</strong> no seu computador via ONNX. Acionado pelo botão <strong>Reindexar</strong> ou pelo <strong>Watchdog</strong>.
        </p>
      </div>
    </div>
    {onOpenModelHelp && (
      <button
        type="button"
        onClick={onOpenModelHelp}
        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-auto sm:ml-0"
        title="Instruções para download e instalação manual offline do modelo em redes corporativas"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalação offline</span>
      </button>
    )}
  </div>
);
