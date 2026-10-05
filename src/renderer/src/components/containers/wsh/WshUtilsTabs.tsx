import React from 'react';
import { Activity, FolderOpen, Key } from 'lucide-react';
import { wshUtilsModalTabClass, type WshUtilsTab } from '../../../utils/wshUtilsModalUtils';

interface WshUtilsTabsProps {
  activeTab: WshUtilsTab;
  onSelect: (tab: 'md5' | 'rotina2650') => void;
  onOpenFiles: () => void;
}

export const WshUtilsTabs: React.FC<WshUtilsTabsProps> = ({ activeTab, onSelect, onOpenFiles }) => (
  <div className="flex items-center px-5 pt-2 border-b border-border/80 bg-muted/10 gap-2">
    <button onClick={() => onSelect('md5')} className={wshUtilsModalTabClass(activeTab === 'md5')}>
      <Key className="w-3.5 h-3.5" />
      <span>Gerador de Senha MD5</span>
    </button>

    <button onClick={onOpenFiles} className={wshUtilsModalTabClass(activeTab === 'files')}>
      <FolderOpen className="w-3.5 h-3.5" />
      <span>Arquivos em /opt WSL</span>
    </button>

    <button onClick={() => onSelect('rotina2650')} className={wshUtilsModalTabClass(activeTab === 'rotina2650')}>
      <Activity className="w-3.5 h-3.5" />
      <span>Guia da Rotina 2650</span>
    </button>
  </div>
);
