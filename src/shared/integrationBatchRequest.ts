import {
  DEFAULT_TRACE_LOOKBACK_MINUTES,
  MAX_TRACE_LOOKBACK_MINUTES,
  type IntegrationBatchTraceRequest
} from './integrationTypes';

export const MAX_BATCH_NUMBER_LENGTH = 64;

/** Números de lote reais são dígitos, mas o CH pode usar prefixo; só caracteres de identificador, sem espaço nem aspas. */
const BATCH_NUMBER_PATTERN = /^[A-Za-z0-9._\-/]+$/;

/** O código da filial (`idRetaguardaLoja`) segue a mesma regra de identificador, com limite menor. */
export const MAX_BRANCH_ID_LENGTH = 32;

export interface NormalizedBatchRequest {
  flowId: string;
  batchNumber: string;
  lookbackMinutes: number;
  /** Filial opcional para filtrar o status por loja no PDVSync. */
  branchId?: string;
}

export type BatchRequestValidation = { ok: true; value: NormalizedBatchRequest } | { ok: false; error: string };

/** Valida a entrada vinda da tela, da API REST ou do MCP: nunca confia no formato do que chega. */
export function validateBatchRequest(request: Partial<IntegrationBatchTraceRequest> | null | undefined): BatchRequestValidation {
  const flowId = typeof request?.flowId === 'string' ? request.flowId.trim() : '';
  if (!flowId) return { ok: false, error: 'Escolha o fluxo a rastrear.' };

  const batchNumber = typeof request?.batchNumber === 'string' ? request.batchNumber.trim() : '';
  if (!batchNumber) return { ok: false, error: 'Informe o número do lote.' };
  if (batchNumber.length > MAX_BATCH_NUMBER_LENGTH || !BATCH_NUMBER_PATTERN.test(batchNumber)) {
    return { ok: false, error: 'O número do lote só pode ter letras, números, ponto, hífen, barra ou sublinhado.' };
  }

  const rawLookback = request?.lookbackMinutes;
  const lookbackMinutes =
    typeof rawLookback === 'number' && Number.isFinite(rawLookback) && rawLookback > 0
      ? Math.min(Math.floor(rawLookback), MAX_TRACE_LOOKBACK_MINUTES)
      : DEFAULT_TRACE_LOOKBACK_MINUTES;

  const branchId = typeof request?.branchId === 'string' ? request.branchId.trim() : '';
  if (branchId && (branchId.length > MAX_BRANCH_ID_LENGTH || !BATCH_NUMBER_PATTERN.test(branchId))) {
    return { ok: false, error: 'A filial só pode ter letras, números, ponto, hífen, barra ou sublinhado.' };
  }

  return { ok: true, value: { flowId, batchNumber, lookbackMinutes, ...(branchId ? { branchId } : {}) } };
}
