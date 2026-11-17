import React from 'react';
import { List } from 'lucide-react';
import type { HeadingItem } from '../../utils/markdownReaderToc';

interface MarkdownTocDrawerProps {
  headings: HeadingItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const MarkdownTocDrawer: React.FC<MarkdownTocDrawerProps> = ({ headings, onSelect, onClose }) => (
  <aside className="w-64 md:w-72 border-r border-border/80 bg-muted/40 flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-200">
    <div className="p-3 border-b border-border/60 flex items-center justify-between">
      <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-2xs">
        <List className="w-3.5 h-3.5 text-primary" />
        Sumário de Seções
      </span>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-lg hover:bg-muted"
      >
        ✕
      </button>
    </div>
    <div className="p-3 overflow-y-auto space-y-1 flex-1 text-xs">
      {headings.map((h, hIdx) => (
        <button
          key={hIdx}
          type="button"
          onClick={() => onSelect(h.id)}
          style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
          className="w-full text-left py-1.5 pr-2 rounded-lg hover:bg-primary/10 hover:text-primary text-foreground/80 transition-colors font-medium truncate cursor-pointer block"
          title={h.text}
        >
          {h.text}
        </button>
      ))}
    </div>
  </aside>
);
