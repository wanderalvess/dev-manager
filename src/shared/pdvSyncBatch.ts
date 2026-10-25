/**
 * Lote do PDVSync (CH), como os layouts do WSH o enxergam (repositório totvs/winthor-smart-hub-layouts,
 * rotas `PDVSYNC - CONSULTAR LOTE` e `PDVSYNC - CONSULTAR STATUS LOTE`). Compartilhado entre o rastreio
 * (main) e a tela de configuração (renderer).
 */

export type PdvSyncStatusKind =
  | 'preparing'
  | 'processing'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'sent'
  | 'error'
  | 'unknown';

export interface PdvSyncStatusInfo {
  name: string;
  kind: PdvSyncStatusKind;
}

/**
 * Códigos de `LoteExternoRetornos` e de `LojaLoteStatusretorno`. Os nomes vêm da transformação da rota no WSH.
 * Os grupos (`kind`) são leitura nossa: 2 e 4 viram "em andamento" (11), 5 "concluído" (12) e 6 "erro" (13) quando
 * o WSH grava o status por loja no WinThor. O significado de `sent` (7) ainda precisa de confirmação.
 */
export const PDVSYNC_STATUS: Readonly<Record<number, PdvSyncStatusInfo>> = {
  0: { name: 'EmPreparacao', kind: 'preparing' },
  1: { name: 'EmProcessamento', kind: 'processing' },
  2: { name: 'Disponivel', kind: 'available' },
  3: { name: 'Indisponivel', kind: 'error' },
  4: { name: 'EmProcessoDeBaixa', kind: 'downloading' },
  5: { name: 'BaixadoComSucesso', kind: 'downloaded' },
  6: { name: 'BaixadoComErro', kind: 'error' },
  7: { name: 'EnviadoComSucesso', kind: 'sent' },
  8: { name: 'EnviadoComErro', kind: 'error' },
  9: { name: 'ComProblemaVerificar', kind: 'error' }
};

/** O PDVSync devolve o status como número, texto (`"5"`) ou decimal (`"5.0"`): tudo vira o inteiro. */
export function normalizeStatusCode(raw: unknown): number | undefined {
  if (typeof raw !== 'number' && typeof raw !== 'string') return undefined;
  if (typeof raw === 'string' && raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

export function describeStatus(code: number | undefined): PdvSyncStatusInfo {
  if (code === undefined) return { name: 'sem status', kind: 'unknown' };
  return PDVSYNC_STATUS[code] ?? { name: `status ${code}`, kind: 'unknown' };
}

export type PdvSyncEnvironmentId = 'producao' | 'homologacao';

export interface PdvSyncEnvironmentPreset {
  id: PdvSyncEnvironmentId;
  label: string;
  batchStatusUrl: string;
  storeStatusUrl: string;
}

/**
 * Endereços públicos dos parâmetros `AMBIENTE_PRODUCAO` e `AMBIENTE_HOMOLOGACAO` do repositório de layouts. São só
 * atalhos de preenchimento: o usuário pode editar, e um ambiente local ou espelhado usa outros endereços. O login (RAC)
 * não consta no repositório e é sempre informado pelo usuário.
 */
export const PDVSYNC_ENVIRONMENTS: readonly PdvSyncEnvironmentPreset[] = [
  {
    id: 'producao',
    label: 'Produção',
    batchStatusUrl: 'https://pdvsync.varejo.totvs.com.br/controleprocesso/api/retaguarda/v3/LoteExternoRetornos',
    storeStatusUrl: 'https://pdvsync.varejo.totvs.com.br/controle/api/retaguarda/v3/LojaLoteStatusretorno'
  },
  {
    id: 'homologacao',
    label: 'Homologação',
    batchStatusUrl: 'https://qua-pdvsync.varejo.totvs.com.br/controleprocesso/api/retaguarda/v3/LoteExternoRetornos',
    storeStatusUrl: 'https://qua-pdvsync.varejo.totvs.com.br/controleprocesso/api/retaguarda/v3/LojaLoteStatusretorno'
  }
];

/** Qual atalho de ambiente corresponde aos endereços já preenchidos; `undefined` quando são personalizados. */
export function matchEnvironment(batchStatusUrl?: string, storeStatusUrl?: string): PdvSyncEnvironmentId | undefined {
  return PDVSYNC_ENVIRONMENTS.find((env) => env.batchStatusUrl === batchStatusUrl && env.storeStatusUrl === storeStatusUrl)?.id;
}
