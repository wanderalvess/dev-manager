import React from 'react';
import { Database, Globe, Key, Wrench } from 'lucide-react';
import { infrBootstrapModalTabClass, type InfrBootstrapTab } from '../../../utils/infrBootstrapModalUtils';

interface InfrBootstrapTabsProps {
  activeTab: InfrBootstrapTab;
  onSelect: (tab: 'oracle' | 'wta' | 'wsh') => void;
  onOpenScripts: () => void;
}

export const InfrBootstrapTabs: React.FC<InfrBootstrapTabsProps> = ({
  activeTab,
  onSelect,
  onOpenScripts
}) => (
  <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
    <button onClick={() => onSelect('oracle')} className={infrBootstrapModalTabClass(activeTab === 'oracle')}>
      <Database className="w-3.5 h-3.5" />
      <span>1. Setup Oracle XE</span>
    </button>

    <button onClick={() => onSelect('wta')} className={infrBootstrapModalTabClass(activeTab === 'wta')}>
      <Globe className="w-3.5 h-3.5" />
      <span>2. Setup WTA</span>
    </button>

    <button onClick={() => onSelect('wsh')} className={infrBootstrapModalTabClass(activeTab === 'wsh')}>
      <Key className="w-3.5 h-3.5" />
      <span>3. Setup WSH</span>
    </button>

    <button onClick={onOpenScripts} className={infrBootstrapModalTabClass(activeTab === 'scripts')}>
      <Wrench className="w-3.5 h-3.5" />
      <span>Status dos Scripts</span>
    </button>
  </div>
);
