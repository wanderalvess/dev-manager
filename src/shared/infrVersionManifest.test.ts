import { describe, expect, it } from 'vitest';
import type { Routine801CatalogResponse } from './types';
import {
  checkManifestAgainstWsh,
  compareManifests,
  compareVersions,
  parseVersionManifest,
  parseWshDependencies,
  serializeVersionManifest,
  upgradeManifestFromCatalog,
  winthorLineOf
} from './infrVersionManifest';

const ORIGIN = `# WinThor 39 — features da versão
repo mvn:br.com.pcsist.winthor.core/winthor-core-features/1.39.0.1/xml/features
repo mvn:br.com.totvs.integracao/winthor-integracao-config-service/1.39.20.3/xml/features

feature winthor-core-data 1.39.0.1
feature winthor-integracao-config 1.39.20.3
feature winthor-cliente 0.39.0.2
feature winthor-ferramenta-acesso 1.9.15
# feature winthor-integracao-matcon 0.0.1.SNAPSHOT  (fora)
`;

const feature = (nome: string, versao: string, status = 'LIBERADO', featureMavenUrl?: string) => ({
  nome,
  versao,
  codigoRotina: 0,
  codigoModulo: 0,
  tipoProjeto: 'SERVICO',
  descricao: nome,
  status,
  featureMavenUrl
});

const CATALOG: Routine801CatalogResponse = {
  repositorios: [
    { comando: 'INSTALL', repositorio: { groupId: 'g', artifactId: 'winthor-core-features', version: '1.40.0.3', featureMavenUrl: 'mvn:g/winthor-core-features/1.40.0.3/xml/features' } }
  ],
  funcionalidades: [
    feature('winthor-core-data', '1.40.0.3'),
    feature('winthor-integracao-config', '1.41.2.0'),
    feature('winthor-cliente', '0.40.1.0', 'BLOQUEADO'),
    feature('winthor-ferramenta-acesso', '1.9.20', 'LIBERADO', 'mvn:g/ferramenta-acesso-features/1.9.20/xml/features')
  ]
};

describe('manifesto de versão do INFR-Docker', () => {
  it('lê e regrava repositórios, features e as linhas tiradas de propósito', () => {
    const m = parseVersionManifest(ORIGIN);
    expect(m.repos).toHaveLength(2);
    expect(m.features).toContainEqual({ name: 'winthor-cliente', version: '0.39.0.2' });
    expect(m.disabled).toEqual(['# feature winthor-integracao-matcon 0.0.1.SNAPSHOT  (fora)']);
    const text = serializeVersionManifest(m, ['WinThor 40 — gerado do master (39)']);
    expect(text.startsWith('# WinThor 40')).toBe(true);
    expect(parseVersionManifest(text)).toEqual(m);
  });

  it('compara versões por número e acha a linha do WinThor no segundo número', () => {
    expect(compareVersions('1.39.20.3', '1.39.5.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.2.RC_1', '1.0.2')).toBe(0);
    expect(winthorLineOf('1.39.0.1')).toBe(39);
    expect(winthorLineOf('0.40.1.0')).toBe(40);
    expect(winthorLineOf('1.9.15')).toBeUndefined();
    expect(winthorLineOf('2.1.0')).toBeUndefined();
  });

  it('sobe pelo catálogo até a linha alvo, sem 41 e sem item bloqueado, e aponta o que ficou para trás', () => {
    const up = upgradeManifestFromCatalog(parseVersionManifest(ORIGIN), CATALOG, 40);
    expect(up.changes).toEqual([
      { name: 'winthor-core-data', from: '1.39.0.1', to: '1.40.0.3' },
      { name: 'winthor-ferramenta-acesso', from: '1.9.15', to: '1.9.20' }
    ]);
    expect(up.skipped.map((s) => [s.name, s.reason])).toEqual([
      ['winthor-integracao-config', 'linha 41, acima da 40'],
      ['winthor-cliente', 'status BLOQUEADO na rotina 801']
    ]);
    expect(up.manifest.repos).toContain('mvn:g/winthor-core-features/1.40.0.3/xml/features');
    expect(up.manifest.repos).toContain('mvn:g/ferramenta-acesso-features/1.9.20/xml/features');
    expect(up.behind.map((f) => f.name)).toEqual(['winthor-integracao-config', 'winthor-cliente']);
  });

  it('confere a lista contra o que o WSH da versão exige do WTA', () => {
    const deps = parseWshDependencies(
      JSON.stringify([
        { winthorVersion: '40.00', service: 'winthor-integracao-config', version: '1.40.2.1', option: 0, type: 'DATABASE' },
        { service: 'winthor-core-data', version: '1.40.0.1' },
        { service: 'winthor-nao-instalado', version: '1.0.0' },
        { sem: 'campos' }
      ])
    );
    expect(deps).toHaveLength(3);
    const up = upgradeManifestFromCatalog(parseVersionManifest(ORIGIN), CATALOG, 40);
    expect(checkManifestAgainstWsh(up.manifest, deps).map((c) => [c.service, c.found, c.ok])).toEqual([
      ['winthor-integracao-config', '1.39.20.3', false],
      ['winthor-core-data', '1.40.0.3', true],
      ['winthor-nao-instalado', undefined, false]
    ]);
  });

  it('compara a prévia com o manifesto existente: acima, abaixo e o que só um dos dois tem', () => {
    const existing = parseVersionManifest('feature a 1.39.0.5\nfeature b 1.39.2.0\nfeature c 1.39.0.1\nfeature so-existente 1.39.0.1\n');
    const preview = parseVersionManifest('feature a 1.39.1.0\nfeature b 1.38.9.9\nfeature c 1.39.0.1\nfeature so-previa 1.38.0.1\n');
    expect(compareManifests(existing, preview)).toEqual({ newer: 1, older: 1, onlyExisting: 1, onlyPreview: 1 });
  });
});
