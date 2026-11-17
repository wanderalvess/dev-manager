import React from 'react';
import { Search, X } from 'lucide-react';
import { AppLogo } from '../AppLogo';

interface QuickLauncherSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** Campo de busca do launcher, com botão de limpar e dica de fechamento. */
export const QuickLauncherSearchBar: React.FC<QuickLauncherSearchBarProps> = ({
  search,
  onSearchChange,
  inputRef
}) => (
  <div className="p-4 border-b border-border/80 flex items-center space-x-3 bg-muted/30">
    <AppLogo size="xs" />
    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
    <input
      ref={inputRef}
      type="text"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Digite o número da rotina, nome do projeto ou ação..."
      className="w-full bg-transparent text-sm text-foreground font-sans placeholder:text-muted-foreground focus:outline-hidden"
    />
    {search && (
      <button
        onClick={() => onSearchChange('')}
        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    )}
    <span className="text-2xs bg-muted px-2 py-1 rounded border border-border/60 text-muted-foreground font-mono">
      ESC para fechar
    </span>
  </div>
);
