import { useCallback, useState } from 'react';

export function useCopyToClipboard(timeoutMs = 1800) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, key = 'default') => {
      try {
        await navigator.clipboard?.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), timeoutMs);
      } catch {
        // ignore clipboard error
      }
    },
    [timeoutMs]
  );

  return { copy, copiedKey };
}
