import { formatCcwCycleVersion, DEFAULT_CCW_WINTHOR_CYCLES } from '../../shared/ccwRoutineCommon';

export interface CcwEvolutionCyclesResult {
  success: boolean;
  cycles: string[];
  message?: string;
  error?: string;
}

/**
 * Extrai e normaliza os ciclos de evolução a partir da resposta da API da Central de Controle.
 */
export function parseCcwEvolutionCycles(payload: unknown): string[] {
  const fallbackCycles = DEFAULT_CCW_WINTHOR_CYCLES.map((c) => c.value);
  if (!payload) return fallbackCycles;

  let rawList: unknown[] = [];

  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      rawList = obj.data;
    } else if (Array.isArray(obj.content)) {
      rawList = obj.content;
    } else if (Array.isArray(obj.lista)) {
      rawList = obj.lista;
    } else if (Array.isArray(obj.items)) {
      rawList = obj.items;
    } else if (Array.isArray(obj.records)) {
      rawList = obj.records;
    }
  }

  if (rawList.length === 0) {
    return fallbackCycles;
  }

  const cycleSet = new Set<string>();

  for (const item of rawList) {
    let candidate = '';
    if (typeof item === 'string' || typeof item === 'number') {
      candidate = String(item).trim();
    } else if (typeof item === 'object' && item !== null) {
      const it = item as Record<string, unknown>;
      const val =
        it.versaoCiclo ??
        it.ciclo ??
        it.versao ??
        it.numeroCiclo ??
        it.codigo ??
        it.descricao;
      if (val !== undefined && val !== null) {
        candidate = String(val).trim();
      }
    }

    if (candidate) {
      // Normaliza para o formato oficial (ex: "37" -> "37.00", "38.00" -> "38.00")
      const formatted = formatCcwCycleVersion(candidate);
      if (/^\d+\.\d+$/.test(formatted)) {
        cycleSet.add(formatted);
      }
    }
  }

  if (cycleSet.size === 0) {
    return fallbackCycles;
  }

  // Ordena versões em ordem decrescente (ex: 38.00, 37.00, 36.00...)
  return Array.from(cycleSet).sort((a, b) => {
    const numA = parseFloat(a) || 0;
    const numB = parseFloat(b) || 0;
    return numB - numA;
  });
}

/**
 * Consulta os ciclos de evolução diretamente na API da Central de Controle WinThor (CCW).
 * Endpoint: /api/rotinas/listarCicloEvolucaoPaginado?start=1&length=10
 */
export async function fetchCcwEvolutionCycles(
  baseUrl: string = 'https://centraldecontrole.pcinformatica.com.br',
  authCookie?: string
): Promise<CcwEvolutionCyclesResult> {
  const cleanBase = (baseUrl || 'https://centraldecontrole.pcinformatica.com.br').trim().replace(/\/+$/, '');
  const targetUrl = `${cleanBase}/api/rotinas/listarCicloEvolucaoPaginado?start=1&length=10`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (authCookie && authCookie.trim()) {
    const cleanCookie = authCookie.trim();
    headers['Cookie'] = cleanCookie.startsWith('suukie=') || cleanCookie.includes('=')
      ? cleanCookie
      : `suukie=${cleanCookie}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return {
        success: false,
        cycles: DEFAULT_CCW_WINTHOR_CYCLES.map((c) => c.value),
        error: `HTTP_${res.status}`,
        message: `Central de Controle retornou status ${res.status}. Usando ciclos padrão.`
      };
    }

    const json = await res.json().catch(() => null);
    const cycles = parseCcwEvolutionCycles(json);

    return {
      success: true,
      cycles,
      message: `${cycles.length} ciclos de evolução identificados.`
    };
  } catch (err: any) {
    return {
      success: false,
      cycles: DEFAULT_CCW_WINTHOR_CYCLES.map((c) => c.value),
      error: 'NETWORK_ERROR',
      message: err?.message || 'Falha ao consultar ciclos na Central de Controle. Usando lista padrão.'
    };
  }
}
