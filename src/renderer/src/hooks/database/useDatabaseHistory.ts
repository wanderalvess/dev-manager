import { useState } from 'react';
import type { ExecutionHistoryItem } from '../../utils/dbPageTypes';

const HISTORY_KEY = 'devManager:dbHistory';
const HISTORY_LIMIT = 50;

/** Histórico persistente de execuções (deduplicado por SQL, limitado a 50 itens). */
export function useDatabaseHistory() {
  const [history, setHistory] = useState<ExecutionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addHistoryItem = (item: ExecutionHistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((h) => h.sql !== item.sql).slice(0, HISTORY_LIMIT - 1)];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de consultas salvas?')) {
      setHistory([]);
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  };

  return { history, addHistoryItem, handleClearHistory };
}
