import type { HttpProbeMethod, HttpProbeResult } from '../../../shared/types';

/** Intervalos da checagem automática, em segundos (0 = só manual). */
export const API_MONITOR_INTERVALS: { seconds: number; label: string }[] = [
  { seconds: 0, label: 'Só manual' },
  { seconds: 15, label: 'A cada 15 s' },
  { seconds: 30, label: 'A cada 30 s' },
  { seconds: 60, label: 'A cada 1 min' },
  { seconds: 300, label: 'A cada 5 min' }
];

/** Quantas checagens ficam no histórico da tela. */
export const API_MONITOR_HISTORY_SIZE = 30;

/** O que fica salvo entre aberturas da tela. Cabeçalhos ficam de fora: podem ter token. */
export interface ApiMonitorPrefs {
  url: string;
  method: HttpProbeMethod;
  intervalSeconds: number;
}

export const DEFAULT_API_MONITOR_PREFS: ApiMonitorPrefs = { url: '', method: 'GET', intervalSeconds: 0 };

export function parseApiMonitorPrefs(raw: string | null | undefined): ApiMonitorPrefs {
  if (!raw) return { ...DEFAULT_API_MONITOR_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<ApiMonitorPrefs>;
    const interval = Number(parsed.intervalSeconds);
    return {
      url: typeof parsed.url === 'string' ? parsed.url : '',
      method: parsed.method === 'HEAD' ? 'HEAD' : 'GET',
      intervalSeconds: API_MONITOR_INTERVALS.some((i) => i.seconds === interval) ? interval : 0
    };
  } catch {
    return { ...DEFAULT_API_MONITOR_PREFS };
  }
}

/**
 * Lê cabeçalhos no formato `Nome: valor`, um por linha. Linhas vazias e começando com `#` são
 * ignoradas; linha sem `:` vira erro para o usuário corrigir.
 */
export function parseHeaderLines(text: string): { headers: Record<string, string>; errors: string[] } {
  const headers: Record<string, string> = {};
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) {
      errors.push(`Linha ${index + 1}: use o formato "Nome: valor".`);
      return;
    }
    headers[trimmed.slice(0, colon).trim()] = trimmed.slice(colon + 1).trim();
  });
  return { headers, errors };
}

/** Completa `localhost:8080/x` com `http://`, para não falhar só pela falta do protocolo. */
export function normalizeMonitorUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export type ProbeTone = 'success' | 'warning' | 'danger';

/** 2xx verde, 3xx/4xx amarelo (a API respondeu, mas não o esperado), 5xx e falha de rede vermelho. */
export function probeTone(result: Pick<HttpProbeResult, 'status' | 'error'>): ProbeTone {
  if (result.error || result.status === 0 || result.status >= 500) return 'danger';
  if (result.status >= 300) return 'warning';
  return 'success';
}

export interface ProbeHistorySummary {
  total: number;
  okCount: number;
  /** Percentual de respostas 2xx, inteiro. */
  uptimePct: number;
  avgMs: number;
  maxMs: number;
}

export function summarizeProbeHistory(history: readonly HttpProbeResult[]): ProbeHistorySummary {
  if (history.length === 0) return { total: 0, okCount: 0, uptimePct: 0, avgMs: 0, maxMs: 0 };
  const okCount = history.filter((r) => r.ok).length;
  const durations = history.map((r) => r.durationMs);
  return {
    total: history.length,
    okCount,
    uptimePct: Math.round((okCount / history.length) * 100),
    avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    maxMs: Math.max(...durations)
  };
}

/** Novo resultado na frente, cortando o histórico no tamanho máximo. */
export function pushProbeHistory(history: readonly HttpProbeResult[], result: HttpProbeResult): HttpProbeResult[] {
  return [result, ...history].slice(0, API_MONITOR_HISTORY_SIZE);
}

/** Corpo para exibir: JSON indentado quando dá para ler como JSON, senão o texto como veio. */
export function formatProbeBody(result: Pick<HttpProbeResult, 'bodyPreview' | 'contentType' | 'truncated'>): {
  text: string;
  isJson: boolean;
} {
  const body = result.bodyPreview ?? '';
  const looksJson = /json/i.test(result.contentType) || /^\s*[[{]/.test(body);
  if (looksJson && !result.truncated) {
    try {
      return { text: JSON.stringify(JSON.parse(body), null, 2), isJson: true };
    } catch {
      // corpo diz ser JSON mas não é: mostra como veio
    }
  }
  return { text: body, isJson: false };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
