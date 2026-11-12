import React from 'react';

export const WhatsNewHeaderControls: React.FC<{
  dropdownRef: React.RefObject<HTMLDivElement>;
  filteredVersions: Array<{ version: string; content: string }>;
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
  onSearchChange: (v: string) => void;
  onSelectVersion: (v: string) => void;
}> = ({ selectedVersion, filteredVersions, onSelectVersion }) => (
  <select
    value={selectedVersion}
    onChange={(e) => onSelectVersion(e.target.value)}
    className="px-2 py-1 rounded-lg border border-border bg-card text-xs font-mono text-foreground"
  >
    <option value="all">Todas as versões</option>
    {filteredVersions.map((v) => (
      <option key={v.version} value={v.version}>v{v.version}</option>
    ))}
  </select>
);

export const WhatsNewBanner: React.FC<Record<string, any>> = () => null;
export const WhatsNewFooterButtons: React.FC<Record<string, any>> = () => null;
