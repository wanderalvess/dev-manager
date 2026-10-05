import React, { useState } from 'react';
import { getNextHistoryIndex, getPreviousHistoryIndex } from '../../utils/terminalViewerUtils';

export function useTerminalCommandInput(onSendCommand?: (cmd: string) => void) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCommand.trim() || !onSendCommand) return;

    onSendCommand(inputCommand);
    setHistory((prev) => [...prev, inputCommand]);
    setHistoryIndex(-1);
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = getPreviousHistoryIndex(history.length, historyIndex);
      if (nextIdx === null) return;
      setHistoryIndex(nextIdx);
      setInputCommand(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = getNextHistoryIndex(history.length, historyIndex);
      if (nextIdx === null) return;
      setHistoryIndex(nextIdx);
      setInputCommand(nextIdx === -1 ? '' : history[nextIdx] || '');
    }
  };

  return { inputCommand, setInputCommand, handleSend, handleKeyDown };
}
