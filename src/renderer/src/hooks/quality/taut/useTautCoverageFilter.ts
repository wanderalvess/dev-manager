import { useMemo, useState } from 'react';
import type { TautCoverageReport } from '../../../../../shared/types';
import { filterCoverageItems, type TautCoverageStatusFilter } from '../../../utils/tautPanelUtils';

export function useTautCoverageFilter(coverageReport: TautCoverageReport | null) {
  const [coverageSearch, setCoverageSearch] = useState<string>('');
  const [coverageStatusFilter, setCoverageStatusFilter] = useState<TautCoverageStatusFilter>('all');

  const filteredCoverageItems = useMemo(
    () => filterCoverageItems(coverageReport, coverageSearch, coverageStatusFilter),
    [coverageReport, coverageSearch, coverageStatusFilter]
  );

  return {
    coverageSearch,
    setCoverageSearch,
    coverageStatusFilter,
    setCoverageStatusFilter,
    filteredCoverageItems
  };
}
