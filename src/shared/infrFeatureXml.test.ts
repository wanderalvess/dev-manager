import { describe, expect, it } from 'vitest';
import {
  MAX_XML_REPOS,
  absentForManifest,
  buildKarafCfgScript,
  featuresAbsentFromXml,
  parseKarafCfgOutput,
  parseKarafFeaturesCfg,
  parseRepositoryRefs,
  reachableXmlPaths,
  repairAbsentFeatures,
  buildFeatureXmlFetchScript,
  checkManifestWithFeatureXml,
  featureXmlPaths,
  parseFeatureXmlFetchOutput,
  parseFeaturesXml,
  withXmlDependencies,
  type XmlDependencyReport
} from './infrFeatureXml';
import type { VersionManifest } from './infrVersionManifest';

// Trechos reais dos features.xml do Nexus do WinThor (core 1.39.0.1 e fornecedor 0.38.0.0)
const CORE = `<?xml version="1.0" encoding="UTF-8"?>
<features name="winthor-core-features-1.39.0.1" xmlns="http://karaf.apache.org/xmlns/features/v1.3.0">
  <!-- <feature name="comentada" version="9.9.9"><feature>x</feature></feature> -->
  <repository>mvn:com.totvs.pcsist.winthor/core-features/0.38.0.2/xml/features</repository>
  <feature name="winthor-core-data" description="WinThor Core Data" version="1.39.0.1"
           start-level="40">
    <feature version="0.38.0.2">winthor-base</feature>
    <bundle start-level="35" dependency="true">mvn:com.h2database/h2/1.4.197</bundle>
  </feature>
  <feature name="winthor-core-servico" description="WinThor Core Servico" start-level="60"
           version="1.39.0.1">
    <feature>winthor-autenticacao</feature>
    <feature>winthor-core-data</feature>
    <bundle start-level="65">mvn:br.com.pcsist.winthor.core/winthor-core-servico/1.39.0.1</bundle>
  </feature>
</features>`;
const FORNECEDOR = `<features name="winthor-fornecedor-features-0.38.0.0" xmlns="http://karaf.apache.org/xmlns/features/v1.3.0">
  <feature name="winthor-fornecedor" description="fornecedor" start-level="70" version="0.38.0.0">
    <feature dependency="true" version="[1.8,2)">winthor-core-data</feature>
    <feature dependency="true" version="[1.8,2)">winthor-core-servico</feature>
    <bundle start-level="70">mvn:br.com.pcsist.winthor.compra/winthor-fornecedor-domain/0.38.0.0</bundle>
  </feature>
</features>`;

const manifest = (features: [string, string][], repos: string[] = []): VersionManifest => ({ repos, features: features.map(([name, version]) => ({ name, version })), disabled: [] });

