import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

type SetVariables = React.Dispatch<React.SetStateAction<Record<string, string>>>;

interface QaRunnerVariablesTabProps {
  variables: Record<string, string>;
  setVariables: SetVariables;
  newVarKey: string;
  newVarVal: string;
  onChangeNewVarKey: (value: string) => void;
  onChangeNewVarVal: (value: string) => void;
}

export const QaRunnerVariablesTab: React.FC<QaRunnerVariablesTabProps> = ({
  variables,
  setVariables,
  newVarKey,
  newVarVal,
  onChangeNewVarKey,
  onChangeNewVarVal
}) => {

  return (
    <div className="flex-1 p-3 overflow-y-auto space-y-3">
      {/* Formulário Inline para Adicionar Binds */}
      <div className="p-2 rounded-md border border-border bg-background/50 space-y-2">
        <span className="text-2xs font-semibold text-muted-foreground block">
          Adicionar Parâmetro de Bind:
        </span>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-mono text-xs font-bold">:</span>
            <input
              type="text"
              value={newVarKey}
              onChange={(e) => onChangeNewVarKey(e.target.value)}
              placeholder="codFilial"
              className="w-full bg-card border border-border rounded pl-5 pr-2 py-1 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <input
            type="text"
            value={newVarVal}
            onChange={(e) => onChangeNewVarVal(e.target.value)}
            placeholder="Valor"
            className="flex-1 bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => {
              if (newVarKey.trim()) {
                setVariables((prev) => ({ ...prev, [newVarKey.trim()]: newVarVal.trim() }));
                onChangeNewVarKey('');
                onChangeNewVarVal('');
              }
            }}
            disabled={!newVarKey.trim()}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            title="Adicionar variável" aria-label="Adicionar variável"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {Object.keys(variables).length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground font-mono">
          Nenhum bind configurado.
        </div>
      ) : (
        <div className="space-y-1.5">
          {Object.entries(variables).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 bg-card border border-border rounded-md px-2.5 py-1.5">
              <span className="font-mono text-xs font-semibold text-primary min-w-[85px] truncate" title={`:${k}`}>
                :{k}
              </span>
              <input
                type="text"
                value={v}
                onChange={(e) => {
                  const val = e.target.value;
                  setVariables((prev) => ({ ...prev, [k]: val }));
                }}
                className="bg-background border border-border rounded px-2 py-0.5 text-xs font-mono text-foreground flex-1 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  setVariables((prev) => {
                    const next = { ...prev };
                    delete next[k];
                    return next;
                  });
                }}
                className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer transition-colors"
                title="Remover variável" aria-label="Remover variável"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
