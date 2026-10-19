import crypto from 'crypto';
import {
  HttpCollection,
  HttpFolder,
  HttpRequestItem,
  HttpKeyValueItem,
  HttpRequestBody,
  HttpAuthConfig,
  HttpResponseExample,
  PostmanImportResult,
  HttpMethod
} from '../../shared/httpClientTypes';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
}

function normalizeMethod(method?: string): HttpMethod {
  const m = (method || 'GET').toUpperCase();
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  return validMethods.includes(m as HttpMethod) ? (m as HttpMethod) : 'GET';
}

function parseHeaders(rawHeaders?: any[]): HttpKeyValueItem[] {
  if (!Array.isArray(rawHeaders)) return [];
  return rawHeaders.map((h) => ({
    id: generateId(),
    key: h.key || '',
    value: h.value || '',
    enabled: h.disabled !== true,
    description: h.description
  }));
}

function parseQueryParams(urlObj: any): HttpKeyValueItem[] {
  if (!urlObj) return [];
  if (Array.isArray(urlObj.query)) {
    return urlObj.query.map((q: any) => ({
      id: generateId(),
      key: q.key || '',
      value: q.value || '',
      enabled: q.disabled !== true,
      description: q.description
    }));
  }
  return [];
}

function extractRawUrl(urlObj: any): string {
  if (!urlObj) return '';
  if (typeof urlObj === 'string') return urlObj;
  if (typeof urlObj.raw === 'string') return urlObj.raw;
  if (Array.isArray(urlObj.host)) {
    const protocol = urlObj.protocol ? `${urlObj.protocol}://` : 'http://';
    const host = urlObj.host.join('.');
    const port = urlObj.port ? `:${urlObj.port}` : '';
    const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : '';
    return `${protocol}${host}${port}${path}`;
  }
  return '';
}

function parseBody(rawBody?: any): HttpRequestBody {
  if (!rawBody) return { mode: 'none' };

  const mode = rawBody.mode;
  if (mode === 'raw') {
    const rawContent = rawBody.raw || '';
    const isJsonLang = rawBody.options?.raw?.language === 'json' || rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[');
    return {
      mode: isJsonLang ? 'raw-json' : 'raw-text',
      raw: rawContent
    };
  }

  if (mode === 'urlencoded' && Array.isArray(rawBody.urlencoded)) {
    return {
      mode: 'form-urlencoded',
      formData: rawBody.urlencoded.map((f: any) => ({
        id: generateId(),
        key: f.key || '',
        value: f.value || '',
        enabled: f.disabled !== true,
        description: f.description
      }))
    };
  }

  if (mode === 'formdata' && Array.isArray(rawBody.formdata)) {
    return {
      mode: 'form-data',
      formData: rawBody.formdata.map((f: any) => ({
        id: generateId(),
        key: f.key || '',
        value: f.value || '',
        enabled: f.disabled !== true,
        description: f.description
      }))
    };
  }

  return { mode: 'none' };
}

function parseAuth(rawAuth?: any): HttpAuthConfig {
  if (!rawAuth) return { type: 'inherit' };

  if (rawAuth.type === 'bearer' && Array.isArray(rawAuth.bearer)) {
    const tokenItem = rawAuth.bearer.find((b: any) => b.key === 'token');
    return {
      type: 'bearer',
      token: tokenItem?.value || ''
    };
  }

  if (rawAuth.type === 'basic' && Array.isArray(rawAuth.basic)) {
    const userItem = rawAuth.basic.find((b: any) => b.key === 'username');
    const passItem = rawAuth.basic.find((b: any) => b.key === 'password');
    return {
      type: 'basic',
      username: userItem?.value || '',
      password: passItem?.value || ''
    };
  }

  if (rawAuth.type === 'noauth') {
    return { type: 'none' };
  }

  return { type: 'inherit' };
}

function parseExamples(rawResponses?: any[]): HttpResponseExample[] {
  if (!Array.isArray(rawResponses)) return [];
  return rawResponses.map((res) => ({
    id: generateId(),
    name: res.name || 'Exemplo de Resposta',
    status: typeof res.code === 'number' ? res.code : 200,
    statusText: res.status || 'OK',
    body: typeof res.body === 'string' ? res.body : JSON.stringify(res.body || '', null, 2)
  }));
}

/**
 * Converte recursivamente os itens de uma coleção do Postman v2.1/v2.0 em coleções do WinThor Dev Manager.
 */
export function parsePostmanCollection(jsonString: string): PostmanImportResult {
  try {
    const data = JSON.parse(jsonString);
    if (!data || (!data.info && !data.item)) {
      return {
        success: false,
        collectionName: '',
        foldersCount: 0,
        requestsCount: 0,
        error: 'JSON fornecido não parece ser uma coleção válida do Postman (faltam chaves "info" ou "item").'
      };
    }

    const collectionId = generateId();
    const collectionName = data.info?.name || 'Coleção Importada do Postman';
    const description = typeof data.info?.description === 'string' ? data.info.description : undefined;

    const folders: HttpFolder[] = [];
    const requests: HttpRequestItem[] = [];

    function processItems(items: any[], parentFolderId?: string) {
      if (!Array.isArray(items)) return;

      for (const item of items) {
        if (!item) continue;

        // É uma pasta/grupo se possuir subitens
        if (Array.isArray(item.item)) {
          const folderId = generateId();
          folders.push({
            id: folderId,
            name: item.name || 'Pasta sem nome',
            description: typeof item.description === 'string' ? item.description : undefined,
            collectionId,
            parentId: parentFolderId
          });

          processItems(item.item, folderId);
        } else if (item.request) {
          // É uma requisição
          const req = item.request;
          const urlRaw = extractRawUrl(req.url);
          const params = parseQueryParams(req.url);
          const headers = parseHeaders(req.header);
          const body = parseBody(req.body);
          const auth = parseAuth(req.auth);
          const examples = parseExamples(item.response);

          requests.push({
            id: generateId(),
            name: item.name || urlRaw || 'Requisição sem nome',
            description: typeof req.description === 'string' ? req.description : undefined,
            method: normalizeMethod(req.method),
            url: urlRaw,
            params,
            headers,
            body,
            auth,
            collectionId,
            folderId: parentFolderId,
            examples,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
    }

    processItems(data.item);

    // Variáveis da coleção
    const variables: HttpKeyValueItem[] = Array.isArray(data.variable)
      ? data.variable.map((v: any) => ({
          id: generateId(),
          key: v.key || '',
          value: v.value || '',
          enabled: true
        }))
      : [];

    const collection: HttpCollection = {
      id: collectionId,
      name: collectionName,
      description,
      folders,
      requests,
      variables,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return {
      success: true,
      collectionName,
      foldersCount: folders.length,
      requestsCount: requests.length,
      collection
    };
  } catch (err: any) {
    return {
      success: false,
      collectionName: '',
      foldersCount: 0,
      requestsCount: 0,
      error: `Erro ao interpretar JSON da coleção: ${err?.message || 'JSON inválido'}`
    };
  }
}
