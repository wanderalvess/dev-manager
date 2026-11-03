import { describe, expect, it } from 'vitest';
import { buildArtifactProbeScript, featuresWithoutRepo, maskUrlCredentials, mvnFeaturePath, newRepoProbes, parseArtifactProbeOutput, parsePaxRepositories } from './infrFeatureArtifacts';
import type { VersionManifest } from './infrVersionManifest';

const manifest = (...repos: string[]): VersionManifest => ({ repos, features: [], disabled: [] });
const A = 'mvn:br.com.totvs.integracao/winthor-x/1.40.1.0/xml/features';
const B = 'mvn:g/winthor-y/1.40.2.0/xml/features';

describe('mvnFeaturePath', () => {
  it('traduz o mvn: para o caminho do Maven', () => {
    expect(mvnFeaturePath(A)).toBe('br/com/totvs/integracao/winthor-x/1.40.1.0/winthor-x-1.40.1.0-features.xml');
  });
  it('recusa o que não é um repo de features', () => {
    expect(mvnFeaturePath('mvn:g/a/1.0')).toBeNull();
    expect(mvnFeaturePath("mvn:g/a/1.0/xml'; rm -rf /")).toBeNull();
  });
});

describe('parsePaxRepositories', () => {
  it('lê os repositórios com continuação de linha, sem opções nem repositório local', () => {
    const cfg = [
      '# comentário',
      'org.ops4j.pax.url.mvn.repositories= \\',
      '    https://nexus.exemplo.com/repository/releases@id=rel, \\',
      '    https://nexus.exemplo.com/repository/snap/@snapshots@id=snap, \\',
      '    file:/opt/x/system@id=local',
      'org.ops4j.pax.url.mvn.defaultRepositories=file:/opt/y'
    ].join('\n');
    expect(parsePaxRepositories(cfg)).toEqual(['https://nexus.exemplo.com/repository/releases', 'https://nexus.exemplo.com/repository/snap']);
  });
  it('a URL com usuário:senha@ (o Nexus da PC) fica inteira, e a máscara esconde as credenciais', () => {
    const cfg = 'org.ops4j.pax.url.mvn.repositories=http://u:p@repo.exemplo.com:8081/nexus/content/groups/x/@id=x, http://repo1.maven.org/maven2@id=central';
    const repos = parsePaxRepositories(cfg);
    expect(repos).toEqual(['http://u:p@repo.exemplo.com:8081/nexus/content/groups/x', 'http://repo1.maven.org/maven2']);
    expect(maskUrlCredentials(repos[0])).toBe('http://***@repo.exemplo.com:8081/nexus/content/groups/x');
    expect(maskUrlCredentials(repos[1])).toBe(repos[1]);
  });

  it('sem a chave, não há repositórios', () => {
    expect(parsePaxRepositories('foo=bar')).toEqual([]);
  });
});

describe('newRepoProbes', () => {
  it('só testa os repositórios que a lista nova acrescentou', () => {
    expect(newRepoProbes(manifest(A, B), manifest(A)).map((p) => p.mvn)).toEqual([B]);
    expect(newRepoProbes(manifest(A), manifest(A))).toEqual([]);
  });
});

describe('script e resultado', () => {
  const probes = newRepoProbes(manifest(A, B), manifest());
  it('o script cita cada caminho e cada repositório, e ignora endereço estranho', () => {
    const s = buildArtifactProbeScript(['https://n.com/r', "https://x'; reboot"], probes);
    expect(s).toContain("'https://n.com/r'");
    expect(s).toContain('winthor-y-1.40.2.0-features.xml');
    expect(s).not.toContain('reboot');
  });
  it('classifica: 200 existe, 404 falta, o resto não deu para saber', () => {
    const out = `200 ${probes[0].path}\n404 ${probes[1].path}\n`;
    expect(parseArtifactProbeOutput(out, probes, ['https://n.com/r'])).toMatchObject({ checked: 2, missing: [B], unverified: 0 });
    expect(parseArtifactProbeOutput(`401 ${probes[0].path}\n200 ${probes[1].path}`, probes, [])).toMatchObject({ missing: [], unverified: 1 });
    expect(parseArtifactProbeOutput('', probes, [])).toMatchObject({ missing: [], unverified: 2 });
  });
  it('sem curl no container, nada foi conferido e diz por quê', () => {
    expect(parseArtifactProbeOutput('NOCURL\n', probes, [])).toMatchObject({ unverified: 2, error: 'o container não tem curl' });
  });
});

describe('featuresWithoutRepo', () => {
  const feat = (nome: string, versao: string, featureMavenUrl?: string) => ({ nome, versao, featureMavenUrl }) as never;
  it('aponta a feature trocada cujo repositório não entrou na lista', () => {
    const catalog = { repositorios: [], funcionalidades: [feat('a', '1.40.1.0', A), feat('b', '1.40.2.0')] };
    expect(featuresWithoutRepo(manifest(A), catalog, [{ name: 'a', from: '1', to: '1.40.1.0' }, { name: 'b', from: '1', to: '1.40.2.0' }])).toEqual(['b 1.40.2.0']);
  });

  it('repositório de outra versão na lista não conta como o da feature', () => {
    const catalog = { repositorios: [], funcionalidades: [feat('c', '1.40.3.0', A)] };
    expect(featuresWithoutRepo(manifest(A), catalog, [{ name: 'c', from: '1', to: '1.40.3.0' }])).toEqual(['c 1.40.3.0']);
  });
});
