import { describe, expect, it } from 'vitest';
import { isInfrXeImage, reviewBlocks, reviewNewVersion, type InfrReviewInput } from './infrNewVersionReview';

const base: InfrReviewInput = {
  preview: {
    success: true,
    originWtaUrl: 'http://localhost:8038',
    upgrade: { changes: [], behind: [{ name: 'winthor-a', version: '1.38.0.1' }], skipped: [] },
    wshCheck: [{ service: 'winthor-integracao-config', version: '1.38.17.40', found: '1.38.17.48', ok: true }],
    existing: {
      path: 'versions/39.features',
      count: 64,
      comparison: { newer: 0, older: 37, onlyExisting: 8, onlyPreview: 111 },
      wshCheck: [{ service: 'winthor-integracao-config', version: '1.38.17.40', found: '1.39.20.3', ok: true }]
    }
  },
  manifestSource: 'existing',
  version: '39',
  from: 'local',
  dbMode: 'clone',
  dbSource: 'oracle-local',
  dbSourceImage: 'hub-oracle-local:snap',
  dbContainer: 'oracle-teste39',
  wshJar: '/opt/winthor-integracao-core.jar'
};

const byId = (items: ReturnType<typeof reviewNewVersion>, id: string) => items.find((i) => i.id === id)!;

describe('conferência da versão nova', () => {
  it('reconhece a imagem do Oracle do INFR-Docker', () => {
    expect(isInfrXeImage('oracle-winthor:11.2.0.2-xe')).toBe(true);
    expect(isInfrXeImage('gvenzl/oracle-free:slim')).toBe(false);
  });

  it('clone de um Oracle que não é o XE do INFR-Docker bloqueia e oferece as saídas', () => {
    const items = reviewNewVersion(base);
    expect(byId(items, 'banco')).toMatchObject({ status: 'block', fixes: ['useSourceOracle', 'emptyOracle'] });
    expect(reviewBlocks(items)).toBe(true);
    expect(reviewBlocks(reviewNewVersion({ ...base, dbSourceImage: 'oracle-winthor:11.2.0.2-xe' }))).toBe(false);
  });

  it('usar o banco da própria origem avisa que a versão nova pode alterá-lo', () => {
    const item = byId(reviewNewVersion({ ...base, dbMode: 'existing', dbContainer: 'oracle-local' }), 'banco');
    expect(item.status).toBe('warn');
    expect(item.detail).toContain('mesmo banco da origem');
  });

  it('dependências: conflito sem saída bloqueia, ajuste automático aprova, catálogo sem dependências avisa', () => {
    const novo = { ...base, manifestSource: 'preview' as const };
    const withDeps = (dependencies: NonNullable<InfrReviewInput['preview']['dependencies']>) => byId(reviewNewVersion({ ...novo, preview: { ...base.preview, dependencies } }), 'dependencias');
    const conflito = { feature: 'a', version: '1.0', dependency: 'b', required: '[1.0,1.0]', found: '0.9', kind: 'conflict' as const };
    expect(withDeps({ checked: 3, withDependencies: 2, fixed: 0, issues: [conflito] })).toMatchObject({ status: 'block' });
    expect(withDeps({ checked: 3, withDependencies: 2, fixed: 0, issues: [{ ...conflito, kind: 'missing' as const }] }).status).toBe('warn');
    const ok = withDeps({ checked: 3, withDependencies: 2, fixed: 1, issues: [] });
    expect(ok.status).toBe('ok');
    expect(ok.detail).toContain('1 ajustadas');
    expect(withDeps({ checked: 3, withDependencies: 0, fixed: 0, issues: [] }).status).toBe('warn');
    expect(byId(reviewNewVersion(novo), 'dependencias').status).toBe('warn');
  });

  it('artefatos: ausente e não conferido avisam; encontrado aprova; sem repositório novo não aparece', () => {
    const novo = { ...base, manifestSource: 'preview' as const };
    const item = (artifacts: NonNullable<InfrReviewInput['preview']['artifacts']>) => reviewNewVersion({ ...novo, preview: { ...base.preview, artifacts } }).find((i) => i.id === 'artefatos');
    const vazio = { checked: 2, missing: [], unverified: 0, repositories: [], withoutRepo: [] };
    expect(item({ ...vazio, missing: ['mvn:g/a/1/xml/features'] })).toMatchObject({ status: 'warn', detail: expect.stringContaining('Unable to resolve') });
    expect(item({ ...vazio, unverified: 2, error: 'o container não tem curl' })?.detail).toContain('o container não tem curl');
    expect(item(vazio)?.status).toBe('ok');
    expect(item({ ...vazio, checked: 0 })).toBeUndefined();
  });

  it('ensaio: erro do Karaf e ensaio que não rodou avisam; simulado sem erro aprova; pré-checagem entra na lista', () => {
    const novo = { ...base, manifestSource: 'preview' as const };
    const item = (dryRun: NonNullable<InfrReviewInput['preview']['dryRun']>) => reviewNewVersion({ ...novo, preview: { ...base.preview, dryRun } }).find((i) => i.id === 'ensaio')!;
    expect(item({ simulated: 3, errors: ['Unable to resolve root'], tail: [] })).toMatchObject({ status: 'warn', detail: expect.stringContaining('Unable to resolve root') });
    expect(item({ simulated: 3, errors: [], tail: [], skipped: 'tempo esgotado' }).title).toBe('Ensaio da resolução não rodou');
    expect(item({ simulated: 3, errors: [], tail: [] }).status).toBe('ok');
    const porta = { id: 'portas' as const, status: 'block' as const, title: 'Portas do host já em uso', detail: '1540 (Oracle)' };
    const items = reviewNewVersion({ ...novo, preview: { ...base.preview, preflight: [porta] } });
    expect(items.find((i) => i.id === 'portas')?.status).toBe('block');
    expect(reviewBlocks(items)).toBe(true);
  });

  it('usando a lista que já existe, as dependências não entram na conferência', () => {
    expect(reviewNewVersion(base).some((i) => i.id === 'dependencias')).toBe(false);
  });

  it('o WSH é conferido contra o manifesto escolhido', () => {
    const recusa = [{ service: 'winthor-integracao-config', version: '1.39.0.1', found: '1.38.17.48', ok: false }];
    const comExistente = reviewNewVersion({ ...base, preview: { ...base.preview, wshCheck: recusa } });
    expect(byId(comExistente, 'wsh').status).toBe('ok');
    const comPrevia = reviewNewVersion({ ...base, manifestSource: 'preview', preview: { ...base.preview, wshCheck: recusa } });
    expect(byId(comPrevia, 'wsh')).toMatchObject({ status: 'block', title: 'O WSH recusaria subir' });
    expect(byId(comPrevia, 'features').detail).toContain('rebaixaria 37');
  });

  it('sem jar do WSH só avisa; origem que falhou bloqueia sozinha', () => {
    expect(byId(reviewNewVersion({ ...base, wshJar: undefined }), 'wsh').status).toBe('warn');
    const falha = reviewNewVersion({ ...base, preview: { success: false, error: 'HTTP 403' } });
    expect(falha).toEqual([{ id: 'origem', status: 'block', title: 'Não foi possível ler a origem', detail: 'HTTP 403' }]);
  });
});

