import crypto from 'crypto';
import { httpRequest } from '../utils/httpRequest';
import {
  HttpExecutionRequest,
  HttpResponseData,
  WinThorLoginCredentials,
  WinThorLoginResult,
  HttpRequestItem
} from '../../shared/httpClientTypes';
import {
  interpolateVariables,
  buildResolvedKeyValueMap
} from '../utils/httpVariableUtils';
import { HttpCollectionService } from './HttpCollectionService';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
}

export class HttpClientService {
  private history: HttpResponseData[] = [];
  private maxHistorySize = 50;

  constructor(private collectionService: HttpCollectionService) {}

  public async executeRequest(reqPayload: HttpExecutionRequest): Promise<HttpResponseData> {
    const { request, environmentVariables = {}, activeToken } = reqPayload;
    const start = Date.now();

    // 1. Variáveis mescladas (variáveis passadas + token ativo se fornecido)
    const vars: Record<string, string> = { ...environmentVariables };
    if (activeToken && !vars.TOKEN) {
      vars.TOKEN = activeToken;
    }

    // 2. Interpolar URL base
    let finalUrl = interpolateVariables(request.url.trim(), vars);

    // 3. Montar e anexar Query Params
    if (request.params && request.params.length > 0) {
      const resolvedParams = buildResolvedKeyValueMap(request.params, vars);
      const urlParts = finalUrl.split('?');
      const basePart = urlParts[0];
      const existingQuery = new URLSearchParams(urlParts[1] || '');

      for (const [k, v] of Object.entries(resolvedParams)) {
        existingQuery.set(k, v);
      }

      const queryString = existingQuery.toString();
      finalUrl = queryString ? `${basePart}?${queryString}` : basePart;
    }

    // 4. Montar Cabeçalhos
    const resolvedHeaders = buildResolvedKeyValueMap(request.headers || [], vars);
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      ...resolvedHeaders
    };

    // 5. Aplicar Autenticação
    const auth = request.auth;
    if (auth) {
      if (auth.type === 'bearer') {
        const tokenVal = auth.token ? interpolateVariables(auth.token, vars) : vars.TOKEN || activeToken || '';
        if (tokenVal) {
          headers['Authorization'] = `Bearer ${tokenVal}`;
        }
      } else if (auth.type === 'basic') {
        const user = interpolateVariables(auth.username || '', vars);
        const pass = interpolateVariables(auth.password || '', vars);
        const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      } else if (auth.type === 'winthor-auth' || auth.type === 'inherit') {
        const tokenVal = vars.TOKEN || activeToken || '';
        if (tokenVal && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${tokenVal}`;
        }
      }
    }

    // 6. Montar Corpo (Body)
    let bodyStr: string | undefined;
    const bodyConfig = request.body;

    if (bodyConfig && bodyConfig.mode !== 'none') {
      if (bodyConfig.mode === 'raw-json') {
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
        bodyStr = interpolateVariables(bodyConfig.raw || '', vars);
      } else if (bodyConfig.mode === 'raw-text') {
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'text/plain';
        }
        bodyStr = interpolateVariables(bodyConfig.raw || '', vars);
      } else if (bodyConfig.mode === 'form-urlencoded') {
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        const formData = buildResolvedKeyValueMap(bodyConfig.formData || [], vars);
        bodyStr = new URLSearchParams(formData).toString();
      }
    }

    try {
      const response = await httpRequest(finalUrl, {
        method: request.method,
        headers,
        body: bodyStr,
        timeout: 45000
      });

      const durationMs = Date.now() - start;
      const rawText = await response.text();
      const sizeBytes = Buffer.byteLength(rawText, 'utf-8');

      const responseHeaders: Record<string, string> = {};
      if (response.headers) {
        for (const [k, v] of Object.entries(response.headers)) {
          if (Array.isArray(v)) {
            responseHeaders[k] = v.join(', ');
          } else if (v !== undefined) {
            responseHeaders[k] = String(v);
          }
        }
      }

      let isJson = false;
      try {
        JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }

      const requestSnapshot = {
        method: request.method,
        url: request.url,
        name: request.name,
        headers: request.headers,
        params: request.params,
        body: request.body,
        auth: request.auth
      };

      const responseItem: HttpResponseData = {
        id: generateId(),
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        durationMs,
        sizeBytes,
        headers: responseHeaders,
        body: rawText,
        isJson,
        contentType: responseHeaders['content-type'] || (isJson ? 'application/json' : 'text/plain'),
        timestamp: Date.now(),
        requestSnapshot
      };

      this.addHistory(responseItem);
      return responseItem;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorMsg = err?.message || 'Falha ao executar requisição HTTP';

      const errorResponse: HttpResponseData = {
        id: generateId(),
        requestId: request.id,
        status: 0,
        statusText: 'Error',
        durationMs,
        sizeBytes: 0,
        headers: {},
        body: '',
        isJson: false,
        contentType: 'text/plain',
        error: errorMsg,
        timestamp: Date.now(),
        requestSnapshot: {
          method: request.method,
          url: request.url,
          name: request.name,
          headers: request.headers,
          params: request.params,
          body: request.body,
          auth: request.auth
        }
      };

      this.addHistory(errorResponse);
      return errorResponse;
    }
  }

  public async loginWinThor(credentials: WinThorLoginCredentials): Promise<WinThorLoginResult> {
    const start = Date.now();
    let loginUrl = credentials.loginUrl || 'http://localhost:8181/winthor/autenticacao/v1/login';

    // Se a credencial tiver ambiente associado, resolve variáveis na loginUrl
    if (credentials.environmentId) {
      const envs = this.collectionService.getEnvironments();
      const env = envs.find((e) => e.id === credentials.environmentId);
      if (env) {
        const vars: Record<string, string> = {};
        for (const v of env.variables) {
          if (v.enabled) vars[v.key] = v.value;
        }
        loginUrl = interpolateVariables(loginUrl, vars);
      }
    }

    try {
      const response = await httpRequest(loginUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          login: credentials.login,
          senha: credentials.senha
        }),
        timeout: 20000
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        // Ignora
      }

      const durationMs = Date.now() - start;

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          durationMs,
          error: data.message || `Login retornou status ${response.status} (${response.statusText})`
        };
      }

      const token = data.accessToken || data.token || data.access_token;
      if (!token) {
        return {
          success: false,
          statusCode: response.status,
          durationMs,
          error: 'Resposta da API não continha a propriedade "accessToken".'
        };
      }

      // Se ambiente informado, atualiza o token no ambiente
      if (credentials.environmentId) {
        this.collectionService.updateEnvironmentToken(credentials.environmentId, token);
      }

      return {
        success: true,
        accessToken: token,
        statusCode: response.status,
        durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - start,
        error: err?.message || 'Falha ao conectar no endpoint de autenticação do WinThor.'
      };
    }
  }

  public getHistory(): HttpResponseData[] {
    return this.history;
  }

  public clearHistory(): void {
    this.history = [];
  }

  private addHistory(item: HttpResponseData): void {
    this.history.unshift(item);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }
}
