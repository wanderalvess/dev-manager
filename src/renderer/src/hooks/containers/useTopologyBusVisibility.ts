import { useState } from 'react';

const STORAGE_KEY = 'winthor_show_topology_bus';

function persist(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage indisponível
  }
}

/** Visibilidade do barramento de topologia, persistida em localStorage. */
export function useTopologyBusVisibility() {
  const [showTopologyBus, setShowTopologyBus] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const toggleTopologyBus = () => {
    const next = !showTopologyBus;
    setShowTopologyBus(next);
    persist(next);
  };

  const hideTopologyBus = () => {
    setShowTopologyBus(false);
    persist(false);
  };

  return { showTopologyBus, toggleTopologyBus, hideTopologyBus };
}
