import React from 'react';
import { Table, Clock, Zap, CheckCircle2, AlertCircle, Radio } from 'lucide-react';
import type { QueryResult } from '../../../../shared/types';
import type { ResultTab } from '../../utils/dbPageTypes';
import type { ExportFormat } from '../../utils/databaseExportUtils';
import { ExportMenu } from './ExportMenu';

interface DatabaseResultsHeaderProps {
  activeTab: ResultTab;
  onChangeTab: (tab: ResultTab) => void;
  historyCount: number;
  isExecuting: boolean;
  queryResult: QueryResult | null;
  onExport: (format: ExportFormat) => void;
}

/** Barra de status com as abas de resultado e as estatísticas da última execução. */
export const DatabaseResultsHeader: React.FC<DatabaseResultsHeaderProps> = ({
  activeTab,
  onChangeTab,
  historyCount,
  isExecuting,
  queryResult,
  onExport
}) => (
  <div className="px-3 py-1.5 bg-card/60 border-b border-border/70 flex items-center justify-between shrink-0">
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onChangeTab('grid')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
          activeTab === 'grid'
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Table className="w-3 h-3" />
        <span>Resultado</span>
      </button>
      <button
        type="button"
        onClick={() => onChangeTab('explain')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
          activeTab === 'explain'
            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Zap className="w-3 h-3" />
        <span>Explain Plan</span>
      </button>
      <button
        type="button"
        onClick={() => onChangeTab('tracer')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
          activeTab === 'tracer'
            ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Radio className="w-3 h-3" />
        <span>Statement Tracer</span>
      </button>
      <button
        onClick={() => onChangeTab('history')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
          activeTab === 'history'
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Clock className="w-3 h-3" />
        <span>Histórico ({historyCount})</span>
      </button>
    </div>

    {/* Estatísticas do Resultado */}
    {isExecuting ? (
      <div className="flex items-center space-x-2 text-xs text-primary font-medium animate-pulse">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span>Executando consulta...</span>
      </div>
    ) : queryResult && (
      <div className="flex items-center space-x-3 text-xs">
        {queryResult.success ? (
          <>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {queryResult.isQuery
                ? `${queryResult.rowCount} linha(s)`
                : `${queryResult.affectedRows ?? 0} linha(s) afetada(s)`}
            </span>
            <span className="text-muted-foreground font-mono">
              {queryResult.executionTimeMs} ms
            </span>
            {queryResult.isQuery && queryResult.truncated && (
              <span
                className="text-amber-500 font-semibold"
                title="O banco tem mais linhas do que o limite configurado. Aumente o limite ou refine a consulta."
              >
                Limite atingido: há mais linhas
              </span>
            )}
            {queryResult.isQuery && queryResult.rows && queryResult.rows.length > 0 && (
              <ExportMenu onExport={onExport} />
            )}
          </>
        ) : (
          <span className="text-red-400 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> Erro na execução
          </span>
        )}
      </div>
    )}
  </div>
);
