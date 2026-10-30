import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  MAX_QUICK_COMMANDS,
  newQuickCommandId,
  type KarafQuickCommand
} from '../../../utils/karafQuickCommands';

interface KarafQuickCommandsEditorProps {
  commands: KarafQuickCommand[];
  onSave: (list: KarafQuickCommand[]) => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
}

const inputClass =
  'px-2 py-1 bg-background border border-border rounded-md text-xs text-foreground focus:outline-hidden focus:border-primary transition';
const iconBtn =
  'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer transition';

/** Edita a lista de comandos rápidos num rascunho; só grava ao salvar (itens sem comando são descartados). */
export const KarafQuickCommandsEditor: React.FC<KarafQuickCommandsEditorProps> = ({
  commands,
  onSave,
  onRestoreDefaults,
  onClose
}) => {
  const [draft, setDraft] = useState<KarafQuickCommand[]>(commands);

  const update = (id: string, patch: Partial<KarafQuickCommand>) =>
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setDraft((prev) => prev.filter((c) => c.id !== id));
  const move = (index: number, delta: -1 | 1) =>
    setDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const add = () => setDraft((prev) => [...prev, { id: newQuickCommandId(), label: '', command: '' }]);

  return (
    <div className="space-y-2 text-xs">
      <p className="text-2xs text-muted-foreground">
        Os comandos abaixo aparecem aqui e no menu <strong>Comandos</strong> do console. Itens sem comando são descartados.
      </p>

      {draft.length === 0 && (
        <p className="py-3 text-center text-muted-foreground">Nenhum comando. Adicione um ou restaure o padrão.</p>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {draft.map((c, index) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <input
              value={c.label}
              onChange={(e) => update(c.id, { label: e.target.value })}
              placeholder="Nome"
              maxLength={40}
              aria-label="Nome do comando"
              className={`${inputClass} w-36 shrink-0`}
            />
            <input
              value={c.command}
              onChange={(e) => update(c.id, { command: e.target.value })}
              placeholder="bundle:list -s"
              aria-label="Comando Karaf"
              className={`${inputClass} flex-1 min-w-0 font-mono`}
            />
            <button type="button" className={iconBtn} disabled={index === 0} onClick={() => move(index, -1)} title="Mover para cima" aria-label="Mover para cima">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" className={iconBtn} disabled={index === draft.length - 1} onClick={() => move(index, 1)} title="Mover para baixo" aria-label="Mover para baixo">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button type="button" className={`${iconBtn} hover:text-danger`} onClick={() => remove(c.id)} title="Remover" aria-label="Remover comando">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/70">
        <button
          type="button"
          onClick={add}
          disabled={draft.length >= MAX_QUICK_COMMANDS}
          className="flex items-center gap-1 text-2xs text-primary hover:underline disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
        <button
          type="button"
          onClick={() => {
            onRestoreDefaults();
            onClose();
          }}
          className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground cursor-pointer"
          title="Volta para a lista original de comandos"
        >
          <RotateCcw className="w-3 h-3" /> Restaurar padrão
        </button>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onClose} className="px-2.5 py-1 text-2xs text-muted-foreground hover:text-foreground cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="px-3 py-1 bg-primary text-primary-foreground font-semibold rounded-md text-2xs hover:bg-primary/90 cursor-pointer transition"
          >
            Salvar
          </button>
        </span>
      </div>
    </div>
  );
};
