import { describe, expect, it } from 'vitest';
import type { KarafBundleInfo } from '../../../shared/types';
import {
  compareOsgiVersions,
  findConflictingBundles,
  osgiToMavenVersion,
  rankPomDependencies,
  satisfiesVersionRange
} from './osgiVersionConflictUtils';

const bundle = (id: string, name: string, version: string, symbolicName?: string): KarafBundleInfo =>
  ({ id, state: 'Active', name, version, symbolicName }) as KarafBundleInfo;

describe('versões OSGi', () => {
  it('compara major.minor.micro ignorando o qualificador', () => {
    expect(compareOsgiVersions('0.0.1.SNAPSHOT', '1.39.0')).toBe(-1);
    expect(compareOsgiVersions('1.39.23.45', '1.39.23')).toBe(0);
    expect(compareOsgiVersions('1.39.23.45', '1.39.0')).toBe(1);
    expect(compareOsgiVersions('2.0.0', '1.39.9')).toBe(1);
    expect(compareOsgiVersions('1.2.3-SNAPSHOT', '1.2.3')).toBe(0);
  });

  it('aplica a faixa com mínimo inclusivo e máximo exclusivo', () => {
    expect(satisfiesVersionRange('0.0.1.SNAPSHOT', '1.39.0', '2.0.0')).toBe(false);
    expect(satisfiesVersionRange('1.39.0', '1.39.0', '2.0.0')).toBe(true);
    expect(satisfiesVersionRange('1.39.23.45', '1.39.0', '2.0.0')).toBe(true);
    expect(satisfiesVersionRange('2.0.0', '1.39.0', '2.0.0')).toBe(false);
    expect(satisfiesVersionRange('0.0.1', undefined, undefined)).toBe(true);
  });

  it('converte SNAPSHOT do formato OSGi para o do pom', () => {
    expect(osgiToMavenVersion('0.0.1.SNAPSHOT')).toBe('0.0.1-SNAPSHOT');
    expect(osgiToMavenVersion('1.39.23.45')).toBe('1.39.23.45');
    expect(osgiToMavenVersion('0.0.1-SNAPSHOT')).toBe('0.0.1-SNAPSHOT');
  });
});

describe('findConflictingBundles', () => {
  const diag = {
    missingItem: 'com.br.com.pcsist.winthor.varejo.matcon.domain.cancelamentofaturamento',
    matchedProfileName: 'matcon',
    versionMin: '1.39.0',
    versionMax: '2.0.0'
  };

  it('acha o módulo instalado em SNAPSHOT e prefere o nome mais específico do pacote', () => {
    const installed = [
      bundle('530', 'WinThor :: Financeiro :: Financeiro', '1.39.0.1'),
      bundle('542', 'WinThor :: integracao precos :: Service', '0.0.1.SNAPSHOT'),
      bundle('549', 'WinThor :: Integracao Matcon :: Service', '0.0.1.SNAPSHOT'),
      bundle('550', 'WinThor :: Varejo :: Base', '1.39.5')
    ];
    const result = findConflictingBundles(installed, diag);
    expect(result.map((b) => b.id)).toEqual(['549']);
  });

  it('ignora o bundle que já atende a faixa', () => {
    const installed = [bundle('549', 'WinThor :: Integracao Matcon :: Service', '1.39.23.45')];
    expect(findConflictingBundles(installed, diag)).toEqual([]);
  });

  it('usa também o artifactId do pom quando ele foi identificado', () => {
    const installed = [bundle('9', 'x', '0.0.1.SNAPSHOT', 'winthor-integracao-matcon-service')];
    const result = findConflictingBundles(installed, {
      ...diag,
      matchedProfileName: undefined,
      matchedPomDependency: { groupId: 'g', artifactId: 'winthor-integracao-matcon-service', version: '1.39.23.45' }
    });
    expect(result).toHaveLength(1);
  });
});

describe('rankPomDependencies', () => {
  it('sugere primeiro a dependência parecida com o bundle instalado', () => {
    const deps = [
      { groupId: 'a', artifactId: 'commons-lang3', version: '3.12.0', projectPath: '/p' },
      { groupId: 'a', artifactId: 'winthor-integracao-matcon-service', version: '1.39.23.45', projectPath: '/p' }
    ];
    const ranked = rankPomDependencies(deps, bundle('549', 'WinThor :: Integracao Matcon :: Service', '0.0.1.SNAPSHOT'));
    expect(ranked[0].artifactId).toBe('winthor-integracao-matcon-service');
  });
});
