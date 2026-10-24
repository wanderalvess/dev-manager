import React from 'react';
import { Search, X } from 'lucide-react';

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
  <div className="flex flex-wrap items-end justify-between gap-4 shrink-0">
    <div className="flex items-center space-x-3 min-w-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[26px] leading-tight font-semibold text-foreground tracking-tight">
            Central de Ajuda &amp; Documentação
          </h1>
          <span className="text-[13px] bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
            Porta de entrada
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Hub operacional: orientações de uso, fluxo diário, atalhos de teclado, FAQs e diagnósticos técnicos
        </p>
      </div>
    </div>

    {/* Busca Rápida Integrada */}
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar ajuda, comandos, FAQ, portas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 bg-card border border-input rounded-[10px] pl-9 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Limpar busca" aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  </div>
);
