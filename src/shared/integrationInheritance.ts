import type { IntegrationLayerConfig } from './integrationTypes';
import type { AppSettings } from './types';

/**
 * O que a camada WinThor herda de outras telas das Configurações, para ninguém digitar duas vezes:
 * a URL e o login do WinThor (Diretórios & IDE → WinThor Start) e o log dos serviços no Karaf (pasta do Karaf).
 * O que a camada preenche à mão sempre vence o herdado.
 */

export interface HubDefaults {
  wtaUrl?: string;
  wtaLogin?: string;
  wtaPassword?: string;
  /** Log dos serviços WinThor no Karaf, já resolvido pelo chamador (`<karaf>/data/log/winthor.log`). */
  karafLogPath?: string;
}

/** De onde vem cada valor herdado, para a tela explicar o placeholder. */
export const INHERITED_FROM = {
  baseUrl: 'Diretórios & IDE → WinThor Start',
  auth: 'Diretórios & IDE → WinThor Start',
  logFilePath: 'pasta do Karaf (Diretórios & IDE)'
} as const;

export type InheritedField = keyof typeof INHERITED_FROM;

const filled = (value: string | undefined) => Boolean(value?.trim());

/** Log dos serviços WinThor no Karaf (o mesmo que o Hub lê como fallback em Karaf & OSGi). */
export function karafServicesLogPath(karafPath: string | undefined): string | undefined {
  const base = karafPath?.trim().replace(/[\\/]+$/, '');
  if (!base) return undefined;
  const sep = base.includes('\\') ? '\\' : '/';
  return [base, 'data', 'log', 'winthor.log'].join(sep);
}

export function hubDefaultsFrom(settings: Partial<Pick<AppSettings, 'wtaUrl' | 'wtaLogin' | 'wtaPassword' | 'karafPath'>>): HubDefaults {
  return {
    wtaUrl: settings.wtaUrl,
    wtaLogin: settings.wtaLogin,
    wtaPassword: settings.wtaPassword,
    karafLogPath: karafServicesLogPath(settings.karafPath)
  };
}

/**
 * Login do WinThor da camada: `hub-winthor` usa o login das Configurações; sem autenticação escolhida, também,
 * desde que o Hub tenha um login salvo. Qualquer outra escolha da camada é respeitada.
 */
function usesHubLogin(layer: IntegrationLayerConfig, defaults: HubDefaults): boolean {
  if (layer.auth?.type === 'hub-winthor') return true;
  return !layer.auth?.type && filled(defaults.wtaLogin);
}

/** A camada como o pré-voo e o rastreio a usam: o que ficou vazio é completado com o que o Hub já sabe. */
export function effectiveLayer(layer: IntegrationLayerConfig, defaults: HubDefaults): IntegrationLayerConfig {
  if (layer.layer !== 'winthor') return layer;
  const effective: IntegrationLayerConfig = { ...layer };
  if (!filled(layer.baseUrl) && filled(defaults.wtaUrl)) effective.baseUrl = defaults.wtaUrl!.trim();
  if (!filled(layer.logFilePath) && filled(defaults.karafLogPath)) effective.logFilePath = defaults.karafLogPath;
  if (usesHubLogin(layer, defaults)) {
    effective.auth = { type: 'winthor', user: defaults.wtaLogin?.trim(), password: defaults.wtaPassword ?? '' };
  }
  return effective;
}

/** Valores que a camada está herdando agora (campo vazio e o Hub tem o valor), para mostrar na tela. */
export function inheritedValues(layer: IntegrationLayerConfig, defaults: HubDefaults): Partial<Record<InheritedField, string>> {
  if (layer.layer !== 'winthor') return {};
  const values: Partial<Record<InheritedField, string>> = {};
  if (!filled(layer.baseUrl) && filled(defaults.wtaUrl)) values.baseUrl = defaults.wtaUrl!.trim();
  if (!filled(layer.logFilePath) && filled(defaults.karafLogPath)) values.logFilePath = defaults.karafLogPath;
  if (usesHubLogin(layer, defaults) && filled(defaults.wtaLogin)) values.auth = defaults.wtaLogin!.trim();
  return values;
}
