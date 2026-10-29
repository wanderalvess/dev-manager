import React, { useEffect, useRef, useState } from 'react';
import type { AuthLockoutLogEntry } from '../../../../../shared/authLockoutTypes';
import { STATUS_TONE } from '../../../utils/authLockoutView';
import { TONE_TEXT } from '../../integrationtrace/toneClasses';

interface AuthLockoutActivityLogProps {
  lines: AuthLockoutLogEntry[];
  requestsCount?: number;
}

const time = (at: string) => new Date(at).toLocaleTimeString();

function Line({ entry }: { entry: AuthLockoutLogEntry }) {
  const stamp = <span className="font-mono text-2xs text-muted-foreground/70 mr-2 shrink-0">{time(entry.at)}</span>;
  switch (entry.level) {
    case 'step':
      return (
        <div className="pt-3 first:pt-0">
          <div className="flex items-baseline">
            {stamp}
            <span className="text-sm font-semibold text-foreground">{entry.message}</span>
          </div>
          {entry.detail && <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 ml-16">{entry.detail}</p>}
        </div>
      );
    case 'result': {
      const tone = entry.status ? TONE_TEXT[STATUS_TONE[entry.status]] : 'text-foreground';
      return (
        <div className="flex items-baseline">
          {stamp}
          <span className={`text-xs font-semibold ${tone}`}>{entry.message}</span>
        </div>
      );
    }
    case 'attempt': {
      const mark = entry.asExpected === undefined ? 'text-muted-foreground' : entry.asExpected ? 'text-success' : 'text-danger';
      return (
        <div>
          <div className="flex items-baseline">
            {stamp}
            <span className={`text-xs font-mono break-all ${mark}`}>{entry.message}</span>
          </div>
          {entry.detail && <p className="text-2xs font-mono text-muted-foreground/80 break-all ml-16">{entry.detail}</p>}
        </div>
      );
    }
    case 'wait':
      return (
        <div className="flex items-baseline">
          {stamp}
          <span className="text-xs italic text-muted-foreground">{entry.message}</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-baseline">
          {stamp}
          <span className="text-xs font-medium text-danger">{entry.message}</span>
        </div>
      );
    default:
      return (
        <div className="flex items-baseline">
          {stamp}
          <span className="text-xs text-foreground/90">{entry.message}</span>
        </div>
      );
  }
}

/** Atividade do teste: cada passo explicado, cada requisição com o esperado (✔/✘) e cada resultado. */
export const AuthLockoutActivityLog: React.FC<AuthLockoutActivityLogProps> = ({ lines, requestsCount }) => {
  const [showRequests, setShowRequests] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const visible = showRequests ? lines : lines.filter((l) => l.level !== 'attempt' && l.level !== 'wait');

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines.length]);

  if (lines.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-foreground">
          Passo a passo {requestsCount !== undefined ? `(${requestsCount} requisições)` : ''}
        </span>
        <label className="flex items-center gap-1.5 text-2xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showRequests} onChange={(e) => setShowRequests(e.target.checked)} />
          Mostrar cada requisição
        </label>
      </div>
      <div ref={ref} className="max-h-[28rem] overflow-y-auto p-3 space-y-1">
        {visible.map((entry, i) => (
          <Line key={i} entry={entry} />
        ))}
      </div>
      <p className="px-3 py-2 border-t border-border text-2xs text-muted-foreground">
        <span className="text-success">verde</span> = a resposta foi a esperada; <span className="text-danger">vermelho</span> = não foi.
        Senhas e tokens aparecem mascarados.
      </p>
    </div>
  );
};
