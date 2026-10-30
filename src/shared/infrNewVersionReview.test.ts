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
