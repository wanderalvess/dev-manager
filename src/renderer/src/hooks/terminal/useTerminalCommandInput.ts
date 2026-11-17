import { useState } from 'react';

export function useTerminalCommandInput(
  onSendCommand?: (cmd: string) => void,
  onAbort?: () => void,
  onClear?: () => void
) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const handleSend = () => {
    const cmd = inputCommand.trim();
    if (!cmd || !onSendCommand) return;
    onSendCommand(cmd);
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key.toLowerCase() === 'c' && e.ctrlKey && !e.altKey && !e.metaKey && onAbort) {
      e.preventDefault();
      onAbort();
    } else if (e.key.toLowerCase() === 'l' && e.ctrlKey && !e.altKey && !e.metaKey && onClear) {
      e.preventDefault();
      onClear();
    } else if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const next = Math.min(history.length - 1, histIdx + 1);
      setHistIdx(next);
      setInputCommand(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInputCommand(next >= 0 ? history[next] || '' : '');
    }
  };

  return { inputCommand, setInputCommand, handleSend, handleKeyDown };
}
