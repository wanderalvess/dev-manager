import type { IntegrationLayerConfig } from '../../../shared/integrationTypes';
import { decryptSecret, encryptSecret } from '../../utils/secretsCrypto';

/**
 * Segredos das camadas do Rastreio de Integração (`auth.password`, `auth.token` e `auth.clientSecret`), com as
 * mesmas quatro operações que o `ConfigService` aplica aos outros segredos: descriptografar ao ler, criptografar
 * ao gravar, sanitizar ao devolver e preservar o salvo quando o save volta vazio.
 * Fica fora do `ConfigService` porque aquele arquivo já passa do teto de linhas do projeto.
 */

const SECRET_FIELDS = ['password', 'token', 'clientSecret'] as const;

export function decryptIntegrationLayersInPlace(layers: IntegrationLayerConfig[] | undefined, configDir: string): void {
  layers?.forEach((layer) => {
    if (!layer.auth) return;
    for (const field of SECRET_FIELDS) {
      if (layer.auth[field]) layer.auth[field] = decryptSecret(layer.auth[field], configDir);
    }
  });
}

export function encryptIntegrationLayersForDisk(
  layers: IntegrationLayerConfig[] | undefined,
  configDir: string
): IntegrationLayerConfig[] | undefined {
  return layers?.map((layer) => {
    if (!layer.auth) return layer;
    const auth = { ...layer.auth };
    for (const field of SECRET_FIELDS) {
      if (auth[field]) auth[field] = encryptSecret(auth[field], configDir);
    }
    return { ...layer, auth };
  });
}

/** Esconde os segredos e sinaliza que existem, para a UI mostrar "salvo" sem receber o valor. */
export function sanitizeIntegrationLayers(layers: IntegrationLayerConfig[] | undefined): IntegrationLayerConfig[] | undefined {
  return layers?.map((layer) => {
    if (!layer.auth) return layer;
    const has = (value: string | undefined) => Boolean(value && value.trim().length > 0);
    return {
      ...layer,
      auth: {
        ...layer.auth,
        password: '',
        token: '',
        clientSecret: '',
        hasPassword: has(layer.auth.password),
        hasToken: has(layer.auth.token),
        hasClientSecret: has(layer.auth.clientSecret)
      }
    };
  });
}

/** Os destinos para onde um segredo da camada seria enviado: a URL base e, no PDVSync, o endereço do login. */
function destinationsChanged(next: IntegrationLayerConfig, saved: IntegrationLayerConfig | undefined): boolean {
  if (!saved) return false;
  const changed = (a: string | undefined, b: string | undefined) => !!a && !!b && a !== b;
  return changed(next.baseUrl, saved.baseUrl) || changed(next.pdvsync?.racUrl, saved.pdvsync?.racUrl);
}

/**
 * Reaproveita o segredo salvo quando o candidato o reenvia vazio, mas só se nenhum destino da camada mudou:
 * trocar a URL (ou o login do PDVSync) sem reenviar a credencial exige digitá-la de novo, para um save adulterado
 * não redirecionar uma senha real a outro endpoint.
 */
export function preserveIntegrationLayerSecrets(
  candidate: IntegrationLayerConfig[] | undefined,
  current: IntegrationLayerConfig[] | undefined
): IntegrationLayerConfig[] | undefined {
  if (!Array.isArray(candidate)) return candidate;
  return candidate.map((layer) => {
    if (!layer.auth) return layer;
    const existing = current?.find((c) => c.layer === layer.layer);
    const moved = destinationsChanged(layer, existing);
    const keep = (incoming: string | undefined, saved: string | undefined) => incoming || (moved ? '' : saved || '');
    // Os sinalizadores vêm da UI sanitizada e não devem ir para o disco.
    const auth = { ...layer.auth };
    delete auth.hasPassword;
    delete auth.hasToken;
    delete auth.hasClientSecret;
    return {
      ...layer,
      auth: {
        ...auth,
        password: keep(layer.auth.password, existing?.auth?.password),
        token: keep(layer.auth.token, existing?.auth?.token),
        clientSecret: keep(layer.auth.clientSecret, existing?.auth?.clientSecret)
      }
    };
  });
}
