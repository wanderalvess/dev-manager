import { describe, expect, it } from 'vitest';
import { parseFeatureRepoListOutput } from './karafFeaturesUtils';

describe('karafFeaturesUtils', () => {
  describe('parseFeatureRepoListOutput', () => {
    it('retorna array vazio para saída vazia ou nula', () => {
      expect(parseFeatureRepoListOutput('')).toEqual([]);
      expect(parseFeatureRepoListOutput(undefined as any)).toEqual([]);
    });

    it('faz parse de saída delimitada por pipes (|) com cabeçalhos e separadores', () => {
      const stdout = `
Repository | URI
------------------------------------------------------------------------------------------------------------------------
standard-4.2.16 | mvn:org.apache.karaf.features/standard/4.2.16/xml/features
pax-web-7.3.23 | mvn:org.ops4j.pax.web/pax-web-features/7.3.23/xml/features
winthor-integracao | mvn:br.com.totvs.winthor/winthor-features/1.39.0/xml/features
`;
      const result = parseFeatureRepoListOutput(stdout);
      expect(result).toHaveLength(3);

      expect(result[0]).toEqual({
        name: 'standard-4.2.16',
        url: 'mvn:org.apache.karaf.features/standard/4.2.16/xml/features',
        isWinthor: false
      });

      expect(result[1]).toEqual({
        name: 'pax-web-7.3.23',
        url: 'mvn:org.ops4j.pax.web/pax-web-features/7.3.23/xml/features',
        isWinthor: false
      });

      expect(result[2]).toEqual({
        name: 'winthor-integracao',
        url: 'mvn:br.com.totvs.winthor/winthor-features/1.39.0/xml/features',
        isWinthor: true
      });
    });

    it('suporta separador de tabela unicode (│) e cabeçalhos com separadores ───', () => {
      const stdout = `
Repository │ URI
───────────┼─────────────────────────────────────────────────────────────
karaf-enterprise │ mvn:org.apache.karaf.features/enterprise/4.2.16/xml/features
totvs-wms-repo   │ mvn:com.totvs.varejo/wms-features/2.0.0/xml/features
`;
      const result = parseFeatureRepoListOutput(stdout);
      expect(result).toHaveLength(2);
      expect(result[0].isWinthor).toBe(false);
      expect(result[1].isWinthor).toBe(true);
      expect(result[1].name).toBe('totvs-wms-repo');
    });

    it('faz parse de saída formatada por múltiplos espaços (sem pipes)', () => {
      const stdout = `
Repository   URI
standard     mvn:org.apache.karaf.features/standard/4.2.16/xml/features
custom_repo  file:/opt/karaf/deploy/custom-features.xml
winthor_repo http://nexus.totvs.corp/content/repositories/winthor-features.xml
`;
      const result = parseFeatureRepoListOutput(stdout);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('standard');
      expect(result[1].url).toBe('file:/opt/karaf/deploy/custom-features.xml');
      expect(result[2].name).toBe('winthor_repo');
      expect(result[2].isWinthor).toBe(true);
    });

    it('ignora linhas vazias e decorativas sem falhar', () => {
      const stdout = `
=== Features Repositories ===
-----------------------------
`;
      expect(parseFeatureRepoListOutput(stdout)).toEqual([]);
    });
  });
});
