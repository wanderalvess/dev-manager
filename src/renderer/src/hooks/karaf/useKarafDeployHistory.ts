import { useState, useEffect, useMemo } from 'react';
import type { KarafDeployHistoryEntry } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import {
  computeKarafDeployStats,
  filterKarafDeployHistory,
  type KarafDeployHistoryFilter
} from '../../utils/karafDeployHistoryUtils';

export function useKarafDeployHistory(isOpen: boolean) {
  const [deployHistory, setDeployHistory] = useState<KarafDeployHistoryEntry[]>([]);
  const [isLoadingDeployHistory, setIsLoadingDeployHistory] = useState(false);
  const [deployHistorySearch, setDeployHistorySearch] = useState('');
  const [deployHistoryFilter, setDeployHistoryFilter] = useState<KarafDeployHistoryFilter>('ALL');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const { copy: copyDeployCoord, copiedKey: copiedDeployCoordKey } = useCopyToClipboard(2000);

  const fetchDeployHistory = async () => {
    if (!window.electronAPI?.getKarafDeployHistory) return;
    setIsLoadingDeployHistory(true);
    try {
      setDeployHistory(await window.electronAPI.getKarafDeployHistory());
    } catch {
      setDeployHistory([]);
    } finally {
      setIsLoadingDeployHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDeployHistorySearch('');
      setDeployHistoryFilter('ALL');
      setExpandedErrorId(null);
      fetchDeployHistory();
    }
  }, [isOpen]);

  const deployStats = useMemo(() => computeKarafDeployStats(deployHistory), [deployHistory]);

  const filteredDeployHistory = useMemo(
    () => filterKarafDeployHistory(deployHistory, deployHistoryFilter, deployHistorySearch),
    [deployHistory, deployHistoryFilter, deployHistorySearch]
  );

  const clearFilters = () => {
    setDeployHistorySearch('');
    setDeployHistoryFilter('ALL');
  };

  return {
    deployHistory,
    isLoadingDeployHistory,
    deployHistorySearch,
    setDeployHistorySearch,
    deployHistoryFilter,
    setDeployHistoryFilter,
    expandedErrorId,
    setExpandedErrorId,
    copyDeployCoord,
    copiedDeployCoordKey,
    fetchDeployHistory,
    deployStats,
    filteredDeployHistory,
    clearFilters
  };
}