describe('feature que nenhum repositório da lista tem', () => {
  const lista: VersionManifest = {
    repos: ['mvn:g/winthor-integracao-2650-features/1.40.0.2/xml/features', 'mvn:g/winthor-core-features/1.40.0.3/xml/features'],
    features: [
      { name: 'winthor-integracao-2650', version: '1.40.1.2' },
      { name: 'winthor-core-data', version: '1.40.0.3' },
      { name: 'winthor-sumida', version: '1.0.0' }
    ],
    disabled: []
  };
  const xml = (name: string, version: string) => ({ name, version, dependencies: [] });

  it('aponta a versão que falta e as que os repositórios têm (a mais nova primeiro)', () => {
    const absent = featuresAbsentFromXml(lista, [xml('winthor-integracao-2650', '1.40.0.1'), xml('winthor-integracao-2650', '1.40.0.2'), xml('winthor-core-data', '1.40.0.3')]);
    expect(absent).toEqual([
      { name: 'winthor-integracao-2650', version: '1.40.1.2', available: ['1.40.0.2', '1.40.0.1'] },
      { name: 'winthor-sumida', version: '1.0.0', available: [] }
    ]);
    const r = repairAbsentFeatures(lista, absent);
    expect(r.repairs.map((c) => [c.name, c.from, c.to])).toEqual([['winthor-integracao-2650', '1.40.1.2', '1.40.0.2']]);
    expect(r.kept).toEqual([{ name: 'winthor-sumida', version: '1.0.0' }]);
    expect(r.added).toEqual([]);
    expect(r.manifest.features[0]).toEqual({ name: 'winthor-integracao-2650', version: '1.40.0.2' });
    expect(r.manifest.features[2]).toEqual({ name: 'winthor-sumida', version: '1.0.0' });
  });

  it('a 801 vem primeiro: o repositório dela entra na lista e a versão pedida fica; sem ela, nada some da lista', () => {
    const absent = [
      { name: 'winthor-integracao-2650', version: '1.40.1.2', available: ['1.40.0.2'] },
      { name: 'winthor-sumida', version: '1.0.0', available: [] }
    ];
    const catalog = {
      repositorios: [],
      funcionalidades: [
        { nome: 'winthor-integracao-2650', versao: '1.40.1.2', codigoRotina: 0, codigoModulo: 0, tipoProjeto: 'SERVICO', descricao: '', status: 'LIBERADO', featureMavenUrl: 'mvn:g/winthor-integracao-2650-features/1.40.1.2/xml/features' }
      ]
    } as any;
    const r = repairAbsentFeatures(lista, absent, catalog);
    expect(r.added).toEqual([{ name: 'winthor-integracao-2650', version: '1.40.1.2', repo: 'mvn:g/winthor-integracao-2650-features/1.40.1.2/xml/features' }]);
    expect(r.repairs).toEqual([]);
    expect(r.kept.map((k) => k.name)).toEqual(['winthor-sumida']);
    expect(r.manifest.repos.at(-1)).toBe('mvn:g/winthor-integracao-2650-features/1.40.1.2/xml/features');
    expect(r.manifest.features).toEqual(lista.features);
  });

  it('só confere com todos os XML da lista; os de outra lista não contam', () => {
    const p1 = 'g/winthor-integracao-2650-features/1.40.0.2/winthor-integracao-2650-features-1.40.0.2-features.xml';
    const p2 = 'g/winthor-core-features/1.40.0.3/winthor-core-features-1.40.0.3-features.xml';
    const outra = 'g/outra/1.0/outra-1.0-features.xml';
    expect(absentForManifest(lista, new Map([[p1, '<features/>']]))).toBeUndefined();
    const files = new Map([
      [p1, '<features><feature name="winthor-integracao-2650" version="1.40.0.2"/></features>'],
      [p2, '<features><feature name="winthor-core-data" version="1.40.0.3"/></features>'],
      [outra, '<features><feature name="winthor-sumida" version="1.0.0"/></features>']
    ]);
    expect(absentForManifest(lista, files)?.map((a) => a.name)).toEqual(['winthor-integracao-2650', 'winthor-sumida']);
  });
});

