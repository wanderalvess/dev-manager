import React from 'react';
import { Search, X, HelpCircle } from 'lucide-react';

interface HelpPageHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}

/** Topo da Central de Ajuda com a busca rápida integrada. */
export const HelpPageHeader: React.FC<HelpPageHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch
}) => (
  <div className="cockpit-panel rounded-xl p-3 sm:p-4 shadow-xl border border-border flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
    <div className="flex items-center space-x-3 min-w-0">
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
            Central de Ajuda &amp; Documentação
          </h1>
          <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
            PORTA DE ENTRADA
          </span>
        </div>
        <p className="text-2xs text-muted-foreground truncate">
          Hub operacional: orientações de uso, fluxo diário, atalhos de teclado, FAQs e diagnósticos técnicos
        </p>
      </div>
    </div>

    {/* Busca Rápida Integrada */}
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-80">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar ajuda, comandos, FAQ, portas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-card/70 border border-border hover:border-primary/40 focus:border-primary rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-hidden transition-all font-sans shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Limpar busca" aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  </div>
);
