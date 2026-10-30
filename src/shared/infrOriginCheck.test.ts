import { describe, expect, it } from 'vitest';
import { buildOriginCheck, originCheckBlocks, type InfrOriginCheckInput } from './infrOriginCheck';

const ok: InfrOriginCheckInput = {
  folder: 'C:\\projetos\\INFR-Docker',
  missingScripts: [],
  container: 'wta-develop',
  state: 'running',
  url: 'http://localhost:8087',
  http: { status: 200 },
  login: { ok: true, user: 'PCADMIN' }
};
const byId = (i: InfrOriginCheckInput, id: string) => buildOriginCheck(i).find((it) => it.id === id)!;

describe('conferência da origem no passo 1', () => {
  it('tudo certo: pasta, WTA no ar e login, nada bloqueia', () => {
    const items = buildOriginCheck(ok);
    expect(items.map((it) => [it.id, it.status])).toEqual([
      ['pasta', 'ok'],
      ['wta', 'ok'],
      ['login', 'ok']
    ]);
    expect(byId(ok, 'login').detail).toContain('PCADMIN entrou');
    expect(originCheckBlocks(items)).toBe(false);
  });

  it('sem usuário configurado pede usuário e senha ali mesmo', () => {
    const item = byId({ ...ok, login: { ok: false, needsCredentials: true } }, 'login');
    expect(item).toMatchObject({ status: 'block', title: 'Falta o usuário do WTA', askCredentials: true });
  });

  it('login recusado mostra a resposta do WTA e também pede a senha', () => {
    const item = byId({ ...ok, login: { ok: false, user: 'PCADMIN', error: 'login de PCADMIN recusado pelo WTA (HTTP 401): Credenciais inválidas' } }, 'login');
    expect(item).toMatchObject({ status: 'block', title: 'O WTA recusou o login', askCredentials: true });
    expect(item.detail).toContain('Credenciais inválidas');
  });

  it('WTA parado ou subindo bloqueia, e o login fica como não conferido', () => {
    const parado = buildOriginCheck({ ...ok, state: 'exited', http: undefined, login: undefined });
    expect(parado.find((i) => i.id === 'wta')).toMatchObject({ status: 'block', title: 'wta-develop está exited' });
    expect(parado.find((i) => i.id === 'login')?.status).toBe('warn');
    const subindo = byId({ ...ok, http: { error: 'ECONNREFUSED' }, login: undefined }, 'wta');
    expect(subindo).toMatchObject({ status: 'block', title: 'O WTA de origem ainda não responde' });
    expect(byId({ ...ok, state: undefined }, 'wta').title).toBe('wta-develop não existe');
  });

  it('pasta sem os scripts da Nova versão bloqueia e diz o branch', () => {
    const item = byId({ ...ok, missingScripts: ['linux-winthor/scripts/export_features.sh'] }, 'pasta');
    expect(item.status).toBe('block');
    expect(item.detail).toContain('git checkout feature/imagem-por-versao');
  });
});