describe('repositórios que o Karaf já traz e os puxados pelos XML', () => {
  const SPRING = 'org/apache/karaf/features/spring/4.2.9/spring-4.2.9-features.xml';
  const STANDARD = 'org/apache/karaf/features/standard/4.2.9/standard-4.2.9-features.xml';
  const LEGACY = 'org/apache/karaf/features/spring-legacy/4.2.9/spring-legacy-4.2.9-features.xml';
  // Cfg real de um Karaf 4.2: valor em várias linhas com barra invertida no fim
  const CFG = [
    '# Comma separated list of features repositories to register by default',
    'featuresRepositories = \\',
    '    mvn:org.apache.karaf.features/enterprise/4.2.9/xml/features, \\',
    '    mvn:org.apache.karaf.features/spring/4.2.9/xml/features, \\',
    '    mvn:org.apache.karaf.features/standard/${karaf.version}/xml/features',
    '',
    'featuresBoot = instance, package'
  ].join('\n');

  it('lê o featuresRepositories do Karaf, em várias linhas, sem as entradas com variável', () => {
    expect(parseKarafFeaturesCfg(CFG)).toEqual(['mvn:org.apache.karaf.features/enterprise/4.2.9/xml/features', 'mvn:org.apache.karaf.features/spring/4.2.9/xml/features']);
    expect(parseKarafFeaturesCfg('featuresBoot = x')).toEqual([]);
    expect(parseKarafCfgOutput(`lixo\n@@KARAFCFG\n${CFG}\n@@KARAFCFG_END\n@@FILE a`)).toEqual([
      'org/apache/karaf/features/enterprise/4.2.9/enterprise-4.2.9-features.xml',
      SPRING
    ]);
    expect(parseKarafCfgOutput('@@KARAFCFG\n\n@@KARAFCFG_END')).toEqual([]);
    expect(buildKarafCfgScript()).toContain("'/opt/pcsist/produtos/winthor/etc/org.apache.karaf.features.cfg'");
  });

  it('segue os <repository> em cadeia e devolve os que faltam baixar', () => {
    expect(parseRepositoryRefs(CORE)).toEqual(['mvn:com.totvs.pcsist.winthor/core-features/0.38.0.2/xml/features']);
    const files = new Map([
      [STANDARD, `<features><repository>mvn:org.apache.karaf.features/spring/4.2.9/xml/features</repository></features>`],
      [SPRING, `<features><!-- <repository>mvn:x/comentado/1/xml/features</repository> --><repository>mvn:org.apache.karaf.features/spring-legacy/4.2.9/xml/features</repository></features>`]
    ]);
    expect(reachableXmlPaths([STANDARD], files)).toEqual({ paths: [STANDARD, SPRING], pending: [LEGACY] });
  });

  it('feature do Karaf (spring) não conta como sem repositório; a que nenhum tem continua ausente', () => {
    const lista = manifest(
      [
        ['winthor-core-data', '1.40.0.3'],
        ['spring', '4.2.9.RELEASE_1'],
        ['spring-jdbc', '4.2.9.RELEASE_1'],
        ['winthor-sumida', '1.0.0']
      ],
      ['mvn:g/winthor-core-features/1.40.0.3/xml/features']
    );
    const own = 'g/winthor-core-features/1.40.0.3/winthor-core-features-1.40.0.3-features.xml';
    const files = new Map([
      [own, '<features><feature name="winthor-core-data" version="1.40.0.3"/></features>'],
      [SPRING, '<features><feature name="spring" version="4.2.9.RELEASE_1"/><repository>mvn:org.apache.karaf.features/spring-legacy/4.2.9/xml/features</repository></features>'],
      [LEGACY, '<features><feature name="spring-jdbc" version="4.2.9.RELEASE_1"/></features>']
    ]);
    expect(absentForManifest(lista, files)?.map((a) => a.name)).toEqual(['spring', 'spring-jdbc', 'winthor-sumida']);
    expect(absentForManifest(lista, files, [SPRING])?.map((a) => a.name)).toEqual(['winthor-sumida']);
  });

  it('o roteiro lê primeiro do system/ do Karaf, só com caminho seguro', () => {
    const script = buildFeatureXmlFetchScript(['https://nexus/repo'], ['g/a/1/a-1-features.xml'], '/opt/pcsist/produtos/winthor/system');
    expect(script).toContain("LOCAL='/opt/pcsist/produtos/winthor/system'");
    expect(script).toContain('[ -f "$LOCAL/$p" ]');
    expect(buildFeatureXmlFetchScript(['https://nexus/repo'], [], "/x'; rm -rf /")).toContain("LOCAL=''");
  });
});

