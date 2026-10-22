import {
  HttpRequestItem,
  HttpMethod,
  HttpKeyValueItem,
  HttpRequestBody,
  HttpAuthConfig
} from '../../../shared/types';

/**
 * Interpola variáveis {{key}} usando mapa de variáveis fornecido.
 */
function interpolate(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return vars[trimmed] !== undefined ? vars[trimmed] : `{{${trimmed}}}`;
  });
}

/**
 * Gera um comando cURL completo e pronto para terminal a partir de um HttpRequestItem.
 */
export function generateCurlCommand(
  request: HttpRequestItem,
  envVars: Record<string, string> = {},
  activeToken?: string
): string {
  const vars: Record<string, string> = { ...envVars };
  if (activeToken && !vars.TOKEN) {
    vars.TOKEN = activeToken;
  }

  // 1. URL base com query params mesclados
  let finalUrl = interpolate(request.url.trim(), vars);
  if (request.params && request.params.length > 0) {
    const enabledParams = request.params.filter((p: HttpKeyValueItem) => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      const urlParts = finalUrl.split('?');
      const basePart = urlParts[0];
      const query = new URLSearchParams(urlParts[1] || '');
      for (const p of enabledParams) {
        query.set(interpolate(p.key, vars), interpolate(p.value, vars));
      }
      finalUrl = `${basePart}?${query.toString()}`;
    }
  }

  const parts: string[] = [`curl -X ${request.method} "${finalUrl}"`];

  // 2. Headers
  const headerMap: Record<string, string> = {};
  if (request.headers) {
    for (const h of request.headers) {
      if (h.enabled && h.key.trim()) {
        headerMap[h.key.trim().toLowerCase()] = interpolate(h.value, vars);
        parts.push(`  -H "${h.key.trim()}: ${interpolate(h.value, vars)}"`);
      }
    }
  }

  // 3. Autenticação
  const auth = request.auth;
  if (auth) {
    if (auth.type === 'bearer' && (auth.token || vars.TOKEN)) {
      const token = interpolate(auth.token || vars.TOKEN || '', vars);
      if (!headerMap['authorization']) {
        parts.push(`  -H "Authorization: Bearer ${token}"`);
      }
    } else if (auth.type === 'basic') {
      const user = interpolate(auth.username || '', vars);
      const pass = interpolate(auth.password || '', vars);
      parts.push(`  -u "${user}:${pass}"`);
    } else if ((auth.type === 'winthor-auth' || auth.type === 'inherit') && vars.TOKEN) {
      if (!headerMap['authorization']) {
        parts.push(`  -H "Authorization: Bearer ${vars.TOKEN}"`);
      }
    }
  }

  // 4. Body
  const body = request.body;
  if (body && body.mode !== 'none') {
    if (body.mode === 'raw-json' && body.raw) {
      if (!headerMap['content-type']) {
        parts.push(`  -H "Content-Type: application/json"`);
      }
      const rawResolved = interpolate(body.raw, vars);
      // Escapa aspas para shell
      const escaped = rawResolved.replace(/"/g, '\\"');
      parts.push(`  --data-raw "${escaped}"`);
    } else if (body.mode === 'raw-text' && body.raw) {
      if (!headerMap['content-type']) {
        parts.push(`  -H "Content-Type: text/plain"`);
      }
      const escaped = interpolate(body.raw, vars).replace(/"/g, '\\"');
      parts.push(`  --data-raw "${escaped}"`);
    } else if (body.mode === 'form-urlencoded' && body.formData) {
      if (!headerMap['content-type']) {
        parts.push(`  -H "Content-Type: application/x-www-form-urlencoded"`);
      }
      const formParams = new URLSearchParams();
      for (const item of body.formData) {
        if (item.enabled && item.key.trim()) {
          formParams.set(interpolate(item.key, vars), interpolate(item.value, vars));
        }
      }
      parts.push(`  --data "${formParams.toString()}"`);
    }
  }

  return parts.join(' \\\n');
}

/**
 * Converte um comando cURL colado pelo usuário em propriedades de HttpRequestItem.
 */
export function parseCurlCommand(curlStr: string): Partial<HttpRequestItem> | null {
  if (!curlStr || !curlStr.trim().toLowerCase().startsWith('curl')) {
    return null;
  }

  let text = curlStr.trim();
  // Remove quebras de linha com barra invertida
  text = text.replace(/\\\r?\n/g, ' ');

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: HttpKeyValueItem[] = [];
  let rawBody = '';
  let bodyMode: 'none' | 'raw-json' | 'raw-text' | 'form-urlencoded' = 'none';
  const auth: HttpAuthConfig = { type: 'none' };

  // 1. Extração do Método
  const methodMatch = text.match(/(?:-X|--request)\s+([A-Za-z]+)/);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase() as HttpMethod;
  }

  // 2. Extração de Headers (-H / --header)
  const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/g;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headerRegex.exec(text)) !== null) {
    const fullHeader = hMatch[1];
    const colonIdx = fullHeader.indexOf(':');
    if (colonIdx > 0) {
      const key = fullHeader.substring(0, colonIdx).trim();
      const value = fullHeader.substring(colonIdx + 1).trim();

      if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
        auth.type = 'bearer';
        auth.token = value.substring(7).trim();
      }

      headers.push({
        id: Math.random().toString(36).substring(2, 9),
        key,
        value,
        enabled: true
      });
    }
  }

  // 3. Extração de Usuário/Senha (-u / --user)
  const userMatch = text.match(/(?:-u|--user)\s+["']?([^"'\s]+)["']?/);
  if (userMatch) {
    const creds = userMatch[1].split(':');
    auth.type = 'basic';
    auth.username = creds[0] || '';
    auth.password = creds[1] || '';
  }

  // 4. Extração de Body (-d, --data, --data-raw, --data-binary)
  const dataMatch = text.match(/(?:-d|--data|--data-raw|--data-binary)\s+["']([\s\S]*?)["'](?:\s+-[A-Za-z]|$)/);
  if (dataMatch) {
    rawBody = dataMatch[1].replace(/\\"/g, '"');
    if (method === 'GET' && !methodMatch) {
      method = 'POST'; // cURL assume POST quando há dados e nenhum método explícito
    }
    try {
      JSON.parse(rawBody);
      bodyMode = 'raw-json';
    } catch {
      bodyMode = 'raw-text';
    }
  }

  // 5. Extração de URL (procura por http:// ou https://)
  const urlMatch = text.match(/["']?(https?:\/\/[^\s"']+)["']?/);
  if (urlMatch) {
    url = urlMatch[1];
  }

  if (!url) {
    return null;
  }

  const body: HttpRequestBody = {
    mode: bodyMode,
    raw: rawBody
  };

  return {
    method,
    url,
    headers,
    body,
    auth
  };
}
