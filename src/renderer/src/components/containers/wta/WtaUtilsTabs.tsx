import React from 'react';
import { ExternalLink, HardDrive, Terminal } from 'lucide-react';
import { wtaUtilsModalTabClass, type WtaUtilsTab } from '../../../utils/wtaUtilsModalUtils';

interface WtaUtilsTabsProps {
  activeTab: WtaUtilsTab;
  onSelect: (tab: WtaUtilsTab) => void;
}

export const WtaUtilsTabs: React.FC<WtaUtilsTabsProps> = ({ activeTab, onSelect }) => (
  <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
    <button onClick={() => onSelect('access')} className={wtaUtilsModalTabClass(activeTab === 'access')}>
      <ExternalLink className="w-3.5 h-3.5" />
      <span>Portais & Acesso Rápido</span>
    </button>

    <button onClick={() => onSelect('karaf')} className={wtaUtilsModalTabClass(activeTab === 'karaf')}>
      <Terminal className="w-3.5 h-3.5" />
      <span>Console Karaf & Portas</span>
    </button>

    <button onClick={() => onSelect('dev')} className={wtaUtilsModalTabClass(activeTab === 'dev')}>
      <HardDrive className="w-3.5 h-3.5" />
      <span>Modo Desenvolvedor (~/.m2)</span>
    </button>
  </div>
);
