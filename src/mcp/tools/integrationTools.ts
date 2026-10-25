import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IntegrationTraceService } from '../../main/services/IntegrationTraceService';
import { summarizeReadiness } from '../../main/services/integration/readinessPlan';

interface IntegrationToolDeps {
  integrationTraceService: IntegrationTraceService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

/** Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV. */
export function registerIntegrationTools(server: McpServer, { integrationTraceService, ok, fail }: IntegrationToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;

  server.registerTool(
    'integration_check_readiness',
    {
      title: 'Pré-voo da integração ponta a ponta',
      description:
        'Confere cada camada da cadeia WinThor → WSH (Winthor Smart Hub) → CH (Commerce Hub) → PDV, com o que estiver configurado em Configurações → Integração ponta a ponta: serviço Windows, processo, porta, health HTTP, login do WinThor, conexão Oracle/Postgres e arquivo de log. Devolve o status de cada camada (ok, warning, failed, not-configured), cada verificação com detalhe e duração, e um resumo dizendo se o ambiente está pronto para testar. Use antes de rodar um fluxo para saber qual camada está fora do ar.'
    },
    async () => {
      try {
        const result = await integrationTraceService.checkReadiness();
        return reply({ summary: summarizeReadiness(result), ...result });
      } catch (err: any) {
        return error(err?.message || 'Falha ao executar o pré-voo da integração.');
      }
    }
  );
}
