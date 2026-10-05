import React from 'react';
import { History, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { ChangelogVersion } from '../../utils/changelogUtils';
import { WhatsNewVersionDropdown } from './WhatsNewVersionDropdown';

interface WhatsNewHeaderControlsProps {
  dropdownRef: React.RefObject<HTMLDivElement>;
  filteredVersions: ChangelogVersion[];
  selectedVersion: string;
  isAllVersions: boolean;
  isLatestVersion: boolean;
  isDropdownOpen: boolean;
  dropdownSearch: string;
  hasOlderVersion: boolean;
  hasNewerVersion: boolean;
  onGoOlder: () => void;
  onGoNewer: () => void;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
  onSearchChange: (value: string) => void;
  onSelectVersion: (version: string) => void;
}

export const WhatsNewHeaderControls: React.FC<WhatsNewHeaderControlsProps> = ({
  dropdownRef,
  filteredVersions,
  selectedVersion,
  isAllVersions,
  isLatestVersion,
  isDropdownOpen,
  dropdownSearch,
  hasOlderVersion,
  hasNewerVersion,
  onGoOlder,
  onGoNewer,
  onToggleDropdown,
  onCloseDropdown,
  onSearchChange,
  onSelectVersion
}) => (
  <div className="flex items-center gap-1 relative shrink-0" ref={dropdownRef}>
    {/* Botão de versão anterior (mais antiga) */}
    <button
      type="button"
      onClick={onGoOlder}
      disabled={!hasOlderVersion}
      className="p-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
      title="Ver versão anterior mais antiga (Alt + Seta Esquerda)"
    >
      <ChevronLeft className="w-3.5 h-3.5" />
    </button>

    {/* Gatilho do Dropdown de Versões */}
    <button
      type="button"
      onClick={onToggleDropdown}
      className={`px-2.5 py-0.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
        isDropdownOpen
          ? 'bg-primary/15 border-primary text-primary'
          : 'bg-background hover:bg-muted border-border/80 text-foreground'
      }`}
      title="Alternar entre versões lançadas"
    >
      <History className="w-3.5 h-3.5 text-primary" />
      <span className="font-mono">
        {isAllVersions ? 'Todas as Versões' : `v${selectedVersion}`}
      </span>
      {isLatestVersion && (
        <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-bold">
          Atual
        </span>
      )}
      <ChevronDown
        className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
          isDropdownOpen ? 'rotate-180 text-primary' : ''
        }`}
      />
    </button>

    {/* Botão de versão seguinte (mais recente) */}
    <button
      type="button"
      onClick={onGoNewer}
      disabled={!hasNewerVersion}
      className="p-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
      title="Ver versão seguinte mais recente (Alt + Seta Direita)"
    >
      <ChevronRight className="w-3.5 h-3.5" />
    </button>

    {isDropdownOpen && (
      <WhatsNewVersionDropdown
        filteredVersions={filteredVersions}
        selectedVersion={selectedVersion}
        isAllVersions={isAllVersions}
        dropdownSearch={dropdownSearch}
        onSearchChange={onSearchChange}
        onSelectVersion={onSelectVersion}
        onClose={onCloseDropdown}
      />
    )}
  </div>
);
