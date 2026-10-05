import React from 'react';
import { formatCellValue, getCellKind } from '../../../utils/resultsGridUtils';
import type { ResultsGridDataType } from '../../../utils/resultsGridUtils';

interface ResultsGridCellContentProps {
  value: any;
  dataType: ResultsGridDataType;
}

export const ResultsGridCellContent: React.FC<ResultsGridCellContentProps> = ({ value, dataType }) => {
  const kind = getCellKind(value, dataType);

  switch (kind) {
    case 'null':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono select-none bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 italic border border-slate-300/70 dark:border-slate-700/70">
          [NULL]
        </span>
      );
    case 'number':
      return <span className="text-blue-700 dark:text-sky-300 font-mono font-medium">{formatCellValue(value, kind)}</span>;
    case 'date':
      return <span className="text-purple-700 dark:text-purple-300 font-mono font-medium">{formatCellValue(value, kind)}</span>;
    case 'boolean':
      return <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">{formatCellValue(value, kind)}</span>;
    case 'object':
      return <span className="text-teal-700 dark:text-teal-300 font-mono text-[11px]">{formatCellValue(value, kind)}</span>;
    default:
      return <span className="text-slate-800 dark:text-slate-100 font-mono">{formatCellValue(value, kind)}</span>;
  }
};
