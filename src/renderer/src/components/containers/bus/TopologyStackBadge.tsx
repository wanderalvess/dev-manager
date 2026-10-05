import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import type { TopologyBusStackState } from '../../../utils/topologyBusState';

export const TopologyStackBadge: React.FC<{ state: TopologyBusStackState }> = ({ state }) => {
  if (state === 'complete') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        STACK TOTALMENTE OPERACIONAL
      </span>
    );
  }
  if (state === 'missing') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
        <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        ALERTA: ORACLE OFFLINE COM SERVIÇOS ATIVOS
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
      STACK PARCIALMENTE ATIVA
    </span>
  );
};
