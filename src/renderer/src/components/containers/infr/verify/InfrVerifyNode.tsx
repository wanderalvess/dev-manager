import React from 'react';
import type { InfrContainerCheck } from '../../../../../../shared/infrEnvCheck';
import { INFR_ROLE_LABEL } from '../../../../../../shared/infrEnvCheck';
import { infrCheckBadge, type InfrPartTone } from '../../../../utils/infrBootstrapModalUtils';

const TONE: Record<InfrPartTone, { box: string; dot: string; pill: string }> = {
  up: { box: 'border-success/40', dot: 'bg-success', pill: 'bg-success/10 text-success' },
  wait: { box: 'border-warning/50', dot: 'bg-warning', pill: 'bg-warning/15 text-warning' },
  down: { box: 'border-danger/50', dot: 'bg-danger', pill: 'bg-danger/10 text-danger' },
  none: { box: 'border-dashed border-border', dot: 'bg-muted-foreground/40', pill: 'bg-muted text-muted-foreground' }
};

/** Uma parte do ambiente no pipeline Oracle → WTA → WSH; clicar abre o log dela embaixo. */
export const InfrVerifyNode: React.FC<{ c: InfrContainerCheck; selected: boolean; onSelect: () => void; extra?: React.ReactNode }> = ({ c, selected, onSelect, extra }) => {
  const b = infrCheckBadge(c);
  const t = TONE[b.tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex-1 min-w-[12rem] flex flex-col gap-1.5 p-4 rounded-xl border bg-card text-left transition cursor-pointer hover:bg-muted/30 ${t.box} ${
        selected ? 'ring-2 ring-warning/60 border-warning' : ''
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dot}`} />
        <span className="text-sm font-bold text-foreground">{INFR_ROLE_LABEL[c.role]}</span>
        <span className={`ml-auto text-2xs font-semibold px-2 py-0.5 rounded-full ${t.pill}`}>{b.text}</span>
      </span>
      <span className="font-mono text-xs text-foreground/80 truncate">{c.container}</span>
      <span className="text-2xs text-muted-foreground break-words">
        {c.exists
          ? `${[...new Set(c.ports.map((p) => p.replace(/^.*:(\d+)$/, ':$1')))].join(' ') || 'sem porta publicada'}${c.restarts ? ` · ${c.restarts} reinícios` : ''}`
          : 'A criação segue a ordem banco, WTA, WSH.'}
      </span>
      {extra}
    </button>
  );
};
