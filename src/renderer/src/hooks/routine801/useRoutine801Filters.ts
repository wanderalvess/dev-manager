import { useMemo, useRef, useState } from 'react';
import type { Routine801Feature } from '../../../../shared/types';
import { extractVersionFamilies, filterRoutine801Features } from '../../utils/routine801UiUtils';

export const useRoutine801Filters = (currentList: Routine801Feature[]) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [versionFilter, setVersionFilter] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Famílias de versão detectadas no catálogo atual (ex: ['1.39', '1.38', '0.39'])
  const versionFamilies = useMemo(() => extractVersionFamilies(currentList), [currentList]);

  const filteredList = useMemo(
    () => filterRoutine801Features(currentList, searchQuery, typeFilter, statusFilter, versionFilter),
    [currentList, searchQuery, typeFilter, statusFilter, versionFilter]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setVersionFilter('ALL');
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    versionFilter,
    setVersionFilter,
    searchInputRef,
    versionFamilies,
    filteredList,
    clearFilters
  };
};
