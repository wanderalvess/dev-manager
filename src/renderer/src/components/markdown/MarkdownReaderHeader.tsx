import React from 'react';
import { BookOpen, Check, Code, Copy, ExternalLink, FolderOpen, List, Maximize2, Minimize2, X } from 'lucide-react';
import type { MarkdownViewMode } from '../../hooks/markdown/useMarkdownReader';

interface MarkdownReaderHeaderProps {
  title: string;
  filePath: string;
  hideBadge: boolean;
  headerLeftExtra?: React.ReactNode;
  headerCenter?: React.ReactNode;
  viewMode: MarkdownViewMode;
  onViewModeChange: (mode: MarkdownViewMode) => void;
  headingsCount: number;
  isTocOpen: boolean;
  onToggleToc: () => void;
  copiedAll: boolean;
  onCopyAll: () => void;
  onOpenInEditor?: (filePath: string) => void;
  onOpenInFolder?: (filePath: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

const modeButtonClass = (active: boolean) =>
  `px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
    active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
  }`;

export const MarkdownReaderHeader: React.FC<MarkdownReaderHeaderProps> = ({
  title,
  filePath,
  hideBadge,
  headerLeftExtra,
  headerCenter,
  viewMode,
  onViewModeChange,
  headingsCount,
  isTocOpen,
  onToggleToc,
  copiedAll,
  onCopyAll,
  onOpenInEditor,
  onOpenInFolder,
  isFullscreen,
  onToggleFullscreen,
  onClose
}) => (
  <header className="px-5 py-2.5 border-b border-border/80 bg-muted/40 flex items-center justify-between gap-4 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 rounded-2xl bg-primary/10 border border-primary/25 text-primary shrink-0 shadow-xs">
        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm md:text-base font-bold text-foreground truncate tracking-tight">{title}</h3>
          {!hideBadge && (
            <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold uppercase shrink-0">
              Markdown
            </span>
          )}
          {headerLeftExtra}
        </div>
        <p className="text-[11px] text-muted-foreground font-mono truncate max-w-lg" title={filePath}>
          {filePath}
        </p>
      </div>
    </div>

    {headerCenter && (
      <div className="hidden xl:flex items-center justify-center flex-1 px-2 min-w-0">{headerCenter}</div>
    )}

    <div className="flex items-center gap-2 shrink-0">
      {/* Alternância de Modo Formatado / Raw */}
      <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/80 text-xs">
        <button type="button" onClick={() => onViewModeChange('formatted')} className={modeButtonClass(viewMode === 'formatted')}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>Formatado</span>
        </button>
        <button type="button" onClick={() => onViewModeChange('raw')} className={modeButtonClass(viewMode === 'raw')}>
          <Code className="w-3.5 h-3.5" />
          <span>Código Fonte</span>
        </button>
      </div>

      {/* Sumário / Tópicos */}
      {headingsCount > 0 && viewMode === 'formatted' && (
        <button
          type="button"
          onClick={onToggleToc}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            isTocOpen
              ? 'bg-primary/15 border-primary text-primary shadow-xs'
              : 'bg-card border-border hover:bg-muted text-foreground'
          }`}
          title="Sumário de tópicos do documento"
        >
          <List className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tópicos</span>
          <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-mono">{headingsCount}</span>
        </button>
      )}

      {/* Copiar Todo o Conteúdo */}
      <button
        type="button"
        onClick={onCopyAll}
        className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        title="Copiar texto markdown completo"
      >
        {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="hidden sm:inline">{copiedAll ? 'Copiado!' : 'Copiar'}</span>
      </button>

      {/* Ações de Abertura Externa */}
      {onOpenInEditor && (
        <button
          type="button"
          onClick={() => onOpenInEditor(filePath)}
          className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
          title="Abrir no editor de código configurado"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}

      {onOpenInFolder && (
        <button
          type="button"
          onClick={() => onOpenInFolder(filePath)}
          className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
          title="Revelar no Windows Explorer"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleFullscreen}
        className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
        title={isFullscreen ? 'Reduzir janela' : 'Modo tela cheia'}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="p-2 rounded-xl hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        title="Fechar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </header>
);
