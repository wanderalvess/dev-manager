import React from 'react';
import {
  Play,
  RotateCw,
  Zap,
  BookmarkPlus,
  SlidersHorizontal,
  HardDriveDownload,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { DatabaseConnectionConfig, DatabaseType, SqlSnippet } from '../../../../../shared/types';
import { SqlSnippetsMenu } from './SqlSnippetsMenu';

interface SqlEditorToolbarProps {
  sql: string;
  activeConnection: DatabaseConnectionConfig | null;
  isExecuting: boolean;
  onExecuteSql: (customSql?: string) => void;
  isExplaining: boolean;
  onExplainPlan: () => void;
  maxRows: number;
  setMaxRows: (n: number) => void;
  onOpenBindModal: () => void;
  onOpenBackupModal: () => void;
  onOpenCreateSnippet: (initialSql?: string) => void;
  customSnippets: SqlSnippet[];
  onSelectSnippet: (snippet: SqlSnippet) => void;
  onExecuteSnippetDirectly: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onEditSnippet: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onDeleteSnippet: (id: string, e?: React.MouseEvent) => void;
  getDbBadge: (type: DatabaseType) => React.ReactNode;
  isMaximizedActual: boolean;
  toggleMaximize: () => void;
  detectedVariables: readonly unknown[];
}

export const SqlEditorToolbar: React.FC<SqlEditorToolbarProps> = ({
  sql,
  activeConnection,
  isExecuting,
  onExecuteSql,
  isExplaining,
  onExplainPlan,
  maxRows,
  setMaxRows,
  onOpenBindModal,
  onOpenBackupModal,
  onOpenCreateSnippet,
  customSnippets,
  onSelectSnippet,
  onExecuteSnippetDirectly,
  onEditSnippet,
  onDeleteSnippet,
  getDbBadge,
  isMaximizedActual,
  toggleMaximize,
  detectedVariables
}) => (
  <div className="p-2.5 bg-card/40 border-b border-border/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
    <div className="flex items-center space-x-2">
      {activeConnection ? (
        <div className="flex items-center space-x-2">
          {getDbBadge(activeConnection.type)}
          <span className="text-xs font-bold text-foreground">{activeConnection.name}</span>
          <span className="text-[11px] text-muted-foreground font-mono">
            ({activeConnection.user}@{activeConnection.database || activeConnection.host})
          </span>
        </div>
      ) : (
        <span className="text-xs text-amber-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> Nenhuma conexão selecionada
        </span>
      )}
    </div>

    <div className="flex items-center space-x-2">
      {/* Menu Dropdown de Consultas Salvas */}
      <SqlSnippetsMenu
        customSnippets={customSnippets}
        onOpenCreateSnippet={onOpenCreateSnippet}
        onSelectSnippet={onSelectSnippet}
        onExecuteSnippetDirectly={onExecuteSnippetDirectly}
        onEditSnippet={onEditSnippet}
        onDeleteSnippet={onDeleteSnippet}
      />

      {/* Botão Salvar Consulta Atual */}
      <button
        type="button"
        onClick={() => onOpenCreateSnippet()}
        disabled={!sql.trim()}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/70 rounded-lg text-xs font-semibold text-foreground transition shadow-xs disabled:opacity-50 cursor-pointer"
        title="Salvar consulta atual do editor nas minhas consultas"
      >
        <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
        <span>Salvar Consulta</span>
      </button>

      {/* Botão de Backup do Banco */}
      <button
        type="button"
        data-tour="backup-button"
        onClick={onOpenBackupModal}
        disabled={!activeConnection}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/70 rounded-lg text-xs font-medium text-foreground transition shadow-xs disabled:opacity-50 cursor-pointer"
        title="Fazer backup do banco de dados conectado"
      >
        <HardDriveDownload className="w-3.5 h-3.5 text-sky-400" />
        <span>Backup</span>
      </button>

      {/* Botão de Maximizar / Restaurar Editor */}
      <button
        type="button"
        onClick={toggleMaximize}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
          isMaximizedActual
            ? 'bg-primary/20 text-primary border border-primary/40'
            : 'bg-card hover:bg-muted border border-border/70 text-foreground'
        }`}
        title={
          isMaximizedActual
            ? 'Restaurar layout padrão do editor'
            : 'Maximizar editor (tela cheia para edição de queries grandes)'
        }
      >
        {isMaximizedActual ? (
          <>
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Restaurar</span>
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Maximizar</span>
          </>
        )}
      </button>

      {/* Botão de Parâmetros e Variáveis (sempre visível) */}
      <button
        type="button"
        onClick={onOpenBindModal}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
          detectedVariables.length > 0
            ? 'bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-400'
            : 'bg-card hover:bg-muted border border-border/70 text-foreground'
        }`}
        title={
          detectedVariables.length > 0
            ? `Configurar ${detectedVariables.length} variável(is) detectada(s) (:VAR, &VAR, @VAR, \${VAR})`
            : 'Abrir painel de parâmetros e variáveis da consulta'
        }
      >
        <SlidersHorizontal className={`w-3.5 h-3.5 ${detectedVariables.length > 0 ? 'text-violet-400' : 'text-muted-foreground'}`} />
        <span>Parâmetros</span>
        {detectedVariables.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-violet-500/25 text-violet-300">
            {detectedVariables.length}
          </span>
        )}
      </button>

      {/* Botão Explain Plan */}
      <button
        type="button"
        onClick={onExplainPlan}
        disabled={isExplaining || isExecuting || !activeConnection}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
        title="Explicar plano de execução da consulta selecionada (Oracle, Postgres, MySQL)"
      >
        <Zap className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
        <span>{isExplaining ? 'Explicando...' : 'Explain Plan'}</span>
      </button>

      {/* Limite de Linhas */}
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <span className="text-[11px]">Limite:</span>
        <select
          value={maxRows}
          onChange={(e) => setMaxRows(Number(e.target.value))}
          className="bg-card border border-border/70 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
      </div>

      {/* Botão Executar */}
      <button
        data-tour="execute-sql-button"
        onClick={() => onExecuteSql()}
        disabled={isExecuting || !activeConnection}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
      >
        {isExecuting ? (
          <>
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>Executando...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar (Ctrl+Enter)</span>
          </>
        )}
      </button>
    </div>
  </div>
);
