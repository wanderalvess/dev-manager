import React from 'react';
import { Users } from 'lucide-react';
import type { OracleCaptureState, OracleSessionCaptureEntry } from '../../../../../shared/types';
import { TracerEmptyState } from './TracerEmptyState';
import { CopySqlButton } from './CopySqlButton';
import { BindsCountBadge } from './BindsCountBadge';
import { InspectRowButton } from './InspectRowButton';

export const SessionsTimeline: React.FC<{
  events: OracleCaptureState['sessionEvents'];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelect: (ev: OracleSessionCaptureEntry) => void;
  selectedSqlId?: string;
}> = ({ events, onCopy, copiedKey, onSelect, selectedSqlId }) => {
  if (events.length === 0) {
    return (
      <TracerEmptyState
        icon={<Users className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma troca de SQL observada ainda."
        subtitle="Cada linha aqui aparece quando uma sessão passa a rodar uma instrução diferente da anterior."
      />
    );
  }

  return (
    <div className="border border-border/70 rounded-xl overflow-auto max-h-[360px]">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/90 text-muted-foreground sticky top-0 z-10 border-b border-border/70">
          <tr className="text-left">
            <th className="px-2.5 py-1.5 font-semibold">Capturado em</th>
            <th className="px-2.5 py-1.5 font-semibold">SID/SERIAL</th>
            <th className="px-2.5 py-1.5 font-semibold">Schema</th>
            <th className="px-2.5 py-1.5 font-semibold">Programa / Máquina</th>
            <th className="px-2.5 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2.5 py-1.5 font-semibold">Binds</th>
            <th className="px-2.5 py-1.5 font-semibold">SQL</th>
            <th className="px-2 py-1.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => {
            const rowKey = `${ev.sid}-${ev.serialNum}-${ev.capturedAt}-${idx}`;
            const isSelected = selectedSqlId && ev.sqlId === selectedSqlId;
            const bindsCount = ev.binds?.length ?? 0;

            return (
              <tr
                key={rowKey}
                onClick={() => onSelect(ev)}
                className={`border-t border-border/50 transition-colors cursor-pointer align-top ${
                  isSelected ? 'bg-sky-500/15 border-l-2 border-l-sky-500' : 'hover:bg-card/60'
                }`}
              >
                <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(ev.capturedAt).toLocaleTimeString('pt-BR')}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  {ev.sid}/{ev.serialNum}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap font-medium text-foreground">{ev.username || '-'}</td>
                <td className="px-2.5 py-2">
                  <div className="font-medium text-foreground truncate max-w-[160px]">{ev.program || '-'}</div>
                  <div className="text-muted-foreground text-[10px] truncate max-w-[160px]">{ev.machine || '-'}</div>
                </td>
                <td className="px-2.5 py-2">
                  <div className="truncate max-w-[140px]">{ev.module || '-'}</div>
                  <div className="text-muted-foreground text-[10px] truncate max-w-[140px]">{ev.action || '-'}</div>
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  <BindsCountBadge count={bindsCount} />
                </td>
                <td className="px-2.5 py-2 min-w-[280px] max-w-[420px]">
                  {ev.sqlText ? (
                    <div className="flex items-start gap-1.5">
                      <span className="truncate" title={ev.interpolatedSql || ev.sqlText}>
                        {ev.sqlText}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {ev.sqlText && (
                      <CopySqlButton sql={ev.interpolatedSql || ev.sqlText} keyId={`ev-${rowKey}`} onCopy={onCopy} copiedKey={copiedKey} />
                    )}
                    <InspectRowButton onInspect={() => onSelect(ev)} />
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
