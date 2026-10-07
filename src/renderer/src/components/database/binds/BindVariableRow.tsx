import React from 'react';
import { Trash2 } from 'lucide-react';
import { BindInputState } from '../../../utils/sqlBinds';
import { getBindValuePlaceholder } from '../../../utils/bindVariablesModal';
import { BindPrefixBadge } from './BindPrefixBadge';

interface BindVariableRowProps {
  item: BindInputState;
  idx: number;
  onChangeType: (idx: number, type: BindInputState['type']) => void;
  onChangeValue: (idx: number, value: string) => void;
  onRemove: (idx: number) => void;
}

export const BindVariableRow: React.FC<BindVariableRowProps> = ({
  item,
  idx,
  onChangeType,
  onChangeValue,
  onRemove
}) => (
  <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:border-violet-500/40 transition">
    {/* Identificador da Variável */}
    <div className="flex items-center space-x-2 min-w-44">
      <span className="font-mono font-bold text-xs text-foreground bg-card border border-border px-2 py-1 rounded flex items-center gap-1.5">
        <span className="text-violet-400">{item.prefix || ':'}</span>
        <span>{item.name}</span>
      </span>
      <BindPrefixBadge prefix={item.prefix} />
    </div>

    {/* Configuração do Tipo e Valor */}
    <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
      {/* Seletor de Tipo */}
      <select
        value={item.type}
        onChange={(e) => onChangeType(idx, e.target.value as BindInputState['type'])}
        className="bg-card border border-border text-foreground text-xs rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary shrink-0"
        title="Tipo de Dado"
      >
        <option value="auto">Auto (Texto/Número)</option>
        <option value="string">Texto ('...')</option>
        <option value="number">Número (123)</option>
        <option value="date">Data (YYYY-MM-DD)</option>
        <option value="list">Lista IN (1, 2, 3)</option>
        <option value="null">Nulo (NULL)</option>
      </select>

      {/* Campo de Entrada de Valor */}
      {item.type === 'null' ? (
        <input
          type="text"
          disabled
          value="NULL"
          className="flex-1 bg-muted/40 border border-border/60 rounded px-2.5 py-1.5 text-xs text-muted-foreground font-mono cursor-not-allowed italic"
        />
      ) : (
        <input
          type={item.type === 'date' ? 'date' : 'text'}
          autoFocus={idx === 0}
          placeholder={getBindValuePlaceholder(item)}
          value={item.value}
          onChange={(e) => onChangeValue(idx, e.target.value)}
          className="flex-1 bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
        />
      )}

      {/* Botão de Excluir da lista se foi adicionado ou não desejado */}
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
        title="Remover esta variável"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
