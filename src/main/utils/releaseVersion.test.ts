import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion, pickPortableAsset } from './releaseVersion';

describe('releaseVersion', () => {
  it('parseVersion ignora o prefixo v e o sufixo de pré-release', () => {
    expect(parseVersion('v1.38.0')).toEqual([1, 38, 0]);
    expect(parseVersion('2.0.1-beta.3')).toEqual([2, 0, 1]);
  });

  it('compareVersions compara numericamente (1.10 > 1.9)', () => {
    expect(compareVersions('v1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.38.0', 'v1.38.0')).toBe(0);
    expect(compareVersions('1.24.0', '1.38.0')).toBeLessThan(0);
    expect(compareVersions('1.38', '1.38.0')).toBe(0);
  });

  it('pickPortableAsset escolhe o .exe portátil', () => {
    const release = {
      tag_name: 'v1.39.0',
      html_url: 'https://github.com/x/y/releases/tag/v1.39.0',
      assets: [
        { name: 'HubManager-Setup-1.39.0.exe', browser_download_url: 'a' },
        { name: 'HubManager-Portable-1.39.0.exe', browser_download_url: 'b' },
        { name: 'latest.yml', browser_download_url: 'c' }
      ]
    };
    expect(pickPortableAsset(release)?.browser_download_url).toBe('b');
    expect(pickPortableAsset({ ...release, assets: [] })).toBeUndefined();
  });
});
