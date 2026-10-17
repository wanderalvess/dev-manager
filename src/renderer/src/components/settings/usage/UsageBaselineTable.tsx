import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { UsageImpactRow } from '../../../../../shared/types';
import { usageModuleLabel } from '../../../../../shared/usageActions';
import {
  formatBaselineDate,
  formatSavedTime,
  needsConfirmation,
  parseMinutesInput
} from '../../../utils/usageImpactViewUtils';

interface UsageBaselineTableProps {
  rows: UsageImpactRow[];
  onChange: (key: string, minutes: number) => void;
  onReset: (key: string) => void;
}

/** Campo de minutos: aceita digitar `12,5` sem o valor "pular" a cada tecla; só confirma o que é válido. */
const MinutesInput: React.FC<{ label: string; minutes: number; onCommit: (minutes: number) => void }> = ({
  label,
  minutes,
  onCommit
}) => {
  const [text, setText] = useState(String(minutes));
  useEffect(() => setText(String(minutes)), [minutes]);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parseMinutesInput(e.target.value);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={() => setText(String(minutes))}
      className="w-20 px-2 py-1 rounded-lg bg-muted/60 border border-border text-xs font-mono text-right text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
    />
  );
};

/** Uma linha por automação com equivalente manual: tempo que você levava à mão, origem e economia. */
export const UsageBaselineTable: React.FC<UsageBaselineTableProps> = ({ rows, onChange, onReset }) => (
  <div className="overflow-x-auto" id="field-usageBaselines">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-2xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
          <th className="py-1 pr-2 font-bold">Automação</th>
          <th className="py-1 pr-2 font-bold text-right">Usos</th>
          <th className="py-1 pr-2 font-bold text-right">Levava à mão (min)</th>
          <th className="py-1 pr-2 font-bold">Origem</th>
          <th className="py-1 pr-2 font-bold text-right">Economia</th>
          <th className="py-1 font-bold" aria-label="Restaurar padrão" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-border/30">
            <td className="py-1.5 pr-2">
              <div className="text-foreground">{row.label}</div>
              <div className="text-2xs text-muted-foreground">{usageModuleLabel(row.module)}</div>
            </td>
            <td className="py-1.5 pr-2 text-right font-mono text-muted-foreground">{row.okRuns}</td>
            <td className="py-1.5 pr-2 text-right">
              <MinutesInput label={`Minutos que você levava à mão: ${row.label}`} minutes={row.baselineMinutes} onCommit={(m) => onChange(row.key, m)} />
            </td>
            <td className="py-1.5 pr-2">
              {row.source === 'user' ? (
                <span className="text-success" title={row.setAt ? `Informado em ${formatBaselineDate(row.setAt)}` : undefined}>
                  Informado{row.setAt ? ` em ${formatBaselineDate(row.setAt)}` : ''}
                </span>
              ) : needsConfirmation(row) ? (
                <span className="text-warning font-semibold" title="Você já usou esta automação. Informe quanto tempo levava à mão para confirmar a economia.">
                  Padrão: confirme
                </span>
              ) : (
                <span className="text-muted-foreground">Padrão</span>
              )}
            </td>
            <td className="py-1.5 pr-2 text-right font-mono text-foreground">{formatSavedTime(row.savedMs)}</td>
            <td className="py-1.5 text-right">
              {row.source === 'user' && (
                <button
                  type="button"
                  onClick={() => onReset(row.key)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Restaurar o tempo padrão"
                  aria-label={`Restaurar o tempo padrão: ${row.label}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
