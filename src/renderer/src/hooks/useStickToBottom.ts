import { useCallback, useEffect, useRef } from 'react';
import { isNearBottom } from '../utils/stickToBottom';

/**
 * Mantém um contêiner rolável colado no fim enquanto `deps` mudam, pausando se o usuário rolar para cima
 * (e retomando quando ele voltar ao fim). Retorna o `ref` e o `onScroll` para o contêiner.
 */
export function useStickToBottom<T extends HTMLElement>(deps: readonly unknown[]) {
  const ref = useRef<T>(null);
  const stuck = useRef(true);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    stuck.current = isNearBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, onScroll };
}
