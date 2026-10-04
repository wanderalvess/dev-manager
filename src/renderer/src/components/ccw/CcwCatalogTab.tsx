import React from 'react';
import { DownloadCloud, ExternalLink, RefreshCw, Search } from 'lucide-react';
import type { CcwCatalogItem } from '../../../../shared/types';

interface CcwCatalogTabProps {
  catalogItems: CcwCatalogItem[];
  filteredCatalog: CcwCatalogItem[];
  isLoadingCatalog: boolean;
  catalogSearch: string;
  onCatalogSearchChange: (v: string) => void;
  catalogMessage: string;
  catalogAuthCookie: string;
  onCatalogAuthCookieChange: (v: string) => void;
  onLoadCatalog: () => void;
  onPickRoutine: (rotina: string) => void;
}

export const CcwCatalogTab: React.FC<CcwCatalogTabProps> = ({
  catalogItems,
  filteredCatalog,
  isLoadingCatalog,
  catalogSearch,
  onCatalogSearchChange,
  catalogMessage,
  catalogAuthCookie,
  onCatalogAuthCookieChange,
  onLoadCatalog,
  onPickRoutine
}) => (
  <div className="space-y-3.5">
    <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <span className="text-xs font-bold text-foreground block">Portal Central de Controle</span>
        <span className="text-[11px] text-muted-foreground block">
          Acesse a árvore de rotinas diretamente no navegador web da PC Informática:
        </span>
      </div>
      <a
        href="https://centraldecontrole.pcinformatica.com.br/#/main-suporte/arvore-rotinas"
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Abrir Portal CCW</span>
      </a>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-foreground">
          Consulta da API da Central de Controle
        </label>
        <button
          type="button"
          onClick={onLoadCatalog}
          disabled={isLoadingCatalog}
          className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-xs font-bold text-foreground flex items-center gap-1 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingCatalog ? 'animate-spin text-primary' : ''}`} />
          <span>Carregar Árvore</span>
        </button>
      </div>

      <input
        type="password"
        placeholder="Cookie de sessão (suukie=...) ou configure nas Configurações"
        value={catalogAuthCookie}
        onChange={(e) => onCatalogAuthCookieChange(e.target.value)}
        className="w-full bg-card border border-border rounded-xl px-3.5 py-1.5 text-xs text-foreground placeholder-muted-foreground font-mono"
      />
    </div>

    {catalogMessage && (
      <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
        {catalogMessage}
      </div>
    )}

    {catalogItems.length > 0 && (
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar rotinas na árvore..."
            value={catalogSearch}
            onChange={(e) => onCatalogSearchChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground font-mono"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-foreground">{item.rotina}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                    {item.moduloDesc}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex gap-2">
                  <span>Corrente: <b>{item.versaoCorrente || 'N/A'}</b></span>
                  {item.versaoNova && <span>Nova: <b>{item.versaoNova}</b></span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPickRoutine(item.rotina)}
                className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <DownloadCloud className="w-3 h-3" />
                <span>Baixar</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
