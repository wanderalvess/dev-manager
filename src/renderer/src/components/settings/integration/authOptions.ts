import type { IntegrationLayerAuthType, IntegrationLayerId } from '../../../../../shared/integrationTypes';

export interface AuthOption {
  value: IntegrationLayerAuthType;
  label: string;
}

const BASE_OPTIONS: AuthOption[] = [
  { value: 'none', label: 'Sem autenticação' },
  { value: 'basic', label: 'Usuário e senha (Basic)' },
  { value: 'bearer', label: 'Token (Bearer)' },
  { value: 'winthor', label: 'Login do WinThor (usuário e senha)' }
];

/** O login do PDVSync (RAC) só faz sentido na camada CH. */
const RAC_OPTION: AuthOption = { value: 'rac-password', label: 'Login do PDVSync (RAC)' };

/** Na camada WinThor, o padrão é reaproveitar o login já salvo em Diretórios & IDE → WinThor Start. */
const HUB_WINTHOR_OPTION: AuthOption = { value: 'hub-winthor', label: 'Login do WinThor das Configurações' };

export function authOptionsFor(layer: IntegrationLayerId): AuthOption[] {
  if (layer === 'winthor') return [HUB_WINTHOR_OPTION, ...BASE_OPTIONS];
  return layer === 'ch' ? [...BASE_OPTIONS, RAC_OPTION] : BASE_OPTIONS;
}

/** Autenticação mostrada quando a camada ainda não escolheu uma. */
export const defaultAuthType = (layer: IntegrationLayerId): IntegrationLayerAuthType => (layer === 'winthor' ? 'hub-winthor' : 'none');
