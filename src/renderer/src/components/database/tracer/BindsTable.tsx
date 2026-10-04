import React from 'react';
import type { OracleCapturedBind } from '../../../../../shared/types';
import { CopySqlButton } from './CopySqlButton';

export const BindsTable: React.FC<{
  sqlId: string;
  binds: OracleCapturedBind[];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
}> = ({ sqlId, binds, onCopy, copiedKey }) => {
  if (binds.length === 0) {
    return (
      <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-center justify-between">
        <span>
          Nenhuma variável de bind capturada pelo Oracle para esta query no momento (o cursor cache pode não ter registrado os binds ou a query foi executada sem parâmetros).
        </span>
      </div>
    );
  }

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card/60">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/90 text-muted-foreground border-b border-border/70">
          <tr className="text-left">
            <th className="px-3 py-1.5 font-semibold w-12 text-center">Pos</th>
            <th className="px-3 py-1.5 font-semibold w-32">Nome / Bind</th>
            <th className="px-3 py-1.5 font-semibold w-36">Tipo de Dado</th>
            <th className="px-3 py-1.5 font-semibold">Valor Real Passado</th>
            <th className="px-3 py-1.5 font-semibold w-36">Última Captura</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {binds.map((b, idx) => {
            const bindKey = `bind-${sqlId}-${b.position}-${idx}`;
            return (
              <tr key={bindKey} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-1.5 text-center font-bold text-muted-foreground">#{b.position}</td>
                <td className="px-3 py-1.5 text-sky-400 font-bold">{b.name || `:${b.position}`}</td>
                <td className="px-3 py-1.5 text-muted-foreground text-[10px]">{b.datatype || '-'}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 max-w-[400px] truncate"
                      title={b.value ?? 'NULL'}
                    >
                      {b.value ?? 'NULL'}
                    </span>
                    {b.value && <CopySqlButton sql={b.value} keyId={`val-${bindKey}`} onCopy={onCopy} copiedKey={copiedKey} />}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground text-[10px] whitespace-nowrap">
                  {b.lastCaptured ? new Date(b.lastCaptured).toLocaleTimeString('pt-BR') : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
