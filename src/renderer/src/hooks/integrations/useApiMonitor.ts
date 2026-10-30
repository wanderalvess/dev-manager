import { useCallback, useEffect, useRef, useState } from 'react';
import type { HttpProbeMethod, HttpProbeResult } from '../../../../shared/types';
import {
  DEFAULT_API_MONITOR_PREFS,
  normalizeMonitorUrl,
  parseApiMonitorPrefs,
  parseHeaderLines,
  pushProbeHistory,
  type ApiMonitorPrefs
} from '../../utils/apiMonitorUtils';

const STORAGE_KEY = 'hub.integrations.apiMonitor';

function loadPrefs(): ApiMonitorPrefs {
  try {
    return parseApiMonitorPrefs(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULT_API_MONITOR_PREFS };
  }
}

function savePrefs(prefs: ApiMonitorPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // armazenamento indisponível: só não lembra na próxima abertura
  }
}

/**
 * Estado do monitor de API da tela Integrações: checagem manual ou em intervalo, com histórico.
 * O intervalo só roda com a tela aberta e pula as checagens enquanto a janela está oculta.
 */
export function useApiMonitor() {
  const [prefs, setPrefs] = useState<ApiMonitorPrefs>(loadPrefs);
  const [headersText, setHeadersText] = useState('');
  const [history, setHistory] = useState<HttpProbeResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [watching, setWatching] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const target = useRef({ prefs, headersText });
  target.current = { prefs, headersText };

  useEffect(() => savePrefs(prefs), [prefs]);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    const { prefs: current, headersText: rawHeaders } = target.current;
    const url = normalizeMonitorUrl(current.url);
    if (!url) {
      setInputError('Informe a URL da API.');
      setWatching(false);
      return;
    }
    const { headers, errors } = parseHeaderLines(rawHeaders);
    if (errors.length > 0) {
      setInputError(errors.join(' '));
      setWatching(false);
      return;
    }
    setInputError(null);
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await window.electronAPI.probeHttpEndpoint({ url, method: current.method, headers });
      setHistory((prev) => pushProbeHistory(prev, result));
    } catch (err: any) {
      setHistory((prev) =>
        pushProbeHistory(prev, {
          url,
          method: current.method,
          ok: false,
          status: 0,
          statusText: '',
          durationMs: 0,
          sizeBytes: 0,
          contentType: '',
          headers: {},
          bodyPreview: '',
          truncated: false,
          checkedAt: Date.now(),
          error: err?.message || 'Falha ao chamar a checagem.'
        })
      );
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!watching || prefs.intervalSeconds <= 0) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void check();
    }, prefs.intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [watching, prefs.intervalSeconds, check]);

  /** Trocar URL ou método começa um histórico novo: misturar endpoints distorce a disponibilidade. */
  const setUrl = useCallback((url: string) => {
    setPrefs((p) => ({ ...p, url }));
    setHistory([]);
    setWatching(false);
  }, []);
  const setMethod = useCallback((method: HttpProbeMethod) => {
    setPrefs((p) => ({ ...p, method }));
    setHistory([]);
  }, []);
  const setIntervalSeconds = useCallback((intervalSeconds: number) => {
    setPrefs((p) => ({ ...p, intervalSeconds }));
    if (intervalSeconds <= 0) setWatching(false);
  }, []);

  const startWatching = useCallback(() => {
    setWatching(true);
    void check();
  }, [check]);
  const stopWatching = useCallback(() => setWatching(false), []);
  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    prefs,
    headersText,
    setHeadersText,
    setUrl,
    setMethod,
    setIntervalSeconds,
    history,
    latest: history[0] ?? null,
    checking,
    watching,
    inputError,
    check,
    startWatching,
    stopWatching,
    clearHistory
  };
}
