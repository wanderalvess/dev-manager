import { useEffect } from 'react';
import { useKarafConsole, type ConsoleEntry } from '../karafConsole/KarafConsoleContext';

export type EnvironmentLogEntry = ConsoleEntry;

interface UseEnvironmentLogsOptions {
  refreshAllStatus: () => void;
  checkKarafRunning: () => void;
}

/** Logs do ambiente vêm do console global; aqui só reagimos aos eventos para atualizar o status da página. */
export function useEnvironmentLogs({ refreshAllStatus, checkKarafRunning }: UseEnvironmentLogsOptions) {
  const { logs, setLogs, subscribe } = useKarafConsole();

  useEffect(
    () =>
      subscribe((event) => {
        if (event.kind === 'karaf-stdout') {
          checkKarafRunning();
        } else if (event.log.message.includes('sucesso') || event.log.message.includes('🎉')) {
          refreshAllStatus();
        }
      }),
    [subscribe, refreshAllStatus, checkKarafRunning]
  );

  return { logs, setLogs };
}
