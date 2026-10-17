import type { UsageRisk } from '../shared/usageMetricsTypes';
import { isUsageSegment } from '../main/utils/usageMetricsUtils';
import { MCP_PREFIX_TO_MODULE } from '../shared/usageActions';
import { classifyTool } from './toolSafety';

export interface McpUsageInfo {
  module: string;
  action: string;
  risk: UsageRisk;
}

/**
 * Como uma tool MCP vira métrica de uso: módulo = o do prefixo do nome (`db_run_backup` →
 * `database`, igual ao da interface; prefixo desconhecido vira o próprio prefixo), ação = o nome
 * inteiro, risco = a classificação de `toolSafety`. Devolve `null` quando a tool
 * não deve ser contada:
 *  - as próprias tools `usage_*` (um agente consultando as métricas não pode inflá-las);
 *  - nome fora do padrão de chave (nunca vira métrica com conteúdo estranho).
 */
export function mcpUsageInfo(toolName: string): McpUsageInfo | null {
  if (toolName.startsWith('usage_')) return null;
  const prefix = toolName.split('_')[0];
  const module = MCP_PREFIX_TO_MODULE[prefix] ?? prefix;
  if (!isUsageSegment(module) || !isUsageSegment(toolName)) return null;
  return { module, action: toolName, risk: classifyTool(toolName) };
}
