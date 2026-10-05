import React from 'react';
import { FolderOpen, Globe, Sparkles } from 'lucide-react';
import type { LlmProviderConfig } from '../../../../shared/types';

export type DocSettingsTab = 'folders' | 'sources' | 'llm';

interface DocSettingsTabsProps {
  activeTab: DocSettingsTab;
  onChange: (tab: DocSettingsTab) => void;
  foldersCount: number;
  sourcesCount: number;
  activeProvider?: LlmProviderConfig;
}

const BASE_TAB = 'px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer';
const COUNT_BADGE = 'text-2xs font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-semibold';

const tabClass = (active: boolean, activeBorder: string) =>
  `${BASE_TAB} ${
    active
      ? `${activeBorder} text-foreground bg-card shadow-xs`
      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/40'
  }`;

export const DocSettingsTabs: React.FC<DocSettingsTabsProps> = ({
  activeTab,
  onChange,
  foldersCount,
  sourcesCount,
  activeProvider
}) => (
  <div className="flex border-b border-border bg-muted/20 px-5 pt-2.5 gap-2 shrink-0 overflow-x-auto">
    <button type="button" onClick={() => onChange('folders')} className={tabClass(activeTab === 'folders', 'border-amber-500')}>
      <FolderOpen className={`w-3.5 h-3.5 ${activeTab === 'folders' ? 'text-amber-500' : 'text-muted-foreground'}`} />
      <span>Pastas Locais & Git</span>
      <span className={COUNT_BADGE}>{foldersCount}</span>
    </button>

    <button type="button" onClick={() => onChange('sources')} className={tabClass(activeTab === 'sources', 'border-sky-500')}>
      <Globe className={`w-3.5 h-3.5 ${activeTab === 'sources' ? 'text-sky-500' : 'text-muted-foreground'}`} />
      <span>Confluence & Jira</span>
      <span className={COUNT_BADGE}>{sourcesCount}</span>
    </button>

    <button type="button" onClick={() => onChange('llm')} className={tabClass(activeTab === 'llm', 'border-primary')}>
      <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'llm' ? 'text-primary' : 'text-muted-foreground'}`} />
      <span>Assistente IA / LLM</span>
      {activeProvider && activeProvider.enabled && (
        <span className="flex items-center gap-1 text-2xs font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeProvider.model}</span>
        </span>
      )}
    </button>
  </div>
);
