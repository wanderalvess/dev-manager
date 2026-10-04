import React, { useState } from 'react';
import type { Routine801Feature } from '../../../../shared/types';
import { buildFeatureKey } from '../../utils/routine801ModalUtils';

export const useRoutine801Selection = (filteredList: Routine801Feature[]) => {
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, Routine801Feature>>({});
  const [batchVersionOverride, setBatchVersionOverride] = useState<string>('');

  const clearSelection = () => setSelectedFeatures({});

  const handleToggleSelectAll = () => {
    if (Object.keys(selectedFeatures).length === filteredList.length) {
      setSelectedFeatures({});
    } else {
      const next: Record<string, Routine801Feature> = {};
      for (const item of filteredList) {
        next[buildFeatureKey(item)] = item;
      }
      setSelectedFeatures(next);
    }
  };

  const handleSelectAllFiltered = () => {
    const next: Record<string, Routine801Feature> = { ...selectedFeatures };
    for (const item of filteredList) {
      next[buildFeatureKey(item)] = item;
    }
    setSelectedFeatures(next);
  };

  const handleToggleSelectItem = (item: Routine801Feature, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const key = buildFeatureKey(item);
    setSelectedFeatures((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = item;
      }
      return next;
    });
  };

  return {
    selectedFeatures,
    batchVersionOverride,
    setBatchVersionOverride,
    clearSelection,
    handleToggleSelectAll,
    handleSelectAllFiltered,
    handleToggleSelectItem
  };
};
