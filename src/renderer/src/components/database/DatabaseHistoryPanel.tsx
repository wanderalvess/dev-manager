import React from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import type { ExecutionHistoryItem } from '../../utils/dbPageTypes';

interface DatabaseHistoryPanelProps {
  history: ExecutionHistoryItem[];
  copyFeedback: string | null;
  onCopySql: (sql: string, key: string) => void;
  onClearHistory: () => void;
  onUseSql: (sql: string) => void;
  onRunSql: (sql: string) => void;
  onSaveSnippet: (sql: string) => void;
}

export const DatabaseHistoryPanel: React.FC<DatabaseHistoryPanelProps> = ({
  history,
  copyFeedback,
  onCopySql,
  onClearHistory,
  onUseSql,
  onRunSql,
  onSaveSnippet
}) => (
  <div className="p-3 space-y-2">
    <div className="flex items-center justify-between pb-1.5 border-b border-border/60 text-xs">
      <span className="text-muted-foreground font-medium">
        {history.length} consulta(s) no histórico persistente
      </span>
      {history.length > 0 && (
        <button
          onClick={onClearHistory}
          className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" /> Limpar Histórico
        </button>
      )}
    </div>
    {history.length === 0 ? (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Nenhuma consulta executada recentemente.
      </div>
    ) : (
      history.map((item) => (
        <div
          key={item.id}
          className="p-2.5 bg-card/60 border border-border/60 rounded-lg text-xs flex flex-col space-y-1.5 hover:border-border transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {item.success ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              )}
              <span className="font-bold text-foreground">{item.connectionName}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-muted-foreground font-mono mr-1">{item.timeMs} ms</span>
              <button
                onClick={() => onCopySql(item.sql, item.id)}
                className="px-2 py-0.5 bg-muted hover:bg-muted/80 text-foreground rounded text-[10px] font-semibold transition cursor-pointer"
                title="Copiar SQL"
              >
                {copyFeedback === item.id ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => onUseSql(item.sql)}
                className="px-2 py-0.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded text-[10px] font-semibold transition cursor-pointer"
                title="Carregar no editor"
              >
                Usar
              </button>
              <button
                onClick={() => onRunSql(item.sql)}
                className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer"
                title="Executar imediatamente"
              >
                Executar
              </button>
              <button
                onClick={() => onSaveSnippet(item.sql)}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-black rounded text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Salvar esta consulta nas Minhas Consultas"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
          <pre className="text-[11px] font-mono text-emerald-300 bg-[#0B0F17] p-2 rounded truncate whitespace-pre-wrap max-h-16 overflow-hidden">
            {item.sql}
          </pre>
          {item.error && (
            <span className="text-[10px] text-red-400 font-mono truncate">{item.error}</span>
          )}
        </div>
      ))
    )}
  </div>
);
