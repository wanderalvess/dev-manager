import React from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { SqlVariablePrefix } from '../../../utils/sqlBinds';

interface BindQuickActionsProps {
  hasBinds: boolean;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  newVarName: string;
  setNewVarName: (v: string) => void;
  newVarPrefix: SqlVariablePrefix;
  setNewVarPrefix: (v: SqlVariablePrefix) => void;
  onAddVariable: (e: React.FormEvent) => void;
  onClearAllValues: () => void;
}

export const BindQuickActions: React.FC<BindQuickActionsProps> = ({
  hasBinds,
  showAddForm,
  setShowAddForm,
  newVarName,
  setNewVarName,
  newVarPrefix,
  setNewVarPrefix,
  onAddVariable,
  onClearAllValues
}) => (
  <div className="flex items-center justify-between gap-2 text-xs">
    <div className="flex items-center space-x-2">
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-card hover:bg-muted border border-border text-foreground font-semibold text-[11px] transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Adicionar Variável Manual</span>
        </button>
      ) : (
        <form onSubmit={onAddVariable} className="flex items-center space-x-1.5 animate-fade-in">
          <select
            value={newVarPrefix}
            onChange={(e) => setNewVarPrefix(e.target.value as SqlVariablePrefix)}
            className="bg-card border border-border text-foreground text-xs rounded px-1.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value=":">:</option>
            <option value="&">&</option>
            <option value="&&">&&</option>
            <option value="@">@</option>
            <option value="${}">{'${}'}</option>
            <option value="#{}">{'#{}'}</option>
          </select>
          <input
            type="text"
            placeholder="NOME_VARIAVEL"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value.toUpperCase())}
            className="w-36 bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newVarName.trim()}
            className="px-2 py-1 rounded bg-primary text-primary-foreground font-bold text-xs disabled:opacity-50 cursor-pointer"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="px-2 py-1 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>

    {hasBinds && (
      <button
        type="button"
        onClick={onClearAllValues}
        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition cursor-pointer"
        title="Limpar todos os campos preenchidos"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Limpar Valores</span>
      </button>
    )}
  </div>
);
