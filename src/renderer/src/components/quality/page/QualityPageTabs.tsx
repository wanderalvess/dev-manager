import React from 'react';
import { Database, FileSpreadsheet, Grid, ScrollText, ShieldCheck, LucideIcon } from 'lucide-react';
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

const TABS: TabDef[] = [
  { id: 'matrix', label: 'Matriz', icon: FileSpreadsheet },
  { id: 'readiness', label: 'Prontidão (PO)', icon: ShieldCheck }
];

const INACTIVE_CLASS = 'text-muted-foreground hover:text-foreground border-transparent';
const TAB_BASE =
  'py-3 text-sm whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer border-b-2 -mb-px';

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
        <span className={`px-2 rounded-full text-xs font-medium ${active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
          {itemsCount}
        </span>
      );
    }
    if (id === 'readiness') {
      const healthy = readinessScore >= 80;
      return (
        <span
          className={`px-2 rounded-full text-xs font-medium ${
            healthy ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}
        >
          {readinessScore}%
        </span>
      );
    }
    return null;
  };

  return (
    <div className="border-b border-border bg-card px-7 flex items-center justify-between gap-4 shrink-0">
      <div role="tablist" aria-label="Seções de Homologação" className="flex items-center gap-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tabMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`${TAB_BASE} ${active ? 'text-foreground font-medium border-primary' : INACTIVE_CLASS}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {renderBadge(id, active)}
            </button>
          );
        })}
      </div>

      {/* Atalhos para Ecossistema de Testes */}
      {onNavigate && (
        <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="text-[13px]">Atalhos</span>
          <button
            type="button"
            onClick={() => onNavigate('routines')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Abrir Catálogo de Rotinas"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Rotinas</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => onNavigate('database')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Abrir Database Studio para consultar massa de dados"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Banco</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => onNavigate('logs')}
            className="hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Acompanhar Logs em Tempo Real"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Logs</span>
          </button>
        </div>
      )}
    </div>
  );
};
