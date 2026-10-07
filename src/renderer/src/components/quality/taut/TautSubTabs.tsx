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
  `px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
    active
      ? 'bg-primary text-primary-foreground shadow-2xs'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
  }`;

export const TautSubTabs: React.FC<TautSubTabsProps> = ({
  activeSubTab,
  onChange,
  coverageReport,
  specsCount
}) => (
  <div className="flex items-center space-x-1.5 border-b border-border/70 pb-1">
    <button type="button" onClick={() => onChange('runner')} className={tabClass(activeSubTab === 'runner')}>
      <Play className="w-3.5 h-3.5" />
      <span>Disparador & Tags</span>
    </button>

    <button type="button" onClick={() => onChange('coverage')} className={tabClass(activeSubTab === 'coverage')}>
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>Cobertura Zephyr Scale</span>
      {coverageReport && (
        <span className="ml-1 px-1.5 py-0.2 rounded text-2xs font-mono font-bold bg-primary-foreground/20">
          {coverageReport.coveragePercentage}%
        </span>
      )}
    </button>

    <button type="button" onClick={() => onChange('specs')} className={tabClass(activeSubTab === 'specs')}>
      <FileCode2 className="w-3.5 h-3.5" />
      <span>Catálogo de Specs ({specsCount})</span>
    </button>

    <button type="button" onClick={() => onChange('intake')} className={tabClass(activeSubTab === 'intake')}>
      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      <span>Orquestrador de Intake CSV (IA)</span>
    </button>
  </div>
);
