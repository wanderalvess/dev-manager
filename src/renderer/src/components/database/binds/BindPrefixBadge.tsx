import React from 'react';
import { SqlVariablePrefix } from '../../../utils/sqlBinds';
import { getBindBadgeTone } from '../../../utils/bindVariablesModal';

interface BindPrefixBadgeProps {
  prefix?: SqlVariablePrefix;
}

export const BindPrefixBadge: React.FC<BindPrefixBadgeProps> = ({ prefix }) => {
  switch (getBindBadgeTone(prefix)) {
    case 'sqlplus':
      return (
        <span
          className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning"
          title="Variável de substituição do SQL*Plus / PL/SQL / WinThor (&VAR)"
        >
          {prefix} SQL*Plus
        </span>
      );
    case 'script':
      return (
        <span
          className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-info/20 text-info"
          title="Variável de script / sessão (@VAR)"
        >
          @ Script
        </span>
      );
    case 'template':
      return (
        <span
          className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30"
          title="Placeholder de template / MyBatis (${VAR})"
        >
          {prefix} Template
        </span>
      );
    default:
      return (
        <span
          className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30"
          title="Bind Variable nativa (:VAR)"
        >
          : Bind
        </span>
      );
  }
};
