import { Terminal, Activity, Server, Flame, Code2, Bug, Globe, Zap } from 'lucide-react';
import type { AutomationStep } from '../../../../shared/types';

/** Ícone por tipo de etapa. */
export const getStepIcon = (type: AutomationStep['type']) => {
  switch (type) {
    case 'command':
      return Terminal;
    case 'kill-port':
      return Activity;
    case 'service-start':
    case 'service-stop':
      return Server;
    case 'kill-process':
      return Flame;
    case 'ide':
      return Code2;
    case 'karaf':
      return Bug;
    case 'browser':
      return Globe;
    default:
      return Zap;
  }
};
