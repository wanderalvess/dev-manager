import { describe, expect, it } from 'vitest';
import {
  checkManifestDependencies,
  mergeDependencyFixes,
  parseVersionSpec,
  resolveDependencies,
  satisfiesSpec
} from './infrFeatureDependencies';
import type { VersionManifest } from './infrVersionManifest';
import type { Routine801CatalogResponse } from './types';

type Dep = { featureName: string; version?: string };
const entry = (nome: string, versao: string, deps: Dep[] = [], status = 'LIBERADO', featureMavenUrl?: string) =>
  ({ nome, versao, comando: 'UPDATE', codigoRotina: 0, codigoModulo: 0, tipoProjeto: 'SERVICO', descricao: '', status, dependencias: deps, featureMavenUrl }) as never;
const catalog = (...features: unknown[]): Routine801CatalogResponse => ({ repositorios: [], funcionalidades: features as never });
const manifest = (...features: [string, string][]): VersionManifest => ({ repos: [], features: features.map(([name, version]) => ({ name, version })), disabled: [] });

const EXATA = '[1.40.1.0,1.40.1.0]';

describe('faixas de versão', () => {
  it('lê a faixa exata, a semiaberta e a versão solta (que vale como mínimo)', () => {
    expect(parseVersionSpec(EXATA)).toEqual({ min: '1.40.1.0', minInclusive: true, max: '1.40.1.0', maxInclusive: true });
    expect(parseVersionSpec('[1.0,2.0)')).toEqual({ min: '1.0', minInclusive: true, max: '2.0', maxInclusive: false });
    expect(parseVersionSpec('1.40.1.0')).toEqual({ min: '1.40.1.0', minInclusive: true, maxInclusive: false });
  });

  it('o que não é versão nem faixa não é entendido, e então não acusa nada', () => {
    expect(parseVersionSpec('')).toBeNull();
    expect(parseVersionSpec('latest')).toBeNull();
    expect(satisfiesSpec('1.0.0', 'latest')).toBeUndefined();
  });

  it('a faixa exata só aceita aquela versão; a solta aceita aquela e as acima', () => {
    expect(satisfiesSpec('1.40.1.0', EXATA)).toBe(true);
    expect(satisfiesSpec('1.40.1.2', EXATA)).toBe(false);
    expect(satisfiesSpec('1.39.9.9', EXATA)).toBe(false);
    expect(satisfiesSpec('1.40.2.0', '1.40.1.0')).toBe(true);
    expect(satisfiesSpec('1.40.0.9', '1.40.1.0')).toBe(false);
    expect(satisfiesSpec('2.0', '[1.0,2.0)')).toBe(false);
  });
});

describe('checkManifestDependencies', () => {
  it('acha a feature que exige outra numa versão que a lista não tem (o erro do build de 33 minutos)', () => {
    const cat = catalog(
      entry('winthor-integracao-cadastros', '1.40.1.0', [{ featureName: 'winthor-integracao-cadastros-service', version: EXATA }]),
      entry('winthor-integracao-cadastros-service', '1.40.1.0')
    );
    const r = checkManifestDependencies(manifest(['winthor-integracao-cadastros', '1.40.1.0'], ['winthor-integracao-cadastros-service', '1.39.5.0']), cat, 40);
    expect(r.issues).toEqual([
      { feature: 'winthor-integracao-cadastros', version: '1.40.1.0', dependency: 'winthor-integracao-cadastros-service', required: EXATA, found: '1.39.5.0', kind: 'conflict', fix: '1.40.1.0' }
    ]);
    // só a que o catálogo conhece na versão exata dá para conferir
    expect(r.checked).toBe(1);
    expect(r.withDependencies).toBe(1);
  });

  it('lista que atende às dependências não tem problema', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'b', version: '1.40.1.0' }]), entry('b', '1.40.2.0'));
    expect(checkManifestDependencies(manifest(['a', '1.40.1.0'], ['b', '1.40.2.0']), cat, 40).issues).toEqual([]);
  });

  it('a feature do WinThor exigida que nem está na lista nem no catálogo vira aviso', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'winthor-b-service', version: EXATA }]));
    const r = checkManifestDependencies(manifest(['a', '1.40.1.0']), cat, 40);
    expect(r.issues).toEqual([{ feature: 'a', version: '1.40.1.0', dependency: 'winthor-b-service', required: EXATA, kind: 'missing' }]);
  });

  it('dependência de fora do WinThor (karaf, http...) não é acusada', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'http', version: '4.0.0' }]));
    expect(checkManifestDependencies(manifest(['a', '1.40.1.0']), cat, 40).issues).toEqual([]);
  });

  it('se o catálogo oferece a exigida e a lista não tem, não acusa: o Karaf a puxa do repositório', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'winthor-b', version: EXATA }]), entry('winthor-b', '1.40.1.0'));
    expect(checkManifestDependencies(manifest(['a', '1.40.1.0']), cat, 40).issues).toEqual([]);
  });

  it('sem versão na dependência ou sem a feature no catálogo na versão da lista, não há o que conferir', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'winthor-b' }]));
    expect(checkManifestDependencies(manifest(['a', '1.40.1.0'], ['winthor-b', '1.0.0']), cat, 40).issues).toEqual([]);
    expect(checkManifestDependencies(manifest(['a', '9.9.9']), cat, 40).checked).toBe(0);
  });

  it('catálogo sem nenhuma dependência declarada: não deu para conferir, e diz isso', () => {
    const cat = catalog(entry('a', '1.40.1.0'), entry('b', '1.40.1.0'));
    const r = checkManifestDependencies(manifest(['a', '1.40.1.0'], ['b', '1.40.1.0']), cat, 40);
    expect(r.checked).toBe(2);
    expect(r.withDependencies).toBe(0);
    expect(r.sample).toBeUndefined();
  });

  it('guarda um exemplo do formato que o catálogo trouxe', () => {
    const cat = catalog(entry('a', '1.40.1.0', [{ featureName: 'winthor-b', version: EXATA }]), entry('winthor-b', '1.40.1.0'));
    expect(checkManifestDependencies(manifest(['a', '1.40.1.0'], ['winthor-b', '1.40.1.0']), cat, 40).sample).toBe(`a → winthor-b ${EXATA}`);
  });
});

