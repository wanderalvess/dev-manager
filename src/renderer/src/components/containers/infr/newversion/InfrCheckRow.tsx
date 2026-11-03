import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, RotateCw, XCircle } from 'lucide-react';

export type InfrCheckTone = 'ok' | 'warn' | 'block' | 'pending' | 'busy';

export interface InfrCheckItem {
  key: string;
  tone: InfrCheckTone;
  title: string;
  detail?: string;
  /** Ação de resolver ali mesmo (iniciar a origem, login, ler o catálogo, saídas do banco) */
  extra?: React.ReactNode;
}

const ICON: Record<InfrCheckTone, React.ReactNode> = {
  ok: <CheckCircle2 className="w-[18px] h-[18px] text-success" aria-label="Ok" />,
  warn: <AlertTriangle className="w-[18px] h-[18px] text-warning" aria-label="Atenção" />,
  block: <XCircle className="w-[18px] h-[18px] text-danger" aria-label="Impede de gerar" />,
  pending: <CircleDashed className="w-[18px] h-[18px] text-muted-foreground/60" aria-label="Aguardando" />,
  busy: <RotateCw className="w-[18px] h-[18px] text-warning animate-spin" aria-label="Conferindo" />
};

const BOX: Record<InfrCheckTone, string> = {
  ok: '',
  warn: 'bg-warning/5',
  block: 'bg-danger/5',
  pending: '',
  busy: ''
};

/** Uma linha de "Antes de gerar": ícone do estado, o que foi conferido, o detalhe e, quando dá, a ação para resolver. */
export const InfrCheckRow: React.FC<{ item: InfrCheckItem }> = ({ item }) => {
  const muted = item.tone === 'pending';
  return (
    <li className={`flex gap-3 px-4 py-3 border-t border-border/60 first:border-t-0 ${BOX[item.tone]}`}>
      <span className="shrink-0 mt-0.5" role="img">
        {ICON[item.tone]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{item.title}</p>
        {item.detail && <p className={`text-xs mt-0.5 leading-relaxed break-words ${muted ? 'text-muted-foreground' : 'text-foreground/80'}`}>{item.detail}</p>}
        {item.extra && <div className="mt-2.5">{item.extra}</div>}
      </div>
    </li>
  );
};
