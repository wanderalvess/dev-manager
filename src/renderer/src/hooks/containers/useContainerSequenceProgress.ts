import { useState, useEffect } from 'react';

export interface SequenceProgress {
  running: boolean;
  currentName?: string;
  index?: number;
  total?: number;
  waitingSeconds?: number;
  error?: string;
}

/** Progresso das sequências de startup/stop, alimentado pelos eventos IPC do main. */
export function useContainerSequenceProgress() {
  const [sequenceProgress, setSequenceProgress] = useState<SequenceProgress>({ running: false });

  useEffect(() => {
    const unsub = window.electronAPI?.onContainerSequenceProgress?.((step) => {
      setSequenceProgress((prev) => ({
        ...prev,
        running: true,
        currentName: step.currentName,
        index: step.index,
        total: step.total,
        waitingSeconds: step.waitingSeconds
      }));
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = (window.electronAPI as any)?.onContainerStopSequenceProgress?.((step: any) => {
      setSequenceProgress((prev) => ({
        ...prev,
        running: true,
        currentName: step.currentName,
        index: step.index,
        total: step.total,
        waitingSeconds: undefined
      }));
    });
    return () => unsub?.();
  }, []);

  return { sequenceProgress, setSequenceProgress };
}

export type SequenceProgressState = ReturnType<typeof useContainerSequenceProgress>;
