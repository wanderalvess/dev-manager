import React from 'react';
import { Radio, AlertCircle } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStatementTracer } from '../../hooks/database/useStatementTracer';
import { TracerEmptyState } from './tracer/TracerEmptyState';
import { TracerControls } from './tracer/TracerControls';
import { TracerViewTabs } from './tracer/TracerViewTabs';
import { SessionsTimeline } from './tracer/SessionsTimeline';
import { StatementsTable } from './tracer/StatementsTable';
import { StatementInspector } from './tracer/StatementInspector';

export type { SelectedStatementInfo } from '../../utils/statementTracerUtils';

export interface StatementTracerPanelProps {
  activeConnection: DatabaseConnectionConfig | undefined;
  onSelectSql?: (sql: string) => void;
}

export const StatementTracerPanel: React.FC<StatementTracerPanelProps> = ({ activeConnection, onSelectSql }) => {
  const { copy, copiedKey } = useCopyToClipboard();
  const tracer = useStatementTracer(activeConnection);
  const { state, view, selectedItem } = tracer;

  if (!activeConnection) {
    return (
      <TracerEmptyState
        icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma conexão selecionada."
        subtitle="Selecione uma conexão Oracle na barra lateral para usar o Statement Tracer."
      />
    );
  }

  if (!tracer.isOracle) {
    return (
      <TracerEmptyState
        icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Statement Tracer disponível apenas para Oracle."
        subtitle="Selecione uma conexão do tipo Oracle para capturar sessões ativas (v$session) ou SQL recente (v$sql)."
      />
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Barra de Filtros e Controles */}
      <TracerControls
        state={state}
        isBusy={tracer.isBusy}
        elapsedSec={tracer.elapsedSec}
        intervalMs={tracer.intervalMs}
        onIntervalChange={tracer.setIntervalMs}
        schemaFilter={tracer.schemaFilter}
        onSchemaFilterChange={tracer.setSchemaFilter}
        textFilter={tracer.textFilter}
        onTextFilterChange={tracer.setTextFilter}
        onStart={tracer.handleStart}
        onStop={tracer.handleStop}
        onClear={tracer.handleClear}
      />

      {/* Alternância de Abas (Linha do Tempo vs SQL Capturado) */}
      <TracerViewTabs
        view={view}
        onChange={tracer.setView}
        sessionsCount={state.sessionEvents.length}
        statementsCount={state.statements.length}
      />

      {state.lastError ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
          <div className="flex items-center space-x-2 font-bold mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Falha na última consulta ao Oracle:</span>
          </div>
          <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
            {state.lastError}
          </pre>
        </div>
      ) : null}

      {!state.isCapturing && state.pollCount === 0 ? (
        <TracerEmptyState
          icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
          title="Nenhuma captura em andamento."
          subtitle='Clique em "Iniciar Captura" e vá disparar a ação no outro app (Delphi/Karaf) — a captura roda em segundo plano e continua mesmo se você trocar de aba ou de página aqui no Dev Manager.'
        />
      ) : view === 'sessions' ? (
        <SessionsTimeline
          events={state.sessionEvents}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelect={tracer.handleSelectSessionEvent}
          selectedSqlId={selectedItem?.sqlId}
        />
      ) : (
        <StatementsTable
          statements={state.statements}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelect={tracer.handleSelectStatement}
          selectedSqlId={selectedItem?.sqlId}
        />
      )}

      {/* Painel Inspetor de Binds e SQL Interpolado */}
      {selectedItem && (
        <StatementInspector
          item={selectedItem}
          onClose={tracer.clearSelection}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelectSql={onSelectSql}
          onFetchBinds={tracer.handleFetchBinds}
          isFetchingBinds={tracer.isFetchingBinds}
        />
      )}
    </div>
  );
};
