import React, { useState } from 'react';
import { navigateCommandHistory } from '../../utils/deployProfileUtils';

interface UseKarafCommandPromptArgs {
  isBlocked: boolean;
  onRun: (cmd: string, label: string) => void;
}

export function useKarafCommandPrompt({ isBlocked, onRun }: UseKarafCommandPromptArgs) {
  const [customCommand, setCustomCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number>(-1);

  const handleCustomCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = customCommand.trim();
    if (!cmd || isBlocked) return;
    setCommandHistory((prev) => [...prev, cmd]);
    setCommandHistoryIndex(-1);
    setCustomCommand('');
    onRun(cmd, 'custom');
  };

  const handleCustomCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const next = navigateCommandHistory(commandHistory, commandHistoryIndex, e.key === 'ArrowUp' ? 'up' : 'down');
    if (!next) return;
    setCommandHistoryIndex(next.index);
    setCustomCommand(next.value);
  };

  return { customCommand, setCustomCommand, handleCustomCommandSubmit, handleCustomCommandKeyDown };
}
