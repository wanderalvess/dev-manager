import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IntegrationTraceService } from '../../main/services/IntegrationTraceService';
import { summarizeReadiness } from '../../main/services/integration/readinessPlan';
import { suggestWshFixes } from '../../shared/wshSuggestions';

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

  server.registerTool(
    'integration_check_batch',
    {
      title: 'Rastrear um lote da integração',
      description:
        'Rastreia um lote já executado ao longo da cadeia WinThor → WSH → CH → PDV, sem disparar nada. Prova o que consegue com as fontes disponíveis: o lote e o status por loja na API do PDVSync (login RAC configurado na camada CH), a chegada no PDV por consulta SQL somente leitura (esperando até o tempo configurado no fluxo), o dado na retaguarda Oracle, a chamada da API do WinThor no APM e as linhas dos logs do WSH e do CH que citam o lote. Vale para fluxos de saída (produto, preço, estoque...); a venda é de entrada e não usa lote. Os oito passos voltam como ok, failed ou unknown; unknown significa sem evidência, nunca sucesso. Informa em qual passo quebrou (brokenAt), guarda o resultado no histórico e devolve o relatório em Markdown pronto para o Jira. O fluxo informado precisa estar cadastrado e ativo em Configurações → Integração ponta a ponta.',
      inputSchema: {
        flowId: z.string().describe('Id do fluxo cadastrado em Configurações → Integração ponta a ponta (ex.: "produto")'),
        batchNumber: z.string().describe('Número do lote devolvido pelo CH (letras, números, ponto, hífen, barra ou sublinhado)'),
        lookbackMinutes: z.number().int().positive().optional().describe('Janela para trás, em minutos, usada em :inicio e na busca no APM (padrão 120, máximo 10080)'),
        branchId: z.string().optional().describe('Código da filial (idRetaguardaLoja) para ver o status só dessa loja no PDVSync; sem ele vêm todas')
      }
    },
    async ({ flowId, batchNumber, lookbackMinutes, branchId }) => {
      try {
        const response = await integrationTraceService.traceBatch({ flowId, batchNumber, lookbackMinutes, branchId });
        return response.success ? reply(response.trace) : error(response.error);
      } catch (err: any) {
        return error(err?.message || 'Falha ao rastrear o lote.');
      }
    }
  );

  server.registerTool(
    'integration_list_traces',
    {
      title: 'Listar rastreios de integração',
      description:
        'Lista os últimos rastreios de lote guardados no histórico (mais recentes primeiro), com o lote, o fluxo, o passo em que quebrou e a contagem de passos ok, com falha e sem evidência.'
    },
    async () => reply(await integrationTraceService.listTraces())
  );

  server.registerTool(
    'integration_get_trace',
    {
      title: 'Obter um rastreio de integração',
      description: 'Devolve um rastreio do histórico por id, com os oito passos, os trechos de log, as observações e o relatório em Markdown.',
      inputSchema: { id: z.string().describe('Id do rastreio, como em integration_list_traces') }
    },
    async ({ id }) => {
      const trace = await integrationTraceService.getTrace(id);
      return trace ? reply(trace) : error('Rastreio não encontrado no histórico.');
    }
  );

  server.registerTool(
    'integration_check_wsh',
    {
      title: 'Consultar o monitor do WSH',
      description:
        'Consulta o que o WSH (Winthor Smart Hub) gravou na PCINTEGRACAOCORE do Oracle, sem credencial do PDVSync: cada linha é um item (produto, preço, cobrança...) buscado no WinThor por uma rota de busca e enviado ao PDVSync pela rota de envio. Filtra por rota (routeId), trecho do IDEXTERNO (ex.: código do produto), status (error = STATUS 3, ok = STATUS 2) e período. Devolve status, tentativas, datas da busca e do envio, a resposta do PDVSync lida da OBSERVACAO e os erros separados em ownErrors (citam o item) e otherErrors (outros itens do mesmo envio: o PDVSync recusa a requisição inteira). Com routeId, devolve também dependencies: a última integração de cada fluxo do qual ele depende (ex.: Produto depende de ICMS, PIS/COFINS e NCM; found=false significa que o fluxo nunca integrou neste banco) e schedule: os fluxos do WSH que usam a rota, se o passo dela está ativo (routeActive) e o intervalo do agendamento em segundos, como configurado neste cliente. Cada item com erro traz suggestions: o que fazer, em ordem (corrigir os itens que derrubaram o envio, valor fora da lista aceita, campo vazio, dependência que não integrou), com o link do TDN quando o PDVSync manda. Vale para envio (WinThor → PDVSync) e recebimento (vendas, pedidos e caixa: PDVSync → WinThor). Só leitura; usa a conexão Oracle da camada WinThor.',
      inputSchema: {
        routeId: z.number().int().positive().optional().describe('Id da rota de busca (PCINTEGRACAOROTASERVICO.ID); sem ele, todas'),
        text: z.string().optional().describe('Trecho do IDEXTERNO ou do IDINTERNO: "produto-1000", o código do item ou o cupom da venda (o IDINTERNO da venda é filial-série-cupom, ex.: 1-3-10905)'),
        status: z.enum(['all', 'error', 'ok']).optional().describe('Filtro de status (padrão all)'),
        lookbackHours: z.number().positive().optional().describe('Período para trás, em horas (padrão 72, máximo 2160)'),
        limit: z.number().int().positive().optional().describe('Máximo de linhas (padrão 100, máximo 500)')
      }
    },
    async (request) => {
      try {
        const [routes, response] = await Promise.all([integrationTraceService.listWshRoutes(), integrationTraceService.searchWsh(request)]);
        if (!response.success) return error(response.error);
        const routeList = routes.success ? routes.routes : [];
        // Com o fluxo escolhido, junta a situação dos fluxos de que ele depende (a causa provável de muitos erros)
        const routeName = request.routeId ? routeList.find((route) => route.id === request.routeId)?.name : undefined;
        const [dependencies, schedule] = routeName
          ? await Promise.all([integrationTraceService.checkWshDependencies(routeName), integrationTraceService.checkWshSchedule(routeName)])
          : [undefined, undefined];
        const deps = dependencies?.success ? dependencies.dependencies : undefined;
        // Cada item com erro já vem com o "Como resolver" (regras sobre os erros, o catálogo e as dependências)
        const items = response.items.map((item) => ({ ...item, suggestions: suggestWshFixes(item, deps) }));
        return reply({
          ...response,
          items,
          routes: routeList,
          ...(deps ? { dependencies: deps } : {}),
          ...(schedule?.success ? { schedule: schedule.info } : {})
        });
      } catch (err: any) {
        return error(err?.message || 'Falha ao consultar o monitor do WSH.');
      }
    }
  );
}
