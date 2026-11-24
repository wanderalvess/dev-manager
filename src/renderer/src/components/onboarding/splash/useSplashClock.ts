import { useCallback, useEffect, useRef, useState } from 'react';
import { getSplashTiming } from '../splashTiming';

// Quadros seguidos abaixo desse intervalo (ms) indicam que o app terminou de montar e a tela está fluida
const SMOOTH_FRAME_MS = 34;
const SMOOTH_FRAMES_NEEDED = 5;
// Se o app nunca acalmar, a abertura começa mesmo assim depois disso
const MAX_WAIT_MS = 3000;

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

interface SplashClock {
  painted: boolean;
  completed: number;
  done: boolean;
  skip: () => void;
}

/**
 * Relógio da abertura. Não usa setTimeout: com o app pesado montando por baixo, o tempo real passa enquanto nenhum
 * quadro é desenhado e as linhas do boot apareceriam todas de uma vez. Aqui só avança o tempo dos quadros que
 * chegaram a ser desenhados (limitado a SMOOTH_FRAME_MS por quadro) e a abertura só começa depois de alguns quadros
 * fluidos seguidos.
 */
export function useSplashClock(isOpen: boolean, isNewUser: boolean, itemCount: number): SplashClock {
  const [completed, setCompleted] = useState(0);
  const [done, setDone] = useState(false);
  const [painted, setPainted] = useState(false);
  const rafRef = useRef(0);
  // isNewUser só muda quando a abertura já fechou; reiniciar o boot no meio dela seria pior que ignorar.
  const isNewUserRef = useRef(isNewUser);
  isNewUserRef.current = isNewUser;

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setCompleted(itemCount);
    setDone(true);
    setPainted(true);
  }, [itemCount]);

  useEffect(() => {
    if (!isOpen) return;
    setCompleted(0);
    setDone(false);
    setPainted(false);
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    const { bootStartMs, lineMs } = getSplashTiming(isNewUserRef.current);
    const endMs = bootStartMs + itemCount * lineMs;
    let last = 0;
    let waited = 0;
    let smooth = 0;
    let running = false;
    let elapsed = 0;
    let shown = 0;

    const tick = (now: number) => {
      const dt = last ? now - last : 0;
      last = now;
      if (!running) {
        waited += dt;
        smooth = dt > 0 && dt <= SMOOTH_FRAME_MS ? smooth + 1 : 0;
        if (smooth >= SMOOTH_FRAMES_NEEDED || waited >= MAX_WAIT_MS) {
          running = true;
          setPainted(true);
        }
      } else {
        elapsed += Math.min(dt, SMOOTH_FRAME_MS);
        const count = Math.min(itemCount, Math.max(0, Math.floor((elapsed - bootStartMs) / lineMs)));
        if (count !== shown) {
          shown = count;
          setCompleted(count);
        }
        if (elapsed >= endMs) {
          setDone(true);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, itemCount, finish]);

  return { painted, completed, done, skip: finish };
}