describe('parseFeaturesXml', () => {
  it('lê as features e as dependências (com e sem faixa), ignorando comentário, bundle e <repository>', () => {
    expect(parseFeaturesXml(CORE)).toEqual([
      { name: 'winthor-core-data', version: '1.39.0.1', dependencies: [{ name: 'winthor-base', range: '0.38.0.2' }] },
      { name: 'winthor-core-servico', version: '1.39.0.1', dependencies: [{ name: 'winthor-autenticacao' }, { name: 'winthor-core-data' }] }
    ]);
    expect(parseFeaturesXml(FORNECEDOR)[0].dependencies).toEqual([
      { name: 'winthor-core-data', range: '[1.8,2)' },
      { name: 'winthor-core-servico', range: '[1.8,2)' }
    ]);
  });

  it('aceita aspas simples, feature sem versão (0.0.0), feature fechada na própria tag e XML vazio ou quebrado', () => {
    const xml = `<features><feature name='a' version='1.0'><feature version='[1,2)'>b</feature></feature><feature name="c"/><feature name="d"></feature></features>`;
    expect(parseFeaturesXml(xml)).toEqual([
      { name: 'a', version: '1.0', dependencies: [{ name: 'b', range: '[1,2)' }] },
      { name: 'c', version: '0.0.0', dependencies: [] },
      { name: 'd', version: '0.0.0', dependencies: [] }
    ]);
    expect(parseFeaturesXml('')).toEqual([]);
    expect(parseFeaturesXml('<html>404 Not Found</html>')).toEqual([]);
    expect(parseFeaturesXml('<features><feature name="a" version="1"><feature>b')).toEqual([]);
  });

  it('descarta nome de dependência com caractere estranho', () => {
    expect(parseFeaturesXml('<features><feature name="a" version="1"><feature>b; rm -rf /</feature></feature></features>')[0].dependencies).toEqual([]);
  });
});

describe('coleta dos features.xml', () => {
  it('traduz os repositórios da lista em caminhos do Maven e limita a quantidade', () => {
    const m = manifest([], ['mvn:br.com.pcsist.winthor.core/winthor-core-features/1.39.0.1/xml/features', 'mvn:fora/do/padrao', ...Array.from({ length: 200 }, (_, i) => `mvn:g/a${i}/1.0/xml/features`)]);
    const paths = featureXmlPaths(m);
    expect(paths[0]).toEqual({
      mvn: 'mvn:br.com.pcsist.winthor.core/winthor-core-features/1.39.0.1/xml/features',
      path: 'br/com/pcsist/winthor/core/winthor-core-features/1.39.0.1/winthor-core-features-1.39.0.1-features.xml'
    });
    expect(paths).toHaveLength(MAX_XML_REPOS);
    expect(featureXmlPaths(m, true)).toHaveLength(201);
  });

  it('o roteiro só leva repositório http seguro e caminho seguro, em paralelo de 8 em 8', () => {
    const script = buildFeatureXmlFetchScript(["https://u:p@nexus.exemplo.com/repo", "http://x/'; rm -rf /; '", 'file:///etc'], ['g/a/1/a-1-features.xml', "g/a/1'; rm -rf /; '"]);
    expect(script).toContain("REPOS='https://u:p@nexus.exemplo.com/repo'");
    expect(script).not.toContain('rm -rf /;');
    expect(script).not.toContain("1'; rm");
    expect(script).not.toContain('file://');
    expect(script).not.toContain('"\'');
    expect(script).toContain("'g/a/1/a-1-features.xml'");
    expect(script).toContain('% 8');
    expect(script).toContain('head -c 120000');
  });

  it('lê os arquivos e os ausentes da saída, e o container sem curl', () => {
    const out = ['@@FILE g/a/1/a-1-features.xml', '<features>', '  <feature name="a" version="1"/>', '</features>', '', '@@END', '@@MISS g/b/2/b-2-features.xml', '@@FILE g/c/3/c-3-features.xml', '<x/>', '', '@@END'].join('\n');
    const r = parseFeatureXmlFetchOutput(out);
    expect([...r.files.keys()]).toEqual(['g/a/1/a-1-features.xml', 'g/c/3/c-3-features.xml']);
    expect(parseFeaturesXml(r.files.get('g/a/1/a-1-features.xml')!)).toHaveLength(1);
    expect(r.missing).toEqual(['g/b/2/b-2-features.xml']);
    expect(parseFeatureXmlFetchOutput('NOCURL\n').noCurl).toBe(true);
  });
});

