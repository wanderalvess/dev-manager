import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCw, XCircle } from 'lucide-react';
import type { InfrPostFix, InfrPostItem, InfrPostStatus } from '../../../../../../shared/infrPostCheck';

const ICON: Record<InfrPostStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-success" />,
  warn: <AlertTriangle className="w-4 h-4 text-warning" />,
  fail: <XCircle className="w-4 h-4 text-danger" />,
  wait: <RotateCw className="w-4 h-4 text-muted-foreground" />
};

/** Validação depois da criação: cada ponto que faz o ambiente funcionar, com o botão do que o Hub resolve sozinho. */
export const InfrPostChecklist: React.FC<{ items: InfrPostItem[]; fixing: string | null; onFix: (f: InfrPostFix) => void; message?: string }> = ({ items, fixing, onFix, message }) => {
  if (!items.length) return null;
  const done = items.filter((i) => i.status === 'ok').length;
  // O mesmo botão em vários pontos (reiniciar o WTA resolve ordem, Karaf e login): só no primeiro
  const shown = new Set<string>();
  return (
    <section aria-label="Pronto para usar" className="rounded-xl border border-border/80 bg-card">
      <p className="px-4 py-2.5 border-b border-border/70 text-sm font-bold text-foreground">
        Pronto para usar <span className="font-normal text-muted-foreground">· {done} de {items.length} conferidos</span>
      </p>
      <ul className="divide-y divide-border/60">
        {items.map((i) => {
          const key = i.fix ? `${i.fix.role}:${i.fix.action}` : '';
          const withFix = !!i.fix && i.status !== 'ok' && !shown.has(key);
          if (withFix) shown.add(key);
          return (
            <li key={i.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 shrink-0">{ICON[i.status]}</span>
              <div className="flex-1 min-w-[14rem]">
                <p className="text-xs font-semibold text-foreground">{i.title}</p>
                <p className="text-2xs text-foreground/75 break-words">{i.detail}</p>
              </div>
              {withFix && i.fix && (
                <button
                  type="button"
                  onClick={() => onFix(i.fix!)}
                  disabled={fixing !== null}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-warning bg-warning text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {fixing === key && <RotateCw className="w-3.5 h-3.5 animate-spin" />} {i.fix.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {message && <p className="px-4 py-2 border-t border-border/70 text-2xs text-foreground/80 break-words">{message}</p>}
    </section>
  );
};
