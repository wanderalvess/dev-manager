import React, { useState } from 'react';
import { getNextHistoryIndex, getPreviousHistoryIndex } from '../../utils/terminalViewerUtils';

export function useTerminalCommandInput(onSendCommand?: (cmd: string) => void, onAbort?: () => void) {
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
    // Interrompe execução se o usuário pressionar Ctrl+C (sem seleção de texto) ou Escape
    if (onAbort && ((e.key === 'c' && (e.ctrlKey || e.metaKey)) || e.key === 'Escape')) {
      const target = e.target as HTMLInputElement;
      const hasSelection = target.selectionStart !== null && target.selectionStart !== target.selectionEnd;
      if (!hasSelection || e.key === 'Escape') {
        e.preventDefault();
        onAbort();
        return;
      }
    }

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
