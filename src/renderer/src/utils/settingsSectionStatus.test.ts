import { describe, expect, it } from 'vitest';
import { computeSectionStatuses } from './settingsSectionStatus';
import type { SetupChecklistItemStatus } from './settingsListEditors';

const item = (id: SetupChecklistItemStatus['id'], done: boolean): SetupChecklistItemStatus => ({ id, label: id, done });

describe('computeSectionStatuses', () => {
  it('marca Caminhos e Karaf pelo checklist inicial', () => {
    const statuses = computeSectionStatuses(
      [item('dirs', true), item('ide', true), item('karaf-path', true), item('karaf-creds', false), item('database', false)],
      {}
    );
    expect(statuses.dirs).toEqual({ kind: 'ok' });
    expect(statuses.karaf).toEqual({ kind: 'pending', count: 1 });
  });

  it('conta todas as pendências da seção', () => {
    const statuses = computeSectionStatuses([item('dirs', false), item('ide', false)], {});
    expect(statuses.dirs).toEqual({ kind: 'pending', count: 2 });
  });

  it('marca Qualidade e Integração como opcionais só enquanto vazias', () => {
    expect(computeSectionStatuses([], {})).toMatchObject({ quality: { kind: 'optional' }, integration: { kind: 'optional' } });
    const configured = computeSectionStatuses([], { tautProjectPath: 'C:\\taut', integrationLayers: [{} as never] });
    expect(configured.quality).toBeUndefined();
    expect(configured.integration).toBeUndefined();
  });

  it('não marca seções sem regra', () => {
    expect(computeSectionStatuses([], {}).ai).toBeUndefined();
  });
});
