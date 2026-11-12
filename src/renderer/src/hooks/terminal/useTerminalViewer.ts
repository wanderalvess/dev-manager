import { useEffect, useMemo, useRef, useState } from 'react';
import type { EnvironmentLog } from '../../../../shared/types';

export function useTerminalViewer(
  logs: (string | EnvironmentLog)[],
  defaultWordWrap: boolean,
  externalSearch: { text: string; nonce: number } | null
) {
  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [wordWrap, setWordWrap] = useState(defaultWordWrap);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalSearch?.text !== undefined) {
      setSearchFilter(externalSearch.text);
    }
  }, [externalSearch]);

  const filteredLogs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const txt = typeof l === 'string' ? l : l.message;
      return txt.toLowerCase().includes(q);
    });
  }, [logs, searchFilter]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  const handleCopy = async () => {
    const text = filteredLogs.map((l) => (typeof l === 'string' ? l : l.message)).join('\n');
    await navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return {
    searchFilter,
    setSearchFilter,
    filterType,
    setFilterType,
    wordWrap,
    setWordWrap,
    autoScroll,
    setAutoScroll,
    copied,
    handleCopy,
    filteredLogs,
    scrollRef
  };
}
