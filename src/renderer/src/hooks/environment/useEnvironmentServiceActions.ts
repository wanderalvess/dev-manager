import { useState } from 'react';
import type { ServiceStatus } from '../../../../shared/types';
import type { EnvironmentLogEntry } from './useEnvironmentLogs';
import type { Dispatch, SetStateAction } from 'react';

interface UseEnvironmentServiceActionsOptions {
  services: ServiceStatus[];
  refreshAllStatus: () => void;
  setLogs: Dispatch<SetStateAction<EnvironmentLogEntry[]>>;
}

/** Ações de serviços Windows e processos conflitantes (individuais e em lote). */
export function useEnvironmentServiceActions({ services, refreshAllStatus, setLogs }: UseEnvironmentServiceActionsOptions) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedServiceRows, setSelectedServiceRows] = useState<Set<string>>(new Set());

  const handleStartService = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`start-${name}`);
    try {
      await window.electronAPI.startService(name);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopService = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`stop-${name}`);
    try {
      await window.electronAPI.stopService(name);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchStopServices = async () => {
    if (!window.electronAPI) return;
    const targets =
      selectedServiceRows.size > 0
        ? Array.from(selectedServiceRows)
        : services.filter((s) => s.state === 'RUNNING').map((s) => s.name);

    if (targets.length === 0) return;
    setActionLoading('batch-stop-srv');
    try {
      await window.electronAPI.batchStopServices(targets);
      refreshAllStatus();
      setSelectedServiceRows(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchStartServices = async () => {
    if (!window.electronAPI) return;
    const targets =
      selectedServiceRows.size > 0
        ? Array.from(selectedServiceRows)
        : services.filter((s) => s.state !== 'RUNNING').map((s) => s.name);

    if (targets.length === 0) return;
    setActionLoading('batch-start-srv');
    try {
      await window.electronAPI.batchStartServices(targets);
      refreshAllStatus();
      setSelectedServiceRows(new Set());
    } finally {
      setActionLoading(null);
    }
  };

  const handleKillProcess = async (name: string) => {
    if (!window.electronAPI) return;
    setActionLoading(`kill-${name}`);
    try {
      const ok = await window.electronAPI.batchKillProcesses([name]);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: ok[name] ? 'success' : 'info',
          message: ok[name]
            ? `Processo ${name} encerrado com sucesso.`
            : `Processo ${name} não estava em execução.`
        }
      ]);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  return {
    actionLoading,
    setActionLoading,
    handleStartService,
    handleStopService,
    handleBatchStopServices,
    handleBatchStartServices,
    handleKillProcess
  };
}
