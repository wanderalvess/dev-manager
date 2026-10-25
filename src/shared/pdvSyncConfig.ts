import type { IntegrationLayerConfig } from './integrationTypes';

/**
 * Configuração do PDVSync (CH) na camada CH (decisão 0003). Funções puras: dizem o que falta preencher e montam a
 * configuração do cliente. Os endereços são validados com `isSafeUrl` no cliente, antes de qualquer requisição.
 */

export interface PdvSyncCredentials {
  racUrl: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
}

export interface PdvSyncTarget {
  tenantId: string;
  /** Base de `LoteExternoRetornos`; o cliente acrescenta `/<inquilino>/<lote>`. */
  batchStatusUrl: string;
  /** Base de `LojaLoteStatusretorno`; opcional (sem ela só há o status do lote). */
  storeStatusUrl?: string;
}

export interface PdvSyncSettings {
  credentials: PdvSyncCredentials;
  target: PdvSyncTarget;
}

const text = (value: string | undefined) => value?.trim() ?? '';

/**
 * Campos do login (RAC) que ainda faltam, com o nome que o usuário vê na tela.
 *
 * A tela recebe os segredos vazios e só o sinal de que existem (`hasPassword`, `hasClientSecret`); com
 * `savedCountsAsPresent` esse sinal vale como preenchido. O backend não usa a opção: ele precisa do valor de verdade.
 */
export function missingLoginFields(layer: IntegrationLayerConfig, savedCountsAsPresent = false): string[] {
  const auth = layer.auth;
  const has = (value: string | undefined, saved: boolean | undefined) => Boolean(text(value)) || (savedCountsAsPresent && saved === true);
  const missing: string[] = [];
  if (!text(layer.pdvsync?.racUrl)) missing.push('endereço do login (RAC)');
  if (!text(auth?.user)) missing.push('usuário');
  if (!has(auth?.password, auth?.hasPassword)) missing.push('senha');
  if (!text(auth?.clientId)) missing.push('client_id');
  if (!has(auth?.clientSecret, auth?.hasClientSecret)) missing.push('client_secret');
  return missing;
}

/** Campos para consultar o lote: o login e mais o inquilino e o endereço de consulta. */
export function missingLookupFields(layer: IntegrationLayerConfig, savedCountsAsPresent = false): string[] {
  const missing = missingLoginFields(layer, savedCountsAsPresent);
  if (!text(layer.pdvsync?.tenantId)) missing.push('inquilino');
  if (!text(layer.pdvsync?.batchStatusUrl)) missing.push('endereço de consulta do lote');
  return missing;
}

/** A camada usa o login do PDVSync? Só então o pré-voo e o rastreio tentam falar com a API. */
export function usesPdvSyncLogin(layer: IntegrationLayerConfig | undefined): boolean {
  return layer?.layer === 'ch' && layer.auth?.type === 'rac-password';
}

/** Configuração completa para o cliente, ou `null` se a camada não usa o PDVSync ou falta algum campo. */
export function toPdvSyncSettings(layer: IntegrationLayerConfig | undefined): PdvSyncSettings | null {
  if (!layer || !usesPdvSyncLogin(layer) || missingLookupFields(layer).length > 0) return null;
  const auth = layer.auth!;
  return {
    credentials: {
      racUrl: text(layer.pdvsync?.racUrl),
      username: text(auth.user),
      password: auth.password ?? '',
      clientId: text(auth.clientId),
      clientSecret: auth.clientSecret ?? ''
    },
    target: {
      tenantId: text(layer.pdvsync?.tenantId),
      batchStatusUrl: text(layer.pdvsync?.batchStatusUrl),
      storeStatusUrl: text(layer.pdvsync?.storeStatusUrl) || undefined
    }
  };
}

/** Só o login: usado pelo pré-voo, que não precisa de inquilino nem de endereço de consulta. */
export function toPdvSyncCredentials(layer: IntegrationLayerConfig | undefined): PdvSyncCredentials | null {
  if (!layer || !usesPdvSyncLogin(layer) || missingLoginFields(layer).length > 0) return null;
  const auth = layer.auth!;
  return {
    racUrl: text(layer.pdvsync?.racUrl),
    username: text(auth.user),
    password: auth.password ?? '',
    clientId: text(auth.clientId),
    clientSecret: auth.clientSecret ?? ''
  };
}
