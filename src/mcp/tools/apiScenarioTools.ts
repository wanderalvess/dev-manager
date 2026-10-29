import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiScenarioService } from '../../main/services/ApiScenarioService';
import { API_HTTP_METHODS } from '../../shared/apiScenarioTypes';

interface ApiScenarioToolDeps {
  apiScenarioService: ApiScenarioService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

const ruleSchema = z.object({
  kind: z.enum(['status', 'json']).describe('status = status HTTP; json = um campo do corpo JSON'),
  path: z.string().optional().describe('Caminho do campo no JSON (ex.: "$.itens[0].codigo"); só para kind=json'),
  operator: z
    .enum(['equals', 'not-equals', 'in', 'contains', 'exists', 'not-exists', 'not-empty', 'greater', 'less', 'length-equals'])
    .describe('status: equals, in (lista "200, 201" ou faixa "2xx") ou not-equals; json: os demais'),
  expected: z.string().optional().describe('Valor esperado como texto (não usado em exists, not-exists e not-empty)')
});

const scenarioShape = {
  name: z.string().describe('Nome do cenário'),
  method: z.enum(API_HTTP_METHODS as unknown as ['GET', ...string[]]).optional().describe('Método HTTP (padrão GET)'),
  url: z.string().describe('URL da API; aceita {{wtaUrl}} (ex.: "{{wtaUrl}}/winthor/ferramenta/servidor/v1/logs")'),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional().describe('Cabeçalhos extras'),
  body: z.string().optional().describe('Corpo da requisição (JSON como texto), para POST/PUT/PATCH'),
  auth: z.enum(['none', 'settings-wta']).optional().describe('settings-wta = entra com o login do WTA de Configurações; none = sem autenticação'),
  rules: z.array(ruleSchema).min(1).describe('O que a resposta precisa ter')
};

/** Validação de Cenários → Validação de API: chama uma API e confronta status e campos do JSON com o esperado. */
export function registerApiScenarioTools(server: McpServer, { apiScenarioService, ok, fail }: ApiScenarioToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;
  const withIds = (rules: z.infer<typeof ruleSchema>[]) => rules.map((rule, i) => ({ ...rule, id: `r${i + 1}` }));

  server.registerTool(
    'qa_list_api_scenarios',
    {
      title: 'Listar os cenários da Validação de API',
      description:
        'Lista os cenários salvos em Validação de Cenários → Validação de API: nome, método, URL (com {{wtaUrl}}), autenticação e as regras de status e de campos do JSON que a resposta precisa cumprir.'
    },
    async () => reply(await apiScenarioService.list())
  );

  server.registerTool(
    'qa_run_api_scenario',
    {
      title: 'Rodar um cenário da Validação de API',
      description:
        'Chama a API de um cenário salvo (scenarioId) ou de uma definição avulsa (scenario, sem salvar) e confronta a resposta com cada regra: status HTTP (igual, diferente, lista "200, 201" ou faixa "2xx") e campos do JSON por caminho (igual, diferente, contém, existe, não existe, não vazio, maior, menor, quantidade de itens). Devolve cada regra com esperado, obtido e se passou, a resposta (corpo com tokens mascarados), o passo a passo e o relatório em Markdown para o Jira. Com auth=settings-wta, entra antes no WTA com o login de Configurações (senha em MD5).',
      inputSchema: {
        scenarioId: z.string().optional().describe('Id de um cenário salvo (ver qa_list_api_scenarios)'),
        scenario: z.object(scenarioShape).optional().describe('Definição avulsa, quando não houver cenário salvo')
      }
    },
    async ({ scenarioId, scenario }) => {
      if (!scenarioId && !scenario) return error('Informe scenarioId ou scenario.');
      const result = await apiScenarioService.run(scenarioId ? { id: scenarioId } : { scenario: { ...scenario!, rules: withIds(scenario!.rules) } as never });
      return 'error' in result && !('rules' in result) ? error(result.error) : reply(result);
    }
  );

  server.registerTool(
    'qa_save_api_scenario',
    {
      title: 'Salvar um cenário da Validação de API',
      description:
        'Cria ou atualiza (com id) um cenário de Validação de API, que aparece na tela Validação de Cenários e pode ser rodado depois por qa_run_api_scenario. Nenhum segredo é salvo: a autenticação usa o login do WTA de Configurações.',
      inputSchema: { id: z.string().optional().describe('Id do cenário a atualizar; sem id cria um novo'), ...scenarioShape }
    },
    async (args) => {
      const saved = await apiScenarioService.save({ ...args, rules: withIds(args.rules) } as never);
      return saved.success ? reply(saved.scenario) : error(saved.error);
    }
  );

  server.registerTool(
    'qa_delete_api_scenario',
    {
      title: 'Apagar um cenário da Validação de API',
      description: 'Apaga um cenário salvo da Validação de API pelo id.',
      inputSchema: { id: z.string().describe('Id do cenário') }
    },
    async ({ id }) => ((await apiScenarioService.delete(id)) ? reply({ success: true }) : error('Cenário não encontrado.'))
  );
}
