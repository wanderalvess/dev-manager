import React from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { HttpKeyValueItem } from '../../../../shared/types';

interface HttpKeyValueEditorProps {
  items: HttpKeyValueItem[];
  onChange: (items: HttpKeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const HttpKeyValueEditor: React.FC<HttpKeyValueEditorProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Chave (ex: Content-Type)',
  valuePlaceholder = 'Valor (ex: application/json)'
}) => {
  const handleToggle = (id: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  };

  const handleUpdate = (id: string, field: 'key' | 'value' | 'description', val: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const handleAdd = () => {
    const newItem: HttpKeyValueItem = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true
    };
    onChange([...items, newItem]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Itens ({items.filter((i) => i.enabled).length}/{items.length} ativos)
        </span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Adicionar</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Nenhum item configurado. Clique em &quot;Adicionar&quot; para criar um novo parâmetro ou cabeçalho.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-1.5 rounded border transition-colors ${
                item.enabled ? 'bg-background border-border' : 'bg-muted/20 border-border/40 opacity-60'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className="text-muted-foreground hover:text-foreground"
                title={item.enabled ? 'Desabilitar item' : 'Habilitar item'}
              >
                {item.enabled ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <input
                type="text"
                value={item.key}
                onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                placeholder={keyPlaceholder}
                className="w-1/3 px-2 py-1 bg-muted/40 border border-border/60 rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <input
                type="text"
                value={item.value}
                onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                placeholder={valuePlaceholder}
                className="flex-1 px-2 py-1 bg-muted/40 border border-border/60 rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
