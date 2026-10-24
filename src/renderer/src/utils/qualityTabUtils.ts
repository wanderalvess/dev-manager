import { QualitySourceConfig, QualitySourceType } from '../../../shared/types';

export interface QualityProviderBadge {
  label: string;
  color: string;
}

export function getQualityProviderBadge(type: QualitySourceType): QualityProviderBadge {
  switch (type) {
    case 'zephyr-scale':
      return { label: 'Zephyr Scale', color: 'bg-success/10 text-success border-success/25' };
    case 'zephyr-squad':
      return { label: 'Zephyr Squad', color: 'bg-info/10 text-info border-info/25' };
    case 'jira':
      return { label: 'Jira Software', color: 'bg-info/10 text-info border-info/25' };
    case 'azure-test-plans':
      return { label: 'Azure Test Plans', color: 'bg-primary/10 text-primary border-primary/25' };
    case 'custom-webhook':
    default:
      return { label: 'Webhook / Custom', color: 'bg-primary/10 text-primary border-primary/25' };
  }
}

/** Fonte ativa: a escolhida explicitamente ou, na falta, a habilitada. */
export function isQualitySourceActive(source: QualitySourceConfig, activeSourceId: string | undefined): boolean {
  return activeSourceId ? source.id === activeSourceId : source.enabled;
}

export function findActiveQualitySource(
  sources: QualitySourceConfig[],
  activeSourceId: string | undefined
): QualitySourceConfig | undefined {
  return sources.find((s) => isQualitySourceActive(s, activeSourceId));
}

export function createNewQualitySourceDraft(now: number): Partial<QualitySourceConfig> {
  return {
    id: `quality-${now}`,
    name: 'Nova Fonte de Testes',
    type: 'zephyr-scale',
    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
    enabled: true
  };
}
