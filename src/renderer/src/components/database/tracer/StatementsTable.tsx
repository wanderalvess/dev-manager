import React from 'react';
import { History } from 'lucide-react';
import type { OracleCaptureState, OracleRecentStatement } from '../../../../../shared/types';
import { TracerEmptyState } from './TracerEmptyState';
import { CopySqlButton } from './CopySqlButton';
import { BindsCountBadge } from './BindsCountBadge';
import { InspectRowButton } from './InspectRowButton';

export const StatementsTable: React.FC<{
  statements: OracleCaptureState['statements'];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelect: (st: OracleRecentStatement) => void;
  selectedSqlId?: string;
}> = ({ statements, onCopy, copiedKey, onSelect, selectedSqlId }) => {
  if (statements.length === 0) {
    return (
      <TracerEmptyState
        icon={<History className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma instrução capturada ainda."
        subtitle="Instruções distintas vistas no cursor cache do Oracle (v$sql) aparecem aqui, deduplicadas por SQL_ID."
      />
    );
  }

  return (
    <div className="border border-border/70 rounded-xl overflow-auto max-h-[360px]">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/90 text-muted-foreground sticky top-0 z-10 border-b border-border/70">
          <tr className="text-left">
            <th className="px-2.5 py-1.5 font-semibold">SQL_ID</th>
            <th className="px-2.5 py-1.5 font-semibold">Schema</th>
            <th className="px-2.5 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2.5 py-1.5 font-semibold">Execuções</th>
            <th className="px-2.5 py-1.5 font-semibold">Última atividade</th>
            <th className="px-2.5 py-1.5 font-semibold">Binds</th>
            <th className="px-2.5 py-1.5 font-semibold">SQL</th>
            <th className="px-2 py-1.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((st) => {
            const isSelected = selectedSqlId && st.sqlId === selectedSqlId;
            const bindsCount = st.binds?.length ?? 0;

            return (
              <tr
                key={st.sqlId}
                onClick={() => onSelect(st)}
                className={`border-t border-border/50 transition-colors cursor-pointer align-top ${
                  isSelected ? 'bg-sky-500/15 border-l-2 border-l-sky-500' : 'hover:bg-card/60'
                }`}
              >
                <td className="px-2.5 py-2 whitespace-nowrap font-bold text-sky-400">{st.sqlId}</td>
                <td className="px-2.5 py-2 whitespace-nowrap font-medium text-foreground">{st.parsingSchemaName || '-'}</td>
                <td className="px-2.5 py-2">
                  <div className="truncate max-w-[140px]">{st.module || '-'}</div>
                  <div className="text-muted-foreground text-2xs truncate max-w-[140px]">{st.action || '-'}</div>
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">{st.executions ?? '-'}</td>
                <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground text-2xs">
                  {st.lastActiveTime || '-'}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  <BindsCountBadge count={bindsCount} />
                </td>
                <td className="px-2.5 py-2 min-w-[280px] max-w-[420px]">
                  <div className="flex items-start gap-1.5">
                    <span className="truncate" title={st.interpolatedSql || st.sqlText}>
                      {st.sqlText}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <CopySqlButton sql={st.interpolatedSql || st.sqlText} keyId={`stmt-${st.sqlId}`} onCopy={onCopy} copiedKey={copiedKey} />
                    <InspectRowButton onInspect={() => onSelect(st)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
