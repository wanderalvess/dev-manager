import React from 'react';
import { Search } from 'lucide-react';

export const QuickLauncherSearchBar: React.FC<{
  search: string;
  onSearchChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}> = ({ search, onSearchChange, inputRef }) => (
  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card">
    <Search className="w-4 h-4 text-primary shrink-0" />
    <input
      ref={inputRef}
      type="text"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Ir para módulo, ação ou repositório..."
      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
    />
    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-2xs font-mono text-muted-foreground">ESC</kbd>
  </div>
);
