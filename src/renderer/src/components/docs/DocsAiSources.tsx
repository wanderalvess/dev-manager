import React from 'react';
import { FileText, Layers } from 'lucide-react';

interface DocsAiSourcesProps {
  sources: Array<{ title: string; path: string; score: number }>;
  onOpenPreview: (filePath: string, title: string) => void;
}

export const DocsAiSources: React.FC<DocsAiSourcesProps> = ({ sources, onOpenPreview }) => (
  <div className="space-y-2 pt-2 border-t border-border/60">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-primary" />
        Fontes & Referências Utilizadas na Síntese ({sources.length}):
      </span>
      <span className="text-[10px] text-muted-foreground">
        Clique para abrir a leitura do documento
      </span>
    </div>
    <div className="flex flex-wrap gap-2">
      {sources.map((source, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onOpenPreview(source.path, source.title)}
          className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 text-xs font-mono flex items-center gap-2 transition cursor-pointer shadow-2xs group"
          title={`Abrir prévia de ${source.title}`}
        >
          <FileText className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
          <span className="max-w-[260px] truncate font-medium">{source.title}</span>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-mono shrink-0">
            {(source.score * 100).toFixed(0)}%
          </span>
        </button>
      ))}
    </div>
  </div>
);
