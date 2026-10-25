import {
  INTEGRATION_LAYER_ORDER,
  type IntegrationFlowDefinition,
  type IntegrationLayerConfig,
  type IntegrationLayerId
} from '../../../shared/integrationTypes';
import { usesPdvSyncLogin } from '../../../shared/pdvSyncConfig';

/**
 * Lógica pura da aba "Integração ponta a ponta" das Configurações (decisão 0003): as quatro
 * camadas sempre aparecem na ordem da cadeia, e cada fluxo é validado antes de salvar.
 */

/** Uma entrada por camada, na ordem WinThor → WSH → CH → PDV, preenchendo as que ainda não foram salvas. */
export function ensureAllLayers(layers: IntegrationLayerConfig[] | undefined): IntegrationLayerConfig[] {
  return INTEGRATION_LAYER_ORDER.map((layer) => layers?.find((entry) => entry.layer === layer) ?? { layer });
}

export function patchLayer(
  layers: IntegrationLayerConfig[] | undefined,
  layer: IntegrationLayerId,
  patch: Partial<IntegrationLayerConfig>
): IntegrationLayerConfig[] {
  return ensureAllLayers(layers).map((entry) => (entry.layer === layer ? { ...entry, ...patch } : entry));
}

/** Uma camada conta como configurada quando tem pelo menos um jeito de ser alcançada ou observada. */
export function isLayerConfigured(layer: IntegrationLayerConfig): boolean {
  return Boolean(
    layer.baseUrl?.trim() ||
      layer.port ||
      layer.windowsServiceName?.trim() ||
      layer.processName?.trim() ||
      layer.dbConnectionId ||
      layer.logFilePath?.trim() ||
      usesPdvSyncLogin(layer)
  );
}

export function countConfiguredLayers(layers: IntegrationLayerConfig[] | undefined): number {
  return ensureAllLayers(layers).filter(isLayerConfigured).length;
}

export function createFlowDraft(now: number): IntegrationFlowDefinition {
  return {
    id: `flow-${now}`,
    name: 'Novo fluxo',
    chBatchType: '',
    trigger: { method: 'POST', path: '' },
    evidence: { pdvQuery: '', pdvWaitSeconds: 60 },
    enabled: true
  };
}

export function updateFlowAt(
  flows: IntegrationFlowDefinition[] | undefined,
  index: number,
  patch: Partial<IntegrationFlowDefinition>
): IntegrationFlowDefinition[] {
  const list = [...(flows || [])];
  if (list[index]) list[index] = { ...list[index], ...patch };
  return list;
}

export function removeFlowAt(flows: IntegrationFlowDefinition[] | undefined, index: number): IntegrationFlowDefinition[] {
  const list = [...(flows || [])];
  list.splice(index, 1);
  return list;
}

/** Só http/https: a validação completa (`isSafeUrl`) acontece no main antes de qualquer requisição. */
export function isHttpUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Problemas que impedem o fluxo de rodar, em português, para mostrar no cartão. */
export function validateFlow(flow: IntegrationFlowDefinition): string[] {
  const issues: string[] = [];
  if (!flow.name?.trim()) issues.push('Informe o nome do fluxo.');
  if (!flow.chBatchType?.trim()) issues.push('Informe o tipo de lote no CH.');
  if (!flow.evidence?.pdvQuery?.trim()) issues.push('Informe a consulta de evidência no PDV.');
  if (!(flow.evidence?.pdvWaitSeconds > 0)) issues.push('A espera pela descida ao PDV precisa ser maior que zero.');
  if (flow.trigger && flow.trigger.path.trim() && !flow.trigger.path.trim().startsWith('/')) {
    issues.push('O caminho de disparo no WSH deve começar com "/".');
  }
  return issues;
}

export function validateLayer(layer: IntegrationLayerConfig): string[] {
  const issues: string[] = [];
  if (layer.baseUrl?.trim() && !isHttpUrl(layer.baseUrl)) issues.push('A URL base precisa começar com http:// ou https://.');
  if (layer.healthPath?.trim() && !layer.healthPath.trim().startsWith('/')) issues.push('O caminho de health deve começar com "/".');
  const pdvsyncUrls: [string, string | undefined][] = [
    ['endereço do login (RAC)', layer.pdvsync?.racUrl],
    ['endereço de consulta do lote', layer.pdvsync?.batchStatusUrl],
    ['endereço do status por loja', layer.pdvsync?.storeStatusUrl]
  ];
  for (const [label, url] of pdvsyncUrls) {
    if (url?.trim() && !isHttpUrl(url)) issues.push(`O ${label} precisa começar com http:// ou https://.`);
  }
  if (layer.port !== undefined && (!Number.isInteger(layer.port) || layer.port < 1 || layer.port > 65535)) {
    issues.push('A porta precisa estar entre 1 e 65535.');
  }
  return issues;
}

/** Campo de porta: vazio vira indefinido, texto inválido vira indefinido, número vira inteiro. */
export function parsePortInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
