import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copia texto para a área de transferência e mantém uma "chave copiada" ativa
 * por `resetMs`, para feedback visual (ex: trocar um ícone de copiar por um de
 * check). Compartilhado pelos vários componentes que reimplementavam o mesmo
 * par navigator.clipboard.writeText + useState + setTimeout individualmente.
 */
export function useCopyToClipboard(resetMs: number = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    (text: string, key: string = text) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedKey(null), resetMs);
    },
    [resetMs]
  );

  return { copy, copiedKey };
}
