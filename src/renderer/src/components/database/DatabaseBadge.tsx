import React from 'react';
import type { DatabaseType } from '../../../../shared/types';

export const getDbBadge = (type: DatabaseType): React.ReactNode => {
  switch (type) {
    case 'oracle':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-danger/10 text-danger">ORACLE</span>;
    case 'mysql':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-warning/10 text-warning">MYSQL</span>;
    case 'postgres':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-info/10 text-info">POSTGRES</span>;
  }
};
