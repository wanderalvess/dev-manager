import React from 'react';
import { nodeStatusLabel } from '../../../utils/winthorGuide';

const TONE = {
  running: 'bg-success/10 text-success',
  stopped: 'bg-warning/10 text-warning',
  absent: 'bg-muted text-muted-foreground border border-dashed border-border'
} as const;

/** Selo do nó da topologia: NO AR (com a porta, se houver), PARADO ou NÃO CRIADO (antes tudo isso era "OFF"). */
export const TopologyNodeBadge: React.FC<{ node: { exists: boolean; running: boolean }; runningLabel?: string }> = ({ node, runningLabel }) => {
  const s = nodeStatusLabel(node);
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TONE[s.tone]}`}>{s.tone === 'running' && runningLabel ? runningLabel : s.label}</span>;
};
