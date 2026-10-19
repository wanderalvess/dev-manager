import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import type { TopologyBusStackState } from '../../../utils/topologyBusState';

export const TopologyStackBadge: React.FC<{ state: TopologyBusStackState }> = ({ state }) => {
  if (state === 'complete') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        STACK TOTALMENTE OPERACIONAL
      </span>
    );
  }
  if (state === 'missing') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
        <AlertCircle className="w-3 h-3 text-danger" />
        ALERTA: ORACLE OFFLINE COM SERVIÇOS ATIVOS
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 text-2xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
      <Clock className="w-3 h-3 text-warning" />
      STACK PARCIALMENTE ATIVA
    </span>
  );
};
