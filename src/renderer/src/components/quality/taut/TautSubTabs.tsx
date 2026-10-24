import React from 'react';
import { Play, ShieldCheck, FileCode2, Sparkles } from 'lucide-react';
import type { TautCoverageReport } from '../../../../../shared/types';

export type TautSubTab = 'runner' | 'coverage' | 'specs' | 'intake';

interface TautSubTabsProps {
  activeSubTab: TautSubTab;
  onChange: (tab: TautSubTab) => void;
  coverageReport: TautCoverageReport | null;
  specsCount: number;
}

const tabClass = (active: boolean) =>
  `py-3 text-sm transition-colors cursor-pointer flex items-center space-x-1.5 border-b-2 -mb-px ${
    active
      ? 'text-foreground font-medium border-primary'
      : 'text-muted-foreground hover:text-foreground border-transparent'
  }`;

export const TautSubTabs: React.FC<TautSubTabsProps> = ({
  activeSubTab,
  onChange,
  coverageReport,
  specsCount
}) => (
  <div className="flex items-center gap-6 border-b border-border">
    <button type="button" onClick={() => onChange('runner')} className={tabClass(activeSubTab === 'runner')}>
      <Play className="w-3.5 h-3.5" />
      <span>Disparador & Tags</span>
    </button>

    <button type="button" onClick={() => onChange('coverage')} className={tabClass(activeSubTab === 'coverage')}>
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>Cobertura Zephyr Scale</span>
      {coverageReport && (
        <span className="ml-1 px-2 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {coverageReport.coveragePercentage}%
        </span>
      )}
    </button>

    <button type="button" onClick={() => onChange('specs')} className={tabClass(activeSubTab === 'specs')}>
      <FileCode2 className="w-3.5 h-3.5" />
      <span>Catálogo de Specs ({specsCount})</span>
    </button>

    <button type="button" onClick={() => onChange('intake')} className={tabClass(activeSubTab === 'intake')}>
      <Sparkles className="w-3.5 h-3.5" />
      <span>Orquestrador de Intake CSV (IA)</span>
    </button>
  </div>
);
