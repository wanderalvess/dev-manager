import React from 'react';
import { Copy, Check, Maximize2, Minimize2, X, ListTree } from 'lucide-react';

export const MarkdownReaderHeader: React.FC<{
  title: string;
  filePath: string;
  hideBadge?: boolean;
  headerLeftExtra?: React.ReactNode;
  headerCenter?: React.ReactNode;
  viewMode: 'formatted' | 'raw';
  onViewModeChange: (m: 'formatted' | 'raw') => void;
  headingsCount: number;
  isTocOpen: boolean;
  onToggleToc: () => void;
  copiedAll: boolean;
  onCopyAll: () => void;
  onOpenInEditor?: (fp: string) => void;
  onOpenInFolder?: (fp: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}> = ({
  title,
  filePath,
  headerLeftExtra,
  headerCenter,
  viewMode,
  onViewModeChange,
  headingsCount,
  onToggleToc,
  copiedAll,
  onCopyAll,
  isFullscreen,
  onToggleFullscreen,
  onClose
}) => (
  <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 bg-muted/30 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
        <p className="text-2xs font-mono text-muted-foreground truncate">{filePath}</p>
      </div>
      {headerLeftExtra}
    </div>
    {headerCenter}
    <div className="flex items-center gap-1.5 shrink-0">
      {headingsCount > 0 && (
        <button type="button" onClick={onToggleToc} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer" title="Tópicos">
          <ListTree className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onViewModeChange(viewMode === 'formatted' ? 'raw' : 'formatted')}
        className="px-2.5 py-1 rounded-lg border border-border text-2xs font-semibold hover:bg-muted cursor-pointer"
      >
        {viewMode === 'formatted' ? 'Raw' : 'Formatado'}
      </button>
      <button type="button" onClick={onCopyAll} className="p-1.5 rounded-lg border border-border hover:bg-muted cursor-pointer" title="Copiar tudo">
        {copiedAll ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
      <button type="button" onClick={onToggleFullscreen} className="p-1.5 rounded-lg border border-border hover:bg-muted cursor-pointer">
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
      <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const MarkdownReaderToolbar: React.FC<{
  searchTerm: string;
  onSearchChange: (v: string) => void;
  viewMode: 'formatted' | 'raw';
  fontSizeLevel: 'sm' | 'base' | 'lg';
  onFontSizeChange: (l: 'sm' | 'base' | 'lg') => void;
  stats: { lines: number; words: number };
}> = ({ searchTerm, onSearchChange, fontSizeLevel, onFontSizeChange, stats }) => (
  <div className="px-5 py-2 border-b border-border/60 flex items-center justify-between gap-3 text-2xs bg-card shrink-0">
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Buscar no documento..."
      className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs w-64 focus:outline-none focus:border-primary"
    />
    <div className="flex items-center gap-3 text-muted-foreground">
      <span>{stats.lines} linhas • {stats.words} palavras</span>
      <div className="flex items-center gap-1">
        {(['sm', 'base', 'lg'] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onFontSizeChange(lvl)}
            className={`px-2 py-0.5 rounded cursor-pointer ${fontSizeLevel === lvl ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}
          >
            {lvl.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const MarkdownTocDrawer: React.FC<{
  headings: Array<{ id: string; text: string; level: number }>;
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ headings, onSelect }) => (
  <aside className="w-56 border-r border-border p-3 overflow-y-auto bg-muted/20 space-y-1 shrink-0">
    <div className="text-2xs font-bold text-muted-foreground uppercase mb-2">Sumário</div>
    {headings.map((h) => (
      <button
        key={h.id}
        type="button"
        onClick={() => onSelect(h.id)}
        className="w-full text-left text-xs py-1 px-2 rounded hover:bg-muted truncate cursor-pointer text-foreground"
        style={{ paddingLeft: `${(h.level - 1) * 10 + 8}px` }}
      >
        {h.text}
      </button>
    ))}
  </aside>
);

export const MarkdownBlocks: React.FC<{
  blocks: Array<{ type: string; text: string; id?: string }>;
  searchTerm: string;
  copiedCodeIndex: number | null;
  onCopyCode: (idx: number, code: string) => void;
}> = ({ blocks }) => (
  <div className="space-y-3 leading-relaxed">
    {blocks.map((b, idx) => {
      if (b.type === 'h1') return <h1 key={idx} id={b.id} className="text-xl font-extrabold text-foreground pt-2">{b.text}</h1>;
      if (b.type === 'h2') return <h2 key={idx} id={b.id} className="text-base font-bold text-foreground pt-3 border-b border-border/50 pb-1">{b.text}</h2>;
      if (b.type === 'h3') return <h3 key={idx} id={b.id} className="text-sm font-bold text-primary pt-2">{b.text}</h3>;
      if (b.type === 'code') return <pre key={idx} className="p-3 rounded-xl bg-muted/60 border border-border font-mono text-xs overflow-x-auto">{b.text}</pre>;
      return <p key={idx} className="text-xs text-foreground/90 whitespace-pre-wrap">{b.text}</p>;
    })}
  </div>
);
