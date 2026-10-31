import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HttpClientService } from '../../main/services/HttpClientService';
import { HttpCollectionService } from '../../main/services/HttpCollectionService';
import { HttpMethod, HttpRequestItem } from '../../shared/httpClientTypes';

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

export function registerHttpClientTools(
  server: McpServer,
  httpClientService: HttpClientService,
  httpCollectionService: HttpCollectionService
): void {
  server.registerTool(
    'http_send_request',
    {
      title: 'Enviar requisição HTTP / REST',
      description: 'Executa uma chamada HTTP (GET, POST, PUT, DELETE...) com suporte a interpolação de variáveis {{host}}, {{port}}, {{TOKEN}} e autenticação Bearer/Basic.',
      inputSchema: {
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).describe('Método HTTP'),
        url: z.string().describe('URL da requisição (pode conter {{variáveis}})'),
        headers: z.record(z.string(), z.string()).optional().describe('Cabeçalhos HTTP opcionais'),
        body: z.string().optional().describe('Corpo da requisição (JSON, texto ou form)'),
        bodyMode: z.enum(['none', 'raw-json', 'raw-text', 'form-urlencoded']).optional().describe('Modo do corpo da requisição'),
        token: z.string().optional().describe('Token de autenticação Bearer opcional'),
        variables: z.record(z.string(), z.string()).optional().describe('Mapa de variáveis de ambiente para interpolação')
      }
    },
    async ({ method, url, headers = {}, body, bodyMode = 'raw-json', token, variables = {} }) => {
      try {
        const headerItems = Object.entries(headers).map(([key, value], idx) => ({
          id: `h-${idx}`,
          key,
          value,
          enabled: true
        }));

        const reqItem: HttpRequestItem = {
          id: 'mcp-call',
          name: `${method} ${url}`,
          method: method as HttpMethod,
          url,
          params: [],
          headers: headerItems,
          body: {
            mode: body ? bodyMode : 'none',
            raw: body
          },
          auth: token ? { type: 'bearer', token } : { type: 'none' }
        };

        const result = await httpClientService.executeRequest({
          request: reqItem,
          environmentVariables: variables,
          activeToken: token
        });

        return ok(result);
      } catch (err: any) {
        return fail(`Erro ao executar requisição HTTP: ${err?.message || err}`);
      }
    }
  );

  server.registerTool(
    'http_list_collections',
    {
      title: 'Listar coleções HTTP',
      description: 'Lista todas as coleções, pastas e requisições salvas no cockpit do desenvolvedor.',
      inputSchema: {}
    },
    async () => {
      return ok(httpCollectionService.getCollections());
    }
  );

  server.registerTool(
    'http_login_winthor',
    {
      title: 'Autenticar no WinThor',
      description: 'Realiza autenticação na API do WinThor com usuário e senha, retornando o accessToken gerado.',
      inputSchema: {
        login: z.string().describe('Usuário de login do WinThor (ex: PCADMIN)'),
        senha: z.string().describe('Senha do WinThor; o Hub envia o MD5 em maiúsculas que o WTA exige (um hash de 32 caracteres colado vai como está)'),
        loginUrl: z.string().optional().describe('URL do endpoint de login'),
        environmentId: z.string().optional().describe('ID do ambiente para atualizar a variável TOKEN')
      }
    },
    async ({ login, senha, loginUrl, environmentId }) => {
      const result = await httpClientService.loginWinThor({
        login,
        senha,
        loginUrl,
        environmentId
      });
      return ok(result);
    }
  );

  server.registerTool(
    'http_import_postman_collection',
    {
      title: 'Importar Coleção Postman',
      description: 'Importa um arquivo ou string JSON de coleção do Postman v2.1/v2.0 contendo pastas, rotas, variáveis e exemplos.',
      inputSchema: {
        jsonContent: z.string().describe('Conteúdo bruto em string JSON da coleção exportada do Postman')
      }
    },
    async ({ jsonContent }) => {
      const result = httpCollectionService.importPostman(jsonContent);
      return ok(result);
    }
  );
}
