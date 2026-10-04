import React from 'react';
import { DownloadCloud, FileUp, Globe, RotateCcw, Layers } from 'lucide-react';
import type { CcwModalTab } from '../../utils/ccwModalUtils';

interface CcwModalTabsProps {
  activeTab: CcwModalTab;
  onSelect: (tab: CcwModalTab) => void;
}

const TABS: {
  id: CcwModalTab;
  label: React.ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
  activeIconClass: string;
}[] = [
  { id: 'download', label: 'Download CCW', Icon: DownloadCloud, activeIconClass: 'text-primary' },
  { id: 'file', label: 'Arquivo Local', Icon: FileUp, activeIconClass: 'text-primary' },
  { id: 'catalog', label: 'Árvore CCW', Icon: Globe, activeIconClass: 'text-primary' },
  { id: 'rollback', label: 'Histórico & Rollback', Icon: RotateCcw, activeIconClass: 'text-amber-500' },
  { id: 'batch', label: 'Atualização em Lote', Icon: Layers, activeIconClass: 'text-primary' }
];

/** Dock de abas - Segmented Console Switch. */
export const CcwModalTabs: React.FC<CcwModalTabsProps> = ({ activeTab, onSelect }) => (
  <div className="px-4 pt-2.5 pb-2 bg-muted/20 border-b border-border/80 shrink-0">
    <div className="bg-background/80 p-0.5 rounded-lg border border-border/70 flex items-center gap-1 overflow-x-auto shadow-inner">
      {TABS.map(({ id, label, Icon, activeIconClass }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === id
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
          }`}
        >
          <Icon className={`w-3.5 h-3.5 ${activeTab === id ? activeIconClass : 'text-muted-foreground'}`} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  </div>
);
