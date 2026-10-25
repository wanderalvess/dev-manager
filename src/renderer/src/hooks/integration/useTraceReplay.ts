import { useCallback, useEffect, useRef, useState } from 'react';
import { timelineAt, type TimelineFrame, type TraceAnimationModel } from '../../utils/traceAnimationModel';

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const totalMs = (model: TraceAnimationModel) => model.steps.slice(0, model.stopIndex + 1).reduce((sum, step) => sum + step.animMs, 0);

/**
 * Toca o percurso do lote uma vez quando um rastreio novo aparece (ou quando o usuário pede o replay).
 * Uma reconsulta do mesmo rastreio (modo ao vivo) não recomeça a animação: só atualiza o estado final.
 * Com movimento reduzido, vai direto para o fim.
 */
export function useTraceReplay(model: TraceAnimationModel, traceId: string) {
  const reducedMotion = useRef(prefersReducedMotion()).current;
  const [elapsed, setElapsed] = useState(reducedMotion ? Number.POSITIVE_INFINITY : 0);
  const [runKey, setRunKey] = useState(0);
  const animationFrame = useRef(0);
  const modelRef = useRef(model);
  modelRef.current = model;
  const lastTraceId = useRef(traceId);

  useEffect(() => {
    if (lastTraceId.current === traceId) return;
    lastTraceId.current = traceId;
    setRunKey((key) => key + 1);
  }, [traceId]);

  useEffect(() => {
    if (reducedMotion) {
      setElapsed(Number.POSITIVE_INFINITY);
      return;
    }
    const startedAt = performance.now();
    setElapsed(0);
    const tick = (now: number) => {
      const spent = now - startedAt;
      if (spent >= totalMs(modelRef.current)) {
        setElapsed(Number.POSITIVE_INFINITY);
        return;
      }
      setElapsed(spent);
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [runKey, reducedMotion]);

  const replay = useCallback(() => setRunKey((key) => key + 1), []);
  const skip = useCallback(() => {
    cancelAnimationFrame(animationFrame.current);
    setElapsed(Number.POSITIVE_INFINITY);
  }, []);

  const frame: TimelineFrame = timelineAt(model, elapsed);
  return { frame, playing: !frame.done, replay, skip, reducedMotion };
}
