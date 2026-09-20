/**
 * Lógica pura extraída de SettingsPage.tsx: edição imutável das listas de
 * configuração (serviços/processos/portas/fontes de log monitorados) e o
 * status do checklist de configuração inicial. Extraída para ser testável
 * sem precisar renderizar o componente.
 */
import type { AppSettings, PathStatusInfo } from '../../../shared/types';

/** Adiciona um item ao final da lista, partindo da lista padrão se `current` estiver vazio/indefinido. */
export function addToList<T>(current: T[] | undefined, defaultList: T[], newItem: T): T[] {
  return [...(current || defaultList), newItem];
}

/** Mescla `patch` no item do índice informado, sem alterar a lista se o índice não existir. */
export function updateAtIndex<T>(current: T[] | undefined, defaultList: T[], index: number, patch: Partial<T>): T[] {
  const list = [...(current || defaultList)];
  if (list[index]) {
    list[index] = { ...list[index], ...patch };
  }
  return list;
}

/** Remove o item do índice informado. Índices fora do intervalo são no-op (comportamento do Array.prototype.splice). */
export function removeAtIndex<T>(current: T[] | undefined, defaultList: T[], index: number): T[] {
  const list = [...(current || defaultList)];
  list.splice(index, 1);
  return list;
}

/**
 * Coage o valor de um campo de porta monitorada: o campo `port` é sempre convertido
 * para inteiro (0 se não for um número válido); os demais campos passam intactos.
 */
export function coercePortFieldValue(field: string, value: unknown): unknown {
  if (field !== 'port') return value;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export interface SetupChecklistItemStatus {
  id: 'dirs' | 'ide' | 'karaf-creds' | 'database';
  label: string;
  done: boolean;
}

/** Deriva o status (feito/pendente) de cada item do checklist de configuração inicial. */
export function computeSetupChecklistStatus(
  settings: Partial<Pick<AppSettings, 'karafUser' | 'karafPass' | 'databaseConnections'>>,
  pathStatuses: Record<string, PathStatusInfo>
): SetupChecklistItemStatus[] {
  return [
    {
      id: 'dirs',
      label: 'Diretórios de Repositórios & Karaf',
      done: Boolean(pathStatuses.projectsPath?.exists && pathStatuses.karafPath?.exists)
    },
    {
      id: 'ide',
      label: 'IDE detectada (IntelliJ)',
      done: Boolean(pathStatuses.intellijPath?.exists)
    },
    {
      id: 'karaf-creds',
      label: 'Credenciais do Karaf',
      done: Boolean(settings.karafUser?.trim() && settings.karafPass?.trim())
    },
    {
      id: 'database',
      label: 'Conexão de Banco de Dados',
      done: Boolean(settings.databaseConnections && settings.databaseConnections.length > 0)
    }
  ];
}
