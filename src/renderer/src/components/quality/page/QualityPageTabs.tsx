import React from 'react';
import { Database, FileSpreadsheet, Grid, ScrollText, ShieldCheck, Zap } from 'lucide-react';
import type { QualityTabMode } from '../../../utils/qualityPageView';

interface QualityPageTabsProps {
  tabMode: QualityTabMode;
  onTabChange: (tab: QualityTabMode) => void;
  itemsCount: number;
  readinessScore: number;
  onNavigate?: (tab: string) => void;
}

const INACTIVE_CLASS = 'text-muted-foreground hover:text-foreground hover:bg-muted/60';
const TAB_BASE =
  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer';

export const QualityPageTabs: React.FC<QualityPageTabsProps> = ({
  tabMode,
  onTabChange,
  itemsCount,
  readinessScore,
  onNavigate
}) => (
  <div className="border-b border-border bg-card px-6 py-1.5 flex items-center justify-between shrink-0">
    <div className="flex items-center space-x-1">
      <button
        type="button"
        onClick={() => onTabChange('taut')}
        className={`${TAB_BASE} ${
          tabMode === 'taut' ? 'bg-primary text-primary-foreground shadow-xs' : INACTIVE_CLASS
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span>Automação TAUT (Cypress)</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
          QA Hub
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('matrix')}
        className={`${TAB_BASE} ${
          tabMode === 'matrix' ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS
        }`}
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>Matriz de Validação</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] bg-background/20 font-mono">
          {itemsCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('runners')}
        className={`${TAB_BASE} ${
          tabMode === 'runners' ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS
        }`}
      >
        <Zap className="w-3.5 h-3.5" />
        <span>Test Runners</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground">
          Automação
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('regression')}
        className={`${TAB_BASE} ${
          tabMode === 'regression' ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span>Validador Regressivo</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
          Oracle QA
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('readiness')}
        className={`${TAB_BASE} ${
          tabMode === 'readiness' ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Painel de Prontidão (PO)</span>
        <span
          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            readinessScore >= 80
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'bg-amber-500/15 text-amber-500 font-semibold'
          }`}
        >
          {readinessScore}%
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('roadmap')}
        className={`${TAB_BASE} ${
          tabMode === 'roadmap' ? 'bg-primary text-primary-foreground' : INACTIVE_CLASS
        }`}
      >
        <Grid className="w-3.5 h-3.5" />
        <span>Roadmap &amp; Demandas</span>
      </button>
    </div>

    {/* Atalhos para Ecossistema de Testes */}
    <div className="hidden lg:flex items-center space-x-2 text-xs text-muted-foreground">
      <span className="text-[11px] font-mono text-muted-foreground">Atalhos:</span>
      {onNavigate && (
        <>
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
        </>
      )}
    </div>
  </div>
);
