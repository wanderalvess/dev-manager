import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ScenarioHistoryService } from '../../main/services/ScenarioHistoryService';

interface ScenarioHistoryToolDeps {
  scenarioHistoryService: ScenarioHistoryService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

/** Histórico da Validação de Cenários: as últimas execuções do Bloqueio de Login e da Validação de API. */
export function registerScenarioHistoryTools(server: McpServer, { scenarioHistoryService, ok, fail }: ScenarioHistoryToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;

  server.registerTool(
    'qa_list_scenario_runs',
    {
      title: 'Listar o histórico da Validação de Cenários',
      description:
        'Lista as últimas execuções (até 50, mais recentes primeiro) do Bloqueio de Login e da Validação de API, rodadas pela tela, pelo modo Web ou pelo MCP: id, tipo, nome, início, duração, veredito (passed, failed, warning, error) e resumo.',
      inputSchema: { kind: z.enum(['auth-lockout', 'api']).optional().describe('Só um tipo: auth-lockout (Bloqueio de Login) ou api (Validação de API)') }
    },
    async ({ kind }) => reply(await scenarioHistoryService.list(kind))
  );

  server.registerTool(
    'qa_get_scenario_run',
    {
      title: 'Abrir uma execução do histórico da Validação de Cenários',
      description:
        'Devolve uma execução do histórico como ficou: as regras com esperado e obtido, as evidências, o passo a passo e o relatório em Markdown para o Jira (senhas e tokens mascarados). Use o id de qa_list_scenario_runs.',
      inputSchema: { id: z.string().describe('Id da execução (ver qa_list_scenario_runs)') }
    },
    async ({ id }) => {
      const record = await scenarioHistoryService.get(id);
      return record ? reply(record) : error('Execução não encontrada no histórico.');
    }
  );
}
