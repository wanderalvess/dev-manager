import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StatusIconProps {
  status: string;
  className?: string;
}

/** Ícone de status: aprovado, abortado ou falha (qualquer outro valor). */
export const StatusIcon: React.FC<StatusIconProps> = ({ status, className = 'w-4 h-4' }) => {
  if (status === 'passed') return <CheckCircle2 className={`${className} text-emerald-400`} />;
  if (status === 'aborted') return <AlertTriangle className={`${className} text-amber-400`} />;
  return <XCircle className={`${className} text-rose-400`} />;
};
