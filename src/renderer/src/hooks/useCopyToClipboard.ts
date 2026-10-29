import { useCallback, useEffect, useRef, useState } from 'react';

function fallbackCopy(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Copia texto e diz se deu certo. No Electron o `navigator.clipboard` é recusado (o processo principal nega
 * todas as permissões da página), então o caminho que funciona lá é o `execCommand('copy')`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cai no fallback abaixo
  }
  return fallbackCopy(text);
}

/**
 * Copia texto para a área de transferência com fallback robusto e mantém uma "chave copiada" ativa
 * por `resetMs`, para feedback visual.
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
      void copyText(text);
      setCopiedKey(key);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedKey(null), resetMs);
    },
    [resetMs]
  );

  return { copy, copiedKey };
}
