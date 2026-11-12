import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, Clock } from 'lucide-react';

export const QualityPage: React.FC<{ isActive: boolean; onNavigate: (tab: string) => void; settingsVersion: number }> = ({
  onNavigate
}) => {
  const [items, setItems] = useState([
    { id: 'q1', title: 'Emissão NFC-e Contingência Offline', owner: 'QA Squad', status: 'passed' },
    { id: 'q2', title: 'Integração Pedido WTA -> Oracle PCPEDC', owner: 'Core Dev', status: 'passed' },
    { id: 'q3', title: 'Bloqueio de Login após 5 tentativas', owner: 'Security QA', status: 'pending' }
  ]);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: it.status === 'passed' ? 'pending' : 'passed' } : it)));
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Matriz de Homologação &amp; Qualidade
          </h1>
          <p className="text-xs text-muted-foreground">Acompanhamento de critérios de release e suítes automatizadas.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onNavigate('quality-regression')} className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer">
            Regressivo
          </button>
          <button type="button" onClick={() => onNavigate('evidence')} className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer">
            Evidências
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {items.map((it) => (
          <div key={it.id} className="p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-foreground">{it.title}</div>
              <div className="text-2xs text-muted-foreground">Responsável: {it.owner}</div>
            </div>
            <button
              type="button"
              onClick={() => toggle(it.id)}
              className={`px-2.5 py-1 rounded-full text-2xs font-bold flex items-center gap-1 cursor-pointer ${
                it.status === 'passed' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}
            >
              {it.status === 'passed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {it.status === 'passed' ? 'Aprovado' : 'Pendente'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
