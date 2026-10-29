import { describe, expect, it } from 'vitest';
import { isNoDeploymentChange, parseBundleLocations, parseMvnLocation, pickProjectBundles } from './karafRedeployUtils';

const LIST = `START LEVEL 100 , List Threshold: 0
 ID │ State    │ Lvl │ Version     │ Location
────┼──────────┼─────┼─────────────┼──────────────────────────────────────────────────────────────
 10 │ Active   │  80 │ 4.1.5       │ mvn:org.apache.karaf.features/org.apache.karaf.features.core/4.1.5
837 │ Active   │  80 │ 0.39.10.99  │ mvn:br.com.pcsist.winthor.tributacao/winthor-tributacao/0.39.10.99
838 │ Resolved │  80 │ 0.39.10.99  │ mvn:br.com.pcsist.winthor.tributacao.domain/winthor-tributacao-domain/0.39.10.99
839 │ Active   │  80 │ 0.39.10.98  │ mvn:br.com.pcsist.winthor.tributacao/winthor-tributacao-api/0.39.10.98
900 │ Active   │  80 │ 0.39.10.99  │ mvn:br.com.pcsist.winthor.tributacaoextra/outro/0.39.10.99
901 │ Active   │  80 │ 1.0.0       │ file:/C:/dev/x.jar`;

describe('reinstalação de uma versão que o Karaf já tem', () => {
  it('reconhece o feature:install que não mudou nada', () => {
    expect(isNoDeploymentChange("The specified feature: 'winthor-tributacao' version '0.39.10.99' is already installed")).toBe(true);
    expect(isNoDeploymentChange('Adding features: x\nNo deployment change.\nDone.')).toBe(true);
    expect(isNoDeploymentChange('Installing bundles:\n  mvn:a/b/1\nDone.')).toBe(false);
  });

  it('lê id e localização do bundle:list -l', () => {
    const rows = parseBundleLocations(LIST);
    expect(rows).toHaveLength(6);
    expect(rows[1]).toEqual({ id: '837', location: 'mvn:br.com.pcsist.winthor.tributacao/winthor-tributacao/0.39.10.99' });
    expect(parseMvnLocation('file:/C:/dev/x.jar')).toBeNull();
  });

  it('escolhe só os bundles do projeto: mesmo grupo (ou abaixo dele) e mesma versão', () => {
    const picked = pickProjectBundles(parseBundleLocations(LIST), { groupId: 'br.com.pcsist.winthor.tributacao', version: '0.39.10.99' });
    expect(picked.map((row) => row.id)).toEqual(['837', '838']);
    expect(pickProjectBundles(parseBundleLocations(LIST), { groupId: '', version: '0.39.10.99' })).toEqual([]);
  });
});
