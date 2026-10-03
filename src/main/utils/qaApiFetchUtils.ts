import { isSafeUrl } from './security';
import { QaApiFetchRequest } from '../../shared/types';

/**
 * Valida a requisição de busca de payload via API externa.
 */
export function validateApiFetchRequest(req: QaApiFetchRequest): { isValid: boolean; error?: string } {
  if (!req || typeof req !== 'object') {
    return { isValid: false, error: 'Parâmetros de requisição inválidos.' };
  }

  if (!req.url || typeof req.url !== 'string' || !req.url.trim()) {
    return { isValid: false, error: 'A URL do endpoint é obrigatória.' };
  }

  const trimmedUrl = req.url.trim();
  if (!isSafeUrl(trimmedUrl)) {
    return {
      isValid: false,
      error: 'URL inválida ou insegura. A URL deve iniciar com http:// ou https://.'
    };
  }

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return { isValid: false, error: `Método HTTP "${req.method}" não suportado. Utilize GET ou POST.` };
  }

  return { isValid: true };
}

/**
 * Navega em um objeto JavaScript utilizando um caminho simples separado por pontos
 * (ex: "data.payload", "response.items[0]", "record").
 */
export function extractJsonByPath(obj: any, path?: string): any {
  if (!path || !path.trim()) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return undefined;
  }

  const cleanPath = path.trim();
  // Normaliza colchetes de array para pontos, ex: "items[0].id" -> "items.0.id"
  const normalizedPath = cleanPath.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
  const segments = normalizedPath.split('.');

  let current = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Formata um payload para JSON indentado (2 espaços).
 */
export function formatPayloadAsPrettyJson(data: any): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch (err: any) {
    return String(data);
  }
}
