import { useRef, useEffect, useState } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import {
  filterTerminalLogs,
  formatTerminalLogsForCopy,
  type TerminalFilterType,
  type TerminalLog
} from '../../utils/terminalViewerUtils';

export function useTerminalViewer(logs: TerminalLog[], defaultWordWrap: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { copy: copyLogs, copiedKey } = useCopyToClipboard(2000);
  const copied = copiedKey === 'logs';
  const [filterType, setFilterType] = useState<TerminalFilterType>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [wordWrap, setWordWrap] = useState(defaultWordWrap);

  // Auto-rolagem para o fim a cada novo log enquanto ativa
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    copyLogs(formatTerminalLogsForCopy(logs), 'logs');
  };

  const filteredLogs = filterTerminalLogs(logs, filterType, searchFilter);

  return {
    scrollRef,
    copied,
    filterType,
    setFilterType,
    searchFilter,
    setSearchFilter,
    autoScroll,
    setAutoScroll,
    wordWrap,
    setWordWrap,
    handleCopy,
    filteredLogs
  };
}
