import React from 'react';
import { Play, Copy, Check, RefreshCw, X, Sparkles, Sliders } from 'lucide-react';
import { interpolateOracleSqlWithBinds } from '../../../../../shared/oracleSqlInterpolator';
import type { SelectedStatementInfo } from '../../../utils/statementTracerUtils';
import { BindsTable } from './BindsTable';

export const StatementInspector: React.FC<{
  item: SelectedStatementInfo;
  onClose: () => void;
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelectSql?: (sql: string) => void;
  onFetchBinds: (sqlId: string, sqlText?: string) => void;
  isFetchingBinds: boolean;
}> = ({ item, onClose, onCopy, copiedKey, onSelectSql, onFetchBinds, isFetchingBinds }) => {
  const binds = item.binds || [];
  const interpolatedSql =
    item.interpolatedSql || (binds.length > 0 ? interpolateOracleSqlWithBinds(item.sqlText, binds) : undefined);

  return (
    <div className="cockpit-panel rounded-2xl p-4 border border-sky-500/30 bg-card/90 shadow-xl space-y-3 transition-all animate-fadeIn">
      {/* Cabeçalho do Inspetor */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>Inspeção de Binds & SQL Executável</span>
          </h4>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
            SQL_ID: {item.sqlId || '-'}
          </span>
          {item.username && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-foreground border border-border/60 font-semibold">
              Schema: {item.username}
            </span>
          )}
          {item.program && (
            <span
              className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold truncate max-w-[220px]"
              title={item.program}
            >
              {item.program}
            </span>
          )}
          {item.timestamp && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition cursor-pointer"
          title="Fechar painel de inspeção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Seção 1: Parâmetros Capturados (V$SQL_BIND_CAPTURE) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Parâmetros de Execução (V$SQL_BIND_CAPTURE)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {binds.length} {binds.length === 1 ? 'parâmetro' : 'parâmetros'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onFetchBinds(item.sqlId, item.sqlText)}
            disabled={isFetchingBinds}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/30 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Consultar novamente a view v$sql_bind_capture no banco"
          >
            <RefreshCw className={`w-3 h-3 ${isFetchingBinds ? 'animate-spin' : ''}`} />
            <span>{isFetchingBinds ? 'Buscando Binds...' : 'Atualizar Binds'}</span>
          </button>
        </div>

        <BindsTable sqlId={item.sqlId} binds={binds} onCopy={onCopy} copiedKey={copiedKey} />
      </div>

      {/* Seção 2: SQL com Parâmetros Aplicados (Pronto para Execução) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{interpolatedSql ? 'SQL Montado com Parâmetros Aplicados' : 'Instrução SQL'}</span>
            {interpolatedSql && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Pronto para Executar
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onCopy(interpolatedSql || item.sqlText, `interpolated-${item.sqlId}`)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-lg transition cursor-pointer"
              title="Copiar SQL com parâmetros para colar no SQL Developer ou DB Studio"
            >
              {copiedKey === `interpolated-${item.sqlId}` ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>

            {onSelectSql && (
              <button
                type="button"
                onClick={() => onSelectSql(interpolatedSql || item.sqlText)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                title="Carregar esta consulta diretamente no Editor SQL do DB Studio"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Abrir no Editor SQL</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap select-text shadow-inner">
          {interpolatedSql || item.sqlText}
        </div>
      </div>

      {/* SQL Original com Placeholders se foi interpolado */}
      {interpolatedSql && interpolatedSql !== item.sqlText && (
        <details className="text-[11px] text-muted-foreground group">
          <summary className="cursor-pointer hover:text-foreground font-semibold py-1">
            Ver SQL Original com Placeholders (:1, :param, ?)
          </summary>
          <div className="mt-1 bg-card/60 border border-border/70 rounded-lg p-2 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap max-h-28 overflow-y-auto">
            {item.sqlText}
          </div>
        </details>
      )}
    </div>
  );
};
