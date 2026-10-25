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

export function authOptionsFor(layer: IntegrationLayerId): AuthOption[] {
  return layer === 'ch' ? [...BASE_OPTIONS, RAC_OPTION] : BASE_OPTIONS;
}
