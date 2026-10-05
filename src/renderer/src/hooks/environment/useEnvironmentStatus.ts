import { useState, useEffect, useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
  PortStatus,
  ProcessStatus,
  AppSettings,
  NetworkIpInfo,
  HttpHealthResult,
  getWebUrl
} from '../../../../shared/types';

// Após uma falha de rede (ex: backend indisponível), pausa novas tentativas dessa chamada por esse período
// em vez de tentar de novo a cada render/poll — evita hammering do processo quando o servidor está fora do ar.
const FETCH_FAILURE_COOLDOWN_MS = 5000;

interface UseEnvironmentStatusOptions {
  onRefreshServices: () => void;
  isActive?: boolean;
  settingsRef: MutableRefObject<AppSettings | null>;
}

/** Status periódico de portas, processos, Karaf embedded, IPs de rede e saúde do portal web. */
export function useEnvironmentStatus({ onRefreshServices, isActive, settingsRef }: UseEnvironmentStatusOptions) {
  const [ports, setPorts] = useState<PortStatus[]>([]);
  const [processes, setProcesses] = useState<ProcessStatus[]>([]);
  const [isCheckingPorts, setIsCheckingPorts] = useState(false);
  const [isCheckingProcesses, setIsCheckingProcesses] = useState(false);
  const [isKarafEmbeddedRunning, setIsKarafEmbeddedRunning] = useState<boolean>(false);
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo | null>(null);
  const [webHealth, setWebHealth] = useState<HttpHealthResult | null>(null);

  const portsRef = useRef<PortStatus[]>(ports);
  portsRef.current = ports;

  // Cada checagem tem trava contra chamadas sobrepostas e comparação de igualdade para evitar re-render
  const isCheckingPortsRef = useRef(false);
  const portsFailureUntilRef = useRef(0);
  const fetchPorts = useCallback(async () => {
    if (isCheckingPortsRef.current) return;
    if (Date.now() < portsFailureUntilRef.current) return;
    if (window.electronAPI && window.electronAPI.checkPorts) {
      isCheckingPortsRef.current = true;
      setIsCheckingPorts(true);
      try {
        const portData = await window.electronAPI.checkPorts();
        setPorts((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(portData)) return prev;
          return portData || [];
        });
      } catch (err) {
        portsFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.warn('Erro ao verificar portas:', err);
      } finally {
        setIsCheckingPorts(false);
        isCheckingPortsRef.current = false;
      }
    }
  }, []);

  const isCheckingProcessesRef = useRef(false);
  const processesFailureUntilRef = useRef(0);
  const fetchProcesses = useCallback(async () => {
    if (isCheckingProcessesRef.current) return;
    if (Date.now() < processesFailureUntilRef.current) return;
    if (window.electronAPI && window.electronAPI.getProcessesStatus) {
      isCheckingProcessesRef.current = true;
      setIsCheckingProcesses(true);
      try {
        const procData = await window.electronAPI.getProcessesStatus();
        setProcesses((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(procData)) return prev;
          return procData || [];
        });
      } catch (err) {
        processesFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.warn('Erro ao verificar processos:', err);
      } finally {
        setIsCheckingProcesses(false);
        isCheckingProcessesRef.current = false;
      }
    }
  }, []);

  const isCheckingKarafRef = useRef(false);
  const karafFailureUntilRef = useRef(0);
  const checkKarafRunning = useCallback(async () => {
    if (isCheckingKarafRef.current) return;
    if (Date.now() < karafFailureUntilRef.current) return;
    if (window.electronAPI && window.electronAPI.isEmbeddedKarafRunning) {
      isCheckingKarafRef.current = true;
      try {
        const running = await window.electronAPI.isEmbeddedKarafRunning();
        setIsKarafEmbeddedRunning((prev) => (prev === running ? prev : running));
      } catch (err) {
        karafFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.warn('Erro ao verificar status do Karaf embedded:', err);
      } finally {
        isCheckingKarafRef.current = false;
      }
    }
  }, []);

  const isCheckingNetworkRef = useRef(false);
  const networkFailureUntilRef = useRef(0);
  const fetchNetworkIps = useCallback(async () => {
    if (isCheckingNetworkRef.current) return;
    if (Date.now() < networkFailureUntilRef.current) return;
    if (window.electronAPI && window.electronAPI.getNetworkIps) {
      isCheckingNetworkRef.current = true;
      try {
        const data = await window.electronAPI.getNetworkIps();
        setNetworkIps((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      } catch (err) {
        networkFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.error('Erro ao buscar IPs de rede:', err);
      } finally {
        isCheckingNetworkRef.current = false;
      }
    }
  }, []);

  // Checagem Web Health estável com URL computada via refs atuais
  const isCheckingWebHealthRef = useRef(false);
  const webHealthFailureUntilRef = useRef(0);
  const checkWebHealth = useCallback(async () => {
    if (isCheckingWebHealthRef.current) return;
    if (Date.now() < webHealthFailureUntilRef.current) return;
    if (window.electronAPI && window.electronAPI.checkHttpHealth) {
      isCheckingWebHealthRef.current = true;
      try {
        const url = getWebUrl(settingsRef.current, '', portsRef.current);
        const res = await window.electronAPI.checkHttpHealth(url, 2000);
        setWebHealth((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(res)) return prev;
          return res;
        });
      } catch {
        webHealthFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        setWebHealth(null);
      } finally {
        isCheckingWebHealthRef.current = false;
      }
    }
  }, [settingsRef]);

  const refreshAllStatus = useCallback(() => {
    onRefreshServices();
    fetchPorts();
    fetchProcesses();
    checkKarafRunning();
    fetchNetworkIps();
    checkWebHealth();
  }, [onRefreshServices, fetchPorts, fetchProcesses, checkKarafRunning, fetchNetworkIps, checkWebHealth]);

  // Polling de 8s condicionado à visibilidade da tela
  useEffect(() => {
    if (isActive === false) return;
    refreshAllStatus();

    const interval = setInterval(() => {
      fetchPorts();
      fetchProcesses();
      checkKarafRunning();
      checkWebHealth();
    }, 8000);
    return () => clearInterval(interval);
  }, [isActive, refreshAllStatus, fetchPorts, fetchProcesses, checkKarafRunning, checkWebHealth]);

  return {
    ports,
    processes,
    isCheckingPorts,
    isCheckingProcesses,
    isKarafEmbeddedRunning,
    networkIps,
    webHealth,
    fetchNetworkIps,
    checkKarafRunning,
    refreshAllStatus
  };
}
