import React from 'react';
import { Clock, Database, Search } from 'lucide-react';
import type { MarkdownFontSize, MarkdownViewMode } from '../../hooks/markdown/useMarkdownReader';
import type { ReadingStats } from '../../utils/markdownReaderToc';

interface MarkdownReaderToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: MarkdownViewMode;
  fontSizeLevel: MarkdownFontSize;
  onFontSizeChange: (level: MarkdownFontSize) => void;
  stats: ReadingStats;
}

const FONT_OPTIONS: { level: MarkdownFontSize; label: string; title: string }[] = [
  { level: 'sm', label: 'A-', title: 'Fonte compacta' },
  { level: 'base', label: 'A', title: 'Fonte normal' },
  { level: 'lg', label: 'A+', title: 'Fonte confortável' }
];

export const MarkdownReaderToolbar: React.FC<MarkdownReaderToolbarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  fontSizeLevel,
  onFontSizeChange,
  stats
}) => (
  <div className="px-5 py-1.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
    <div className="flex items-center gap-4">
      {/* Campo de Busca Rápida no Documento */}
      <div className="relative w-56 sm:w-72">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar palavras no documento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-background border border-border/80 rounded-xl pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-2xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Controles de Zoom de Fonte */}
      {viewMode === 'formatted' && (
        <div className="flex items-center gap-1 bg-background border border-border/80 rounded-xl px-1.5 py-0.5">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.level}
              type="button"
              onClick={() => onFontSizeChange(opt.level)}
              className={`px-2 py-0.5 rounded-lg text-2xs font-bold transition ${
                fontSizeLevel === opt.level ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={opt.title}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Badges de Metadados de Leitura Humana */}
    <div className="flex items-center gap-3 text-2xs text-muted-foreground font-medium">
      <span className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span>~{stats.readTimeMinutes} min de leitura</span>
      </span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>{stats.words} palavras</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span className="flex items-center gap-1">
        <Database className="w-3.5 h-3.5" />
        <span>{stats.kb} KB</span>
      </span>
    </div>
  </div>
);
