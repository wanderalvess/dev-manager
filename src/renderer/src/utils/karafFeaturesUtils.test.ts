import { describe, expect, it } from 'vitest';
import { parseFeatureRepoListOutput, filterFeatureRepos, filterFeatures } from './karafFeaturesUtils';
import type { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../shared/types';

describe('karafFeaturesUtils', () => {
  describe('parseFeatureRepoListOutput', () => {
    it('analisa saída formatada com pipes do feature:repo-list', () => {
      const sample = `
Repository                     | URL
-------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------
standard-4.2.16                | mvn:org.apache.karaf.features/standard/4.2.16/xml/features
spring-4.2.16                  | mvn:org.apache.karaf.features/spring/4.2.16/xml/features
winthor-faturamento-features   | mvn:br.com.totvs.winthor/faturamento-service/1.5.0-SNAPSHOT/xml/features
`;
      const repos = parseFeatureRepoListOutput(sample);
      expect(repos.length).toBe(3);

      expect(repos[0].name).toBe('standard-4.2.16');
      expect(repos[0].url).toBe('mvn:org.apache.karaf.features/standard/4.2.16/xml/features');
      expect(repos[0].isWinthor).toBe(false);

      expect(repos[2].name).toBe('winthor-faturamento-features');
      expect(repos[2].isWinthor).toBe(true);
    });

    it('retorna array vazio para saída vazia', () => {
      expect(parseFeatureRepoListOutput('')).toEqual([]);
    });
  });

  describe('filterFeatureRepos', () => {
    const mockRepos: KarafFeatureRepoInfo[] = [
      { name: 'standard-4.2.16', url: 'mvn:org.apache.karaf.features/standard/4.2.16/xml/features', isWinthor: false },
      { name: 'spring-4.2.16', url: 'mvn:org.apache.karaf.features/spring/4.2.16/xml/features', isWinthor: false },
      { name: 'winthor-varejo', url: 'mvn:br.com.totvs.winthor/varejo/1.0.0/xml/features', isWinthor: true }
    ];

    it('filtra por escopo WinThor', () => {
      const result = filterFeatureRepos(mockRepos, '', 'WINTHOR');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('winthor-varejo');
    });

    it('filtra por texto de busca', () => {
      const result = filterFeatureRepos(mockRepos, 'spring', 'ALL');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('spring-4.2.16');
    });
  });

  describe('filterFeatures', () => {
    const mockFeatures: KarafFeatureInfo[] = [
      { name: 'standard', version: '4.2.16', state: 'Started', repository: 'standard-4.2.16', isWinthor: false },
      { name: 'ssh', version: '4.2.16', state: 'Uninstalled', repository: 'standard-4.2.16', isWinthor: false },
      { name: 'winthor-pedido', version: '2.0.0', state: 'Started', repository: 'winthor-repo', isWinthor: true }
    ];

    it('filtra por status INSTALLED e AVAILABLE', () => {
      const installed = filterFeatures(mockFeatures, '', 'ALL', 'INSTALLED');
      expect(installed.length).toBe(2);

      const available = filterFeatures(mockFeatures, '', 'ALL', 'AVAILABLE');
      expect(available.length).toBe(1);
      expect(available[0].name).toBe('ssh');
    });

    it('filtra por escopo WinThor', () => {
      const winthor = filterFeatures(mockFeatures, '', 'WINTHOR', 'ALL');
      expect(winthor.length).toBe(1);
      expect(winthor[0].name).toBe('winthor-pedido');
    });
  });
});
