import type { IntegrationLayerConfig } from '../../../shared/integrationTypes';
import { decryptSecret, encryptSecret } from '../../utils/secretsCrypto';

/**
 * Segredos das camadas do Rastreio de Integração (`auth.password` e `auth.token`), com as mesmas
 * quatro operações que o `ConfigService` aplica aos outros segredos: descriptografar ao ler,
 * criptografar ao gravar, sanitizar ao devolver e preservar o salvo quando o save volta vazio.
 * Fica fora do `ConfigService` porque aquele arquivo já passa do teto de linhas do projeto.
 */

export function decryptIntegrationLayersInPlace(layers: IntegrationLayerConfig[] | undefined, configDir: string): void {
  layers?.forEach((layer) => {
    if (!layer.auth) return;
    if (layer.auth.password) layer.auth.password = decryptSecret(layer.auth.password, configDir);
    if (layer.auth.token) layer.auth.token = decryptSecret(layer.auth.token, configDir);
  });
}

export function encryptIntegrationLayersForDisk(
  layers: IntegrationLayerConfig[] | undefined,
  configDir: string
): IntegrationLayerConfig[] | undefined {
  return layers?.map((layer) => {
    if (!layer.auth) return layer;
    return {
      ...layer,
      auth: {
        ...layer.auth,
        password: layer.auth.password ? encryptSecret(layer.auth.password, configDir) : layer.auth.password,
        token: layer.auth.token ? encryptSecret(layer.auth.token, configDir) : layer.auth.token
      }
    };
  });
}

/** Esconde os segredos e sinaliza que existem, para a UI mostrar "senha salva" sem receber o valor. */
export function sanitizeIntegrationLayers(layers: IntegrationLayerConfig[] | undefined): IntegrationLayerConfig[] | undefined {
  return layers?.map((layer) => {
    if (!layer.auth) return layer;
    return {
      ...layer,
      auth: {
        ...layer.auth,
        password: '',
        token: '',
        hasPassword: Boolean(layer.auth.password && layer.auth.password.trim().length > 0),
        hasToken: Boolean(layer.auth.token && layer.auth.token.trim().length > 0)
      }
    };
  });
}

/**
 * Reaproveita o segredo salvo quando o candidato o reenvia vazio, mas só se a `baseUrl` da camada
 * não mudou: trocar o destino sem reenviar a credencial exige digitá-la de novo, para um save
 * adulterado não redirecionar uma senha real a outro endpoint.
 */
export function preserveIntegrationLayerSecrets(
  candidate: IntegrationLayerConfig[] | undefined,
  current: IntegrationLayerConfig[] | undefined
): IntegrationLayerConfig[] | undefined {
  if (!Array.isArray(candidate)) return candidate;
  return candidate.map((layer) => {
    if (!layer.auth) return layer;
    const existing = current?.find((c) => c.layer === layer.layer);
    const destinationChanged = !!existing && !!layer.baseUrl && !!existing.baseUrl && layer.baseUrl !== existing.baseUrl;
    const keep = (incoming: string | undefined, saved: string | undefined) =>
      incoming || (destinationChanged ? '' : saved || '');
    // Os sinalizadores vêm da UI sanitizada e não devem ir para o disco.
    const auth = { ...layer.auth };
    delete auth.hasPassword;
    delete auth.hasToken;
    return {
      ...layer,
      auth: {
        ...auth,
        password: keep(layer.auth.password, existing?.auth?.password),
        token: keep(layer.auth.token, existing?.auth?.token)
      }
    };
  });
}