describe('downgrade (versão nova menor que a da origem)', () => {
  const down: InfrReviewInput = {
    ...base,
    preview: { ...base.preview, originLine: 39 },
    version: '38',
    from: 'master',
    dbSource: 'oracle-master',
    dbSourceImage: 'oracle-winthor:11.2.0.2-xe',
    dbContainer: 'oracle-suport_38'
  };

  it('avisa o downgrade e bloqueia o clone do banco, oferecendo um Oracle vazio', () => {
    const items = reviewNewVersion(down);
    expect(byId(items, 'versao')).toMatchObject({ status: 'warn', title: 'Downgrade: a origem está na 39' });
    expect(byId(items, 'banco')).toMatchObject({ status: 'block', title: 'O banco da 39 não serve para a 38', fixes: ['emptyOracle'] });
    expect(reviewBlocks(items)).toBe(true);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('com a lista pronta da 38 e um Oracle vazio, só avisa', () => {
    const items = reviewNewVersion({ ...down, dbMode: 'empty' });
    expect(byId(items, 'features').status).toBe('ok');
    expect(reviewBlocks(items)).toBe(false);
  });

  it('sem a lista pronta (ou escolhendo a nova), as features bloqueiam', () => {
    const semLista = reviewNewVersion({ ...down, dbMode: 'empty', preview: { ...down.preview, existing: undefined } });
    expect(byId(semLista, 'features')).toMatchObject({ status: 'block' });
    expect(byId(semLista, 'features').detail).toContain('Não há versions/38.features');
    const listaNova = reviewNewVersion({ ...down, dbMode: 'empty', manifestSource: 'preview' });
    expect(byId(listaNova, 'features').status).toBe('block');
  });

  it('usar o banco da própria origem também bloqueia; outro Oracle só pede para conferir', () => {
    expect(byId(reviewNewVersion({ ...down, dbMode: 'existing', dbContainer: 'oracle-master' }), 'banco').status).toBe('block');
    expect(byId(reviewNewVersion({ ...down, dbMode: 'existing', dbContainer: 'oracle-38' }), 'banco')).toMatchObject({ status: 'warn' });
  });

  it('mesma linha ou subida não é downgrade', () => {
    expect(reviewNewVersion({ ...down, version: '39' }).some((i) => i.id === 'versao')).toBe(false);
    expect(reviewNewVersion({ ...down, version: '40' }).some((i) => i.id === 'versao')).toBe(false);
  });
});