describe('resolveDependencies', () => {
  const cat = catalog(
    entry('winthor-cad', '1.40.1.0', [{ featureName: 'winthor-cad-service', version: EXATA }]),
    entry('winthor-cad-service', '1.40.1.0', [], 'LIBERADO', 'mvn:x/cad-service/1.40.1.0/xml/features')
  );

  it('ajusta a dependência para a versão que o catálogo oferece e junta o repositório dela', () => {
    const r = resolveDependencies({ manifest: manifest(['winthor-cad', '1.40.1.0'], ['winthor-cad-service', '1.39.5.0']) }, cat, 40);
    expect(r.manifest.features).toContainEqual({ name: 'winthor-cad-service', version: '1.40.1.0' });
    expect(r.fixes).toEqual([{ name: 'winthor-cad-service', from: '1.39.5.0', to: '1.40.1.0', reason: 'exigida por winthor-cad 1.40.1.0' }]);
    expect(r.manifest.repos).toContain('mvn:x/cad-service/1.40.1.0/xml/features');
    expect(r.report.issues).toEqual([]);
    expect(r.report.fixed).toBe(1);
  });

  it('segue a cadeia: a feature ajustada traz as dependências dela', () => {
    const chain = catalog(
      entry('a', '1.40.0.0', [{ featureName: 'b', version: '[1.40.1.0,1.40.1.0]' }]),
      entry('b', '1.40.1.0', [{ featureName: 'c', version: '[1.40.2.0,1.40.2.0]' }]),
      entry('c', '1.40.2.0')
    );
    const r = resolveDependencies({ manifest: manifest(['a', '1.40.0.0'], ['b', '1.39.0.0'], ['c', '1.39.0.0']) }, chain, 40);
    expect(Object.fromEntries(r.manifest.features.map((f) => [f.name, f.version]))).toEqual({ a: '1.40.0.0', b: '1.40.1.0', c: '1.40.2.0' });
    expect(r.fixes.map((f) => f.name)).toEqual(['b', 'c']);
  });

  it('não usa versão bloqueada nem de uma linha acima da alvo, e o conflito continua à mostra', () => {
    const bloqueada = catalog(entry('a', '1.40.1.0', [{ featureName: 'b', version: EXATA }]), entry('b', '1.40.1.0', [], 'BLOQUEADO'));
    const r1 = resolveDependencies({ manifest: manifest(['a', '1.40.1.0'], ['b', '1.39.0.0']) }, bloqueada, 40);
    expect(r1.fixes).toEqual([]);
    expect(r1.report.issues).toHaveLength(1);

    const acima = catalog(entry('a', '1.41.0.0', [{ featureName: 'b', version: '[1.41.0.0,1.41.0.0]' }]), entry('b', '1.41.0.0'));
    expect(resolveDependencies({ manifest: manifest(['a', '1.41.0.0'], ['b', '1.40.0.0']) }, acima, 40).fixes).toEqual([]);
  });

  it('exigências opostas não ficam se desfazendo: a mesma feature é ajustada uma vez só', () => {
    const oposto = catalog(
      entry('a', '1.40.0.0', [{ featureName: 'b', version: '[1.40.1.0,1.40.1.0]' }]),
      entry('c', '1.40.0.0', [{ featureName: 'b', version: '[1.40.2.0,1.40.2.0]' }]),
      entry('b', '1.40.1.0'),
      entry('b', '1.40.2.0')
    );
    const r = resolveDependencies({ manifest: manifest(['a', '1.40.0.0'], ['c', '1.40.0.0'], ['b', '1.39.0.0']) }, oposto, 40);
    expect(r.fixes).toHaveLength(1);
    expect(r.report.issues.length).toBeGreaterThan(0);
  });

  it('lista já consistente não muda', () => {
    const r = resolveDependencies({ manifest: manifest(['winthor-cad', '1.40.1.0'], ['winthor-cad-service', '1.40.1.0']) }, cat, 40);
    expect(r.fixes).toEqual([]);
    expect(r.manifest.features).toHaveLength(2);
  });
});

describe('mergeDependencyFixes', () => {
  it('quem já subiu pelo catálogo muda o destino, sem aparecer duas vezes', () => {
    const merged = mergeDependencyFixes(
      [{ name: 'b', from: '1.39.0.0', to: '1.40.3.0' }],
      [{ name: 'b', from: '1.40.3.0', to: '1.40.1.0', reason: 'exigida por a 1.40.1.0' }]
    );
    expect(merged).toEqual([{ name: 'b', from: '1.39.0.0', to: '1.40.1.0', reason: 'exigida por a 1.40.1.0' }]);
  });

  it('quem não tinha mudança vira uma mudança nova', () => {
    expect(mergeDependencyFixes([], [{ name: 'b', from: '1.0', to: '2.0', reason: 'r' }])).toEqual([{ name: 'b', from: '1.0', to: '2.0', reason: 'r' }]);
  });
});
