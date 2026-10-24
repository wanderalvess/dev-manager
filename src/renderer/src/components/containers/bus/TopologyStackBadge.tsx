import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import type { TopologyBusStackState } from '../../../utils/topologyBusState';

export const TopologyStackBadge: React.FC<{ state: TopologyBusStackState }> = ({ state }) => {
  if (state === 'complete') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[13px] font-medium flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        STACK TOTALMENTE OPERACIONAL
      </span>
    );
  }
  if (state === 'missing') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-danger/10 text-danger text-[13px] font-medium flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3 text-danger" />
        ALERTA: ORACLE OFFLINE COM SERVIÇOS ATIVOS
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-warning/10 text-warning text-[13px] font-medium flex items-center gap-1.5">
      <Clock className="w-3 h-3 text-warning" />
      STACK PARCIALMENTE ATIVA
    </span>
  );
};
