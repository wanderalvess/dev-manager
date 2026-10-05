import React from 'react';
import { Trash2 } from 'lucide-react';
import type { QaRegressionAssertion } from '../../../../../shared/types';

interface QaTemplateAssertionRowProps {
  assertion: QaRegressionAssertion;
  onChange: (assertion: QaRegressionAssertion) => void;
  onRemove: () => void;
}

export const QaTemplateAssertionRow: React.FC<QaTemplateAssertionRowProps> = ({
  assertion: ass,
  onChange,
  onRemove
}) => (
  <div className="flex flex-wrap items-center gap-2 bg-background border border-border rounded-md p-1.5">
    <input
      type="text"
      value={ass.column}
      onChange={(e) => onChange({ ...ass, column: e.target.value.toUpperCase() })}
      placeholder="COLUNA"
      className="bg-card border border-border rounded px-2 py-1 text-xs font-mono font-semibold text-foreground w-36 uppercase focus:outline-none focus:ring-1 focus:ring-primary"
    />

    <select
      value={ass.expectedType}
      onChange={(e) => onChange({ ...ass, expectedType: e.target.value as any })}
      className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="jsonPath">JSONPath (do JSON)</option>
      <option value="literal">Literal (Fixo)</option>
      <option value="notNull">Preenchido (&lt;S&gt;)</option>
      <option value="null">Vazio / Nulo (&lt;N&gt;)</option>
      <option value="zero">Zero (&lt;0&gt;)</option>
      <option value="regex">Expressão Regular</option>
    </select>

    {ass.expectedType !== 'notNull' && ass.expectedType !== 'null' && ass.expectedType !== 'zero' && (
      <input
        type="text"
        value={ass.expectedValue || ''}
        onChange={(e) => onChange({ ...ass, expectedValue: e.target.value })}
        placeholder={ass.expectedType === 'jsonPath' ? '$.vlTotal' : 'Valor esperado'}
        className="bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground flex-1 min-w-[150px] focus:outline-none focus:ring-1 focus:ring-primary"
      />
    )}

    <button
      type="button"
      onClick={onRemove}
      className="text-muted-foreground hover:text-red-500 text-xs p-1 cursor-pointer transition-colors"
      title="Remover asserção"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);
