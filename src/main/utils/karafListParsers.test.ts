import { describe, expect, it } from 'vitest';
import {
  parseAllFeaturesOutput,
  parseBundleListOutput,
  parseBundleState,
  parseInstalledFeaturesOutput
} from './karafListParsers';

describe('karafListParsers', () => {
  it('parseBundleState mapeia estados textuais e cai em Unknown', () => {
    expect(parseBundleState('Active')).toBe('Active');
    expect(parseBundleState('resolved')).toBe('Resolved');
    expect(parseBundleState('Installed')).toBe('Installed');
    expect(parseBundleState('Starting')).toBe('Starting');
    expect(parseBundleState('Stopping')).toBe('Stopping');
    expect(parseBundleState('???')).toBe('Unknown');
  });

  it('parseBundleListOutput le formato por pipe e por colchetes, ignorando cabecalhos', () => {
    const out = [
      'START LEVEL 100 , List Threshold: 50',
      'ID | State  | Lvl | Version | Name',
      '10 | Active | 80  | 1.0.0   | My Bundle',
      '[ 11] [Active     ] [            ] [   80] Other Bundle (2.0.0)'
    ].join('\n');
    const bundles = parseBundleListOutput(out);
    expect(bundles).toHaveLength(2);
    expect(bundles[0]).toMatchObject({ id: '10', state: 'Active', level: '80', version: '1.0.0', name: 'My Bundle' });
    expect(bundles[1]).toMatchObject({ id: '11', state: 'Active', level: '80', version: '2.0.0', name: 'Other Bundle' });
  });

  it('parseInstalledFeaturesOutput marca tudo como instalado e detecta WinThor', () => {
    const out = ['Name | Version | Required | State | Repository', 'winthor-core | 1.0 | x | Started | repo-1'].join('\n');
    const features = parseInstalledFeaturesOutput(out);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ name: 'winthor-core', required: true, installed: true, isWinthor: true });
  });

  it('parseAllFeaturesOutput deriva installed do estado', () => {
    const out = ['a | 1 | | Started | r', 'b | 1 | | Uninstalled | r', 'c | 1 | | | r'].join('\n');
    const features = parseAllFeaturesOutput(out);
    expect(features.map((f) => f.installed)).toEqual([true, false, false]);
    expect(features[2].state).toBe('Uninstalled');
  });
});
