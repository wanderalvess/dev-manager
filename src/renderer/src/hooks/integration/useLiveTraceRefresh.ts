import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntegrationTraceResult } from '../../../../shared/integrationTypes';
import { canGoLive, decideLive, LIVE_INTERVAL_MS, secondsUntil } from '../../utils/liveTrace';
import { showToast } from '../../components/ToastHost';

/**
 * Modo ao vivo: enquanto as lojas ainda baixam o lote, reconsulta o PDVSync a cada 15 s, no mesmo rastreio do histórico.
 * Liga sozinho ao abrir um rastreio com a chegada em andamento e para quando as lojas terminam, quando falha,
 * no teto de consultas ou quando o usuário pede.
 */
export function useLiveTraceRefresh(trace: IntegrationTraceResult | null, onUpdate: (trace: IntegrationTraceResult) => void, onSaved: () => void) {
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(false);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stopReason, setStopReason] = useState<string | null>(null);
  const attempts = useRef(0);
  const traceRef = useRef(trace);
  traceRef.current = trace;
  const callbacks = useRef({ onUpdate, onSaved });
  callbacks.current = { onUpdate, onSaved };

  const traceId = trace?.id;
  // Cada rastreio aberto começa do zero; liga sozinho se a chegada ainda está em andamento
  useEffect(() => {
    attempts.current = 0;
    setStopReason(null);
    setActive(canGoLive(traceRef.current) && Boolean(window.electronAPI?.integrationRefreshTrace));
  }, [traceId]);

  useEffect(() => {
    if (!active || !traceId) {
      setNextAt(null);
      return;
    }
    let cancelled = false;
    // O relógio só anda enquanto está ao vivo; sem acertá-lo aqui a contagem começaria de um instante antigo
    const scheduledAt = Date.now();
    setNow(scheduledAt);
    setNextAt(scheduledAt + LIVE_INTERVAL_MS);
    const timer = window.setTimeout(async () => {
      const refresh = window.electronAPI?.integrationRefreshTrace;
      if (!refresh) return;
      setChecking(true);
      try {
        const response = await refresh(traceId);
        if (cancelled) return;
        if (!response.success) {
          setActive(false);
          setStopReason(response.error);
          showToast(`Modo ao vivo parado: ${response.error}`, 'error');
          return;
        }
        attempts.current += 1;
        const decision = decideLive(response.trace, attempts.current);
        callbacks.current.onUpdate(response.trace);
        callbacks.current.onSaved();
        if (!decision.keepGoing) {
          setActive(false);
          setStopReason(decision.reason);
          showToast(decision.reason, decision.tone);
        }
      } catch (err) {
        if (cancelled) return;
        setActive(false);
        const message = (err as Error)?.message || 'falha ao reconsultar o lote';
        setStopReason(message);
        showToast(`Modo ao vivo parado: ${message}`, 'error');
      } finally {
        setChecking(false);
      }
    }, LIVE_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // A cada reconsulta o rastreio muda e o próximo ciclo é agendado
  }, [active, traceId, trace]);

  // Relógio da contagem regressiva, só enquanto está ao vivo
  useEffect(() => {
    if (!active) return;
    const ticker = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, [active]);

  const start = useCallback(() => {
    attempts.current = 0;
    setStopReason(null);
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setStopReason('Acompanhamento parado por você.');
  }, []);

  return {
    active,
    checking,
    attempts: attempts.current,
    secondsLeft: secondsUntil(nextAt, now),
    stopReason,
    canStart: !active && canGoLive(trace),
    start,
    stop
  };
}
