import React from 'react';
import { Check, X } from 'lucide-react';
import { RESULTS_GRID_ROW_HEIGHT } from '../../../utils/resultsGridUtils';

interface ResultsGridNewRowProps {
  columns: string[];
  draft: Record<string, string>;
  isMutatingRow: boolean;
  onChangeField: (column: string, value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResultsGridNewRow: React.FC<ResultsGridNewRowProps> = ({
  columns,
  draft,
  isMutatingRow,
  onChangeField,
  onConfirm,
  onCancel
}) => (
  <tr className="bg-success/10" style={{ height: `${RESULTS_GRID_ROW_HEIGHT}px` }}>
    <td className="px-1 py-1 text-center border-r border-border/30 select-none">
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isMutatingRow}
          title="Confirmar inserção (Enter)" aria-label="Confirmar inserção (Enter)"
          className="p-0.5 rounded text-success hover:bg-success/20 cursor-pointer disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          title="Cancelar (Esc)" aria-label="Cancelar (Esc)"
          className="p-0.5 rounded text-muted-foreground hover:bg-muted cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </td>
    {columns.map((col) => (
      <td key={col} className="px-1.5 py-1 border-r border-border/30">
        <input
          type="text"
          value={draft[col] ?? ''}
          onChange={(e) => onChangeField(col, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={col}
          className="w-full px-1.5 py-0.5 text-xs bg-background border border-success/40 rounded font-mono focus:outline-hidden focus:ring-1 focus:ring-success"
        />
      </td>
    ))}
  </tr>
);
