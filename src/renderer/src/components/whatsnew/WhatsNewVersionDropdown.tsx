import React from 'react';
import { Check, Layers, Search, Tag } from 'lucide-react';
import type { ChangelogVersion } from '../../utils/changelogUtils';

interface WhatsNewVersionDropdownProps {
  filteredVersions: ChangelogVersion[];
  selectedVersion: string;
  isAllVersions: boolean;
  dropdownSearch: string;
  onSearchChange: (value: string) => void;
  onSelectVersion: (version: string) => void;
  onClose: () => void;
}

export const WhatsNewVersionDropdown: React.FC<WhatsNewVersionDropdownProps> = ({
  filteredVersions,
  selectedVersion,
  isAllVersions,
  dropdownSearch,
  onSearchChange,
  onSelectVersion,
  onClose
}) => (
  <div className="absolute top-full mt-1.5 left-0 w-72 bg-card border border-border/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col">
    {/* Campo de Busca Rápida no Dropdown */}
    <div className="relative mb-1.5">
      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar versão (ex: 1.22)..."
        value={dropdownSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-muted/50 border border-border/80 rounded-xl pl-7 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        autoFocus
      />
    </div>

    {/* Opção Rápida: Ver Histórico Completo */}
    <button
      type="button"
      onClick={() => {
        onSelectVersion('all');
        onClose();
      }}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
        isAllVersions
          ? 'bg-primary text-primary-foreground font-bold'
          : 'hover:bg-muted text-foreground'
      }`}
    >
      <div className="flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span>Ver Histórico Completo</span>
      </div>
      {isAllVersions && <Check className="w-3.5 h-3.5" />}
    </button>

    <div className="my-1 border-t border-border/60" />

    {/* Lista de Versões */}
    <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs pr-1">
      {filteredVersions.length === 0 ? (
        <div className="py-4 text-center text-muted-foreground text-xs">
          Nenhuma versão encontrada
        </div>
      ) : (
        filteredVersions.map((v, idx) => {
          const isSelected = selectedVersion === v.version;
          const isLatest = idx === 0;

          return (
            <button
              key={v.version}
              type="button"
              onClick={() => {
                onSelectVersion(v.version);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3 h-3 shrink-0 opacity-70" />
                <span className="font-mono font-bold truncate">v{v.version}</span>
                {v.date && (
                  <span
                    className={`text-2xs font-mono truncate ${
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {v.date}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isLatest && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-2xs font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Atual
                  </span>
                )}
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>
);
