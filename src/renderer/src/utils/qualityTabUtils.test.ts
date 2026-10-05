import { describe, expect, it } from 'vitest';
import type { QualitySourceConfig } from '../../../shared/types';
import {
  createNewQualitySourceDraft,
  findActiveQualitySource,
  getQualityProviderBadge,
  isQualitySourceActive
} from './qualityTabUtils';

const makeSource = (over: Partial<QualitySourceConfig> = {}): QualitySourceConfig =>
  ({ id: 's1', name: 'S1', type: 'jira', baseUrl: 'https://x', enabled: true, ...over }) as QualitySourceConfig;

describe('qualityTabUtils', () => {
  it('getQualityProviderBadge mapeia rótulos e usa fallback para custom', () => {
    expect(getQualityProviderBadge('zephyr-scale').label).toBe('Zephyr Scale');
    expect(getQualityProviderBadge('zephyr-squad').label).toBe('Zephyr Squad');
    expect(getQualityProviderBadge('jira').label).toBe('Jira Software');
    expect(getQualityProviderBadge('azure-test-plans').label).toBe('Azure Test Plans');
    expect(getQualityProviderBadge('custom-webhook').label).toBe('Webhook / Custom');
  });

  it('isQualitySourceActive prioriza o id ativo', () => {
    const s = makeSource({ id: 'a', enabled: false });
    expect(isQualitySourceActive(s, 'a')).toBe(true);
    expect(isQualitySourceActive(s, 'b')).toBe(false);
    expect(isQualitySourceActive(s, undefined)).toBe(false);
    expect(isQualitySourceActive(makeSource(), undefined)).toBe(true);
  });

  it('findActiveQualitySource retorna a fonte ativa', () => {
    const a = makeSource({ id: 'a', enabled: false });
    const b = makeSource({ id: 'b' });
    expect(findActiveQualitySource([a, b], undefined)?.id).toBe('b');
    expect(findActiveQualitySource([a, b], 'a')?.id).toBe('a');
    expect(findActiveQualitySource([], undefined)).toBeUndefined();
  });

  it('createNewQualitySourceDraft gera id com timestamp', () => {
    const d = createNewQualitySourceDraft(7);
    expect(d.id).toBe('quality-7');
    expect(d.type).toBe('zephyr-scale');
  });
});