describe('checkManifestWithFeatureXml', () => {
  const xml = [...parseFeaturesXml(CORE), ...parseFeaturesXml(FORNECEDOR)];

  it('uma lista coerente não tem conflito (59 repositórios reais do manifesto 39 deram 0)', () => {
    const r = checkManifestWithFeatureXml(manifest([['winthor-core-data', '1.39.0.1'], ['winthor-core-servico', '1.39.0.1'], ['winthor-fornecedor', '0.38.0.0']]), xml);
    expect(r).toEqual({ checked: 3, withDependencies: 3, issues: [] });
  });

  it('acusa feature que exige outra numa faixa e a lista tem fora dela', () => {
    const r = checkManifestWithFeatureXml(manifest([['winthor-core-data', '2.0.0.1'], ['winthor-core-servico', '1.39.0.1'], ['winthor-fornecedor', '0.38.0.0']]), xml);
    expect(r.issues).toEqual([{ feature: 'winthor-fornecedor', version: '0.38.0.0', dependency: 'winthor-core-data', required: '[1.8,2)', found: '2.0.0.1', kind: 'conflict', source: 'xml' }]);
  });

  it('versão mínima simples (sem faixa) também vale, e dependência fora da lista ou sem faixa não é acusada', () => {
    const base = manifest([['winthor-base', '0.37.0.1'], ['winthor-core-data', '1.39.0.1']]);
    expect(checkManifestWithFeatureXml(base, xml).issues).toEqual([
      { feature: 'winthor-core-data', version: '1.39.0.1', dependency: 'winthor-base', required: '0.38.0.2', found: '0.37.0.1', kind: 'conflict', source: 'xml' }
    ]);
    expect(checkManifestWithFeatureXml(manifest([['winthor-core-servico', '1.39.0.1']]), xml).issues).toEqual([]);
  });

  it('feature da lista que não está nos XML baixados fica de fora da contagem', () => {
    expect(checkManifestWithFeatureXml(manifest([['winthor-outra', '1.0']]), xml)).toEqual({ checked: 0, withDependencies: 0, issues: [] });
  });
});

describe('withXmlDependencies', () => {
  const xmlReport: XmlDependencyReport = {
    repos: 59,
    fetched: 58,
    missing: 1,
    checked: 60,
    withDependencies: 11,
    issues: [{ feature: 'f', version: '1', dependency: 'd', required: '[1,2)', found: '3', kind: 'conflict', source: 'xml' }]
  };

  it('soma as features com dependências, junta os conflitos sem repetir e guarda o resumo dos XML', () => {
    const dep = { checked: 7, withDependencies: 0, issues: [{ feature: 'f', version: '1', dependency: 'd', required: '[1,2)', found: '3', kind: 'conflict' as const }], fixed: 0 };
    const r = withXmlDependencies(dep, xmlReport);
    expect(r.withDependencies).toBe(11);
    expect(r.issues).toHaveLength(1);
    expect(r.xml).toEqual({ repos: 59, fetched: 58, missing: 1, checked: 60, withDependencies: 11 });
    expect(withXmlDependencies({ ...dep, issues: [] }, xmlReport).issues).toHaveLength(1);
  });

  it('guarda o motivo quando não deu para baixar', () => {
    const r = withXmlDependencies({ checked: 0, withDependencies: 0, issues: [], fixed: 0 }, { repos: 3, fetched: 0, missing: 0, checked: 0, withDependencies: 0, issues: [], error: 'o container não tem curl' });
    expect(r.xml?.error).toBe('o container não tem curl');
  });
});
