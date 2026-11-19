import React, { useState } from 'react';
import { Clock, Keyboard, MousePointerClick, Plus, Type, X } from 'lucide-react';
import { EVIDENCE_KEYS, describeAction, type EvidenceAction, type EvidenceActionType } from '../../../../shared/evidenceTypes';

const FIELD = 'h-8 px-2.5 border border-input rounded-[10px] bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring';
const BTN =
  'h-8 px-2.5 border border-border rounded-[10px] bg-card hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50';
const ICON: Record<EvidenceActionType, React.ElementType> = { click: MousePointerClick, type: Type, key: Keyboard, wait: Clock };

/** Roteiro do passo: o clique gravado e o que mais precisa acontecer antes do print (texto, tecla, espera). */
export const StepActions: React.FC<{ actions: EvidenceAction[] | undefined; onChange: (next: EvidenceAction[]) => void }> = ({ actions = [], onChange }) => {
  const [adding, setAdding] = useState<Exclude<EvidenceActionType, 'click'> | null>(null);
  const [text, setText] = useState('');
  const [key, setKey] = useState('Enter');
  const [ms, setMs] = useState('1000');

  const add = () => {
    const id = crypto.randomUUID();
    const next: EvidenceAction | null =
      adding === 'type' && text ? { id, type: 'type', text } : adding === 'key' ? { id, type: 'key', key } : adding === 'wait' ? { id, type: 'wait', ms: Number(ms) || 1000 } : null;
    if (!next) return;
    onChange([...actions, next]);
    setAdding(null);
    setText('');
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...actions];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">Roteiro do passo (usado em &quot;Reexecutar&quot;)</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {actions.length === 0 && <span className="text-xs text-muted-foreground">Sem ações: este passo não é reexecutado.</span>}
        {actions.map((a, i) => {
          const Icon = ICON[a.type];
          return (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 pl-2 pr-1 py-0.5 text-xs text-foreground">
              <Icon className="w-3 h-3 text-muted-foreground" />
              {describeAction(a)}
              <button type="button" title="Mover para trás" className="px-0.5 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => move(i, -1)}>
                ‹
              </button>
              <button type="button" title="Mover para frente" className="px-0.5 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => move(i, 1)}>
                ›
              </button>
              <button type="button" title="Remover ação" className="p-0.5 text-muted-foreground hover:text-red-600 cursor-pointer" onClick={() => onChange(actions.filter((x) => x.id !== a.id))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      {adding ? (
        <div className="flex flex-wrap items-center gap-2">
          {adding === 'type' && <input className={`${FIELD} w-64`} placeholder="Texto a digitar" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} autoFocus />}
          {adding === 'key' && (
            <select className={FIELD} value={key} onChange={(e) => setKey(e.target.value)}>
              {Object.keys(EVIDENCE_KEYS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          )}
          {adding === 'wait' && <input className={`${FIELD} w-24`} type="number" min={0} max={30000} step={250} value={ms} onChange={(e) => setMs(e.target.value)} />}
          <button type="button" className={BTN} onClick={add}>
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
          <button type="button" className={BTN} onClick={() => setAdding(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={BTN} onClick={() => setAdding('type')}>
            <Type className="w-3.5 h-3.5" /> Digitar
          </button>
          <button type="button" className={BTN} onClick={() => setAdding('key')}>
            <Keyboard className="w-3.5 h-3.5" /> Tecla
          </button>
          <button type="button" className={BTN} onClick={() => setAdding('wait')}>
            <Clock className="w-3.5 h-3.5" /> Esperar
          </button>
        </div>
      )}
    </div>
  );
};
