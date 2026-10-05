import React from 'react';
import { Database, FileSpreadsheet, Grid, ScrollText, ShieldCheck, Zap, Rocket, LucideIcon } from 'lucide-react';
import type { QualityTabMode } from '../../../utils/qualityPageView';

interface QualityPageTabsProps {
  tabMode: QualityTabMode;
  onTabChange: (tab: QualityTabMode) => void;
  itemsCount: number;
  readinessScore: number;
  onNavigate?: (tab: string) => void;
}

interface TabDef {
  id: QualityTabMode;
  label: string;
  icon: LucideIcon;
}

interface TabGroup {
  title: string;
  tabs: TabDef[];
}

// Três grupos pelo ciclo de QA: automatizar, validar e entregar. Só abas com número útil exibem badge.
const TAB_GROUPS: TabGroup[] = [
  {
    title: 'Automação',
    tabs: [
      { id: 'taut', label: 'TAUT (Cypress)', icon: Zap },
      { id: 'runners', label: 'Test Runners', icon: Zap }
    ]
  },
  {
    title: 'Validação',
    tabs: [
      { id: 'matrix', label: 'Matriz', icon: FileSpreadsheet },
      { id: 'regression', label: 'Validador Regressivo', icon: Database }
    ]
  },
  {
    title: 'Entrega',
    tabs: [
      { id: 'readiness', label: 'Prontidão (PO)', icon: ShieldCheck },
      { id: 'roadmap', label: 'Roadmap & Demandas', icon: Rocket }
    ]
  }
];

const INACTIVE_CLASS = 'text-muted-foreground hover:text-foreground hover:bg-muted/60';
const TAB_BASE =
  'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer';

export const QualityPageTabs: React.FC<QualityPageTabsProps> = ({
  tabMode,
  onTabChange,
  itemsCount,
  readinessScore,
  onNavigate
}) => {
  const renderBadge = (id: QualityTabMode, active: boolean): React.ReactNode => {
    if (id === 'matrix') {
      return (
        <span className={`px-1.5 rounded text-2xs font-mono ${active ? 'bg-background/20' : 'bg-muted'}`}>
          {itemsCount}
        </span>
      );
    }
    if (id === 'readiness') {
      const healthy = readinessScore >= 80;
      return (
        <span
          className={`px-1.5 rounded text-2xs font-mono font-semibold ${
            active
              ? 'bg-background/20'
              : healthy
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}
        >
          {readinessScore}%
        </span>
      );
    }
    return null;
  };

  return (
    <div className="border-b border-border bg-card px-6 py-1.5 flex items-center justify-between gap-4 shrink-0">
      <div role="tablist" aria-label="Seções de Qualidade" className="flex items-end gap-3 overflow-x-auto">
        {TAB_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className="flex items-end gap-3">
            {groupIndex > 0 && <span aria-hidden="true" className="self-center h-6 w-px bg-border" />}
            <div className="flex flex-col gap-0.5">
              <span className="px-3 text-2xs uppercase tracking-wider font-bold text-muted-foreground/80">
                {group.title}
              </span>
              <div className="flex items-center gap-1">
                {group.tabs.map(({ id, label, icon: Icon }) => {
                  const active = tabMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onTabChange(id)}
                      className={`${TAB_BASE} ${active ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      {renderBadge(id, active)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Atalhos para Ecossistema de Testes */}
      {onNavigate && (
        <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="text-[11px] font-mono">Atalhos:</span>
          <button
            type="button"
            onClick={() => onNavigate('routines')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Abrir Catálogo de Rotinas"
          >
            <Grid className="w-3 h-3 text-primary" />
            <span>Rotinas</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => onNavigate('database')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Abrir Database Studio para consultar massa de dados"
          >
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Banco</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => onNavigate('logs')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Acompanhar Logs em Tempo Real"
          >
            <ScrollText className="w-3 h-3 text-amber-500" />
            <span>Logs</span>
          </button>
        </div>
      )}
    </div>
  );
};
