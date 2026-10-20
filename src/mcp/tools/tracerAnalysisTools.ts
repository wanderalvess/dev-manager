import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OracleTracerCaptureService } from '../../main/services/OracleTracerCaptureService';
import { analyzeTracerCapture } from '../../shared/oracleTracerAnalysis';

interface TracerAnalysisDeps {
  oracleTracerCaptureService: OracleTracerCaptureService;
  /** Resolve a conexão pelo id (ou config inline) do mesmo jeito que as demais tools de banco. */
  resolveConnection: (connectionId?: string) => { id: string; name: string } | null;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

/** Análise da captura do Statement Tracer por rotina: lentas, repetidas e telas tocadas. */
export function registerTracerAnalysisTools(server: McpServer, deps: TracerAnalysisDeps): void {
  const { oracleTracerCaptureService, resolveConnection } = deps;
  const reply = deps.ok as (data: unknown) => never;
  const error = deps.fail as (message: string) => never;

  server.registerTool(
    'db_analyze_oracle_capture',
    {
      title: 'Statement Tracer: analisar captura por rotina',
      description:
        'Agrupa o que a captura contínua acumulou (db_start_oracle_capture) pelo módulo Oracle que executou cada SQL (ex.: PCSIS2075.exe) e, para cada rotina, devolve as consultas mais lentas (tempo médio por execução), as repetidas (possível N+1: mesma consulta em laço ou variações só de valor literal) e as telas (ACTION) tocadas. Use depois de pedir ao usuário que execute a ação na rotina Delphi.',
      inputSchema: {
        connectionId: z.string().optional(),
        topSlow: z.number().int().positive().max(20).optional().describe('Consultas lentas por rotina (padrão 5).'),
        manyExecutions: z.number().int().positive().optional().describe('Execuções a partir das quais uma consulta é "repetida" (padrão 50).'),
        literalVariants: z.number().int().positive().optional().describe('SQL_IDs distintos com o mesmo texto base para apontar SQL concatenado (padrão 5).')
      }
    },
    async ({ connectionId, topSlow, manyExecutions, literalVariants }) => {
      const target = resolveConnection(connectionId);
      if (!target) return error('Nenhuma conexão configurada ou encontrada. Informe connectionId.');
      const state = oracleTracerCaptureService.getCaptureState(target.id);
      if (state.pollCount === 0) {
        return error('Nenhuma captura acumulada para esta conexão. Inicie com db_start_oracle_capture e execute a ação na rotina.');
      }
      return reply({
        connectionId: target.id,
        connectionName: target.name,
        isCapturing: state.isCapturing,
        totalStatements: state.statements.length,
        routines: analyzeTracerCapture(state.statements, { topSlow, manyExecutions, literalVariants })
      });
    }
  );
}
