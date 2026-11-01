import { describe, expect, it } from 'vitest';
import { InfrStartEnvService, type StartEnvDeps, type StartProgress } from './InfrStartEnvService';
import type { InfrContainerInfo, InfrEnvironment } from '../../../shared/infrWinthorVersion';

const c = (name: string, state = 'exited', ports = ''): InfrContainerInfo => ({ name, image: 'img', state, ports });
const env: InfrEnvironment = { name: '39', oracle: c('oracle-39'), wta: c('wta-39'), wsh: c('wsh-39') };

interface World {
  /** Estado de cada container; recebe os segundos desde que o Hub o iniciou (undefined se nunca iniciou) */
  state: Record<string, (since: number | undefined) => { state: string; health?: string; restarts?: number }>;
  api: (t: number) => { root?: number; api?: number };
  login: { ok: boolean; needsCredentials?: boolean; error?: string };
  log?: string;
  dockerError?: string;
}

/** Docker, HTTP e relógio simulados: o sleep só avança o relógio. */
function build(world: World, environment: InfrEnvironment = env) {
  let t = 0;
  const startedAt: Record<string, number> = {};
  const commands: string[] = [];
  const deps: StartEnvDeps = {
    listEnvironments: async () => ({ success: true, distro: 'ubuntu2604-winthor', environments: [environment], oracles: [], wshJars: [] }),
    run: async (_distro, script) => {
      commands.push(script);
      if (world.dockerError && script.includes('docker start')) throw new Error(world.dockerError);
      const start = /docker start (\S+)/.exec(script);
      if (start) startedAt[start[1]] = t;
      const inspect = /docker inspect -f '[^']+' (\S+)/.exec(script);
      if (inspect) {
        const s = world.state[inspect[1]]?.(startedAt[inspect[1]] === undefined ? undefined : t - startedAt[inspect[1]]);
        return s ? `${s.state}|${s.health ?? ''}|${s.restarts ?? 0}` : 'MISSING';
      }
      if (script.includes('docker port')) return '0.0.0.0:8039\n';
      if (script.includes('docker logs')) return world.log ?? '';
      return '';
    },
    httpStatus: async (url, method) => {
      const a = world.api(t);
      return method === 'GET' ? a.root : a.api;
    },
    login: async () => world.login,
    sleep: async (ms) => {
      t += ms / 1000;
    },
    now: () => t * 1000
  };
  const progress: StartProgress[] = [];
  return { service: new InfrStartEnvService(deps), commands, progress, onProgress: (p: StartProgress) => progress.push(p) };
}

const up = (health = 'healthy') => () => ({ state: 'running', health });

describe('InfrStartEnvService', () => {
  it('sobe banco, WTA e WSH na ordem, esperando cada um ficar pronto', async () => {
    const w = build({
      state: {
        // O banco leva 90 s para ficar saudável; os containers começam parados
        'oracle-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running', health: s < 90 ? 'starting' : 'healthy' }),
        'wta-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running' }),
        'wsh-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running' })
      },
      // O Karaf responde logo, a API do WinThor só depois de 3 min
      api: (t) => ({ root: t > 100 ? 200 : undefined, api: t > 280 ? 204 : t > 100 ? 404 : undefined }),
      login: { ok: true }
    });
    const res = await w.service.start({ name: '39' }, w.onProgress);
    expect(res).toMatchObject({ success: true, started: ['oracle-39', 'wta-39', 'wsh-39'], notes: [] });
    // A ordem dos docker start é a do plano
    const starts = w.commands.filter((x) => x.includes('docker start')).map((x) => x.split(' ').pop());
    expect(starts).toEqual(['oracle-39', 'wta-39', 'wsh-39']);
    expect(w.progress.some((p) => p.message?.includes('Esperando o banco'))).toBe(true);
    expect(w.progress.some((p) => p.message?.includes('esperando a API do WinThor'))).toBe(true);
  });

  it('não inicia o que já está no ar', async () => {
    const w = build({
      state: { 'oracle-39': up(), 'wta-39': up(), 'wsh-39': up() },
      api: () => ({ root: 200, api: 204 }),
      login: { ok: true }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(true);
    expect(res.started).toEqual([]);
    expect(w.commands.some((x) => x.includes('docker start'))).toBe(false);
  });

  it('banco que não fica saudável no prazo é falha, com o motivo, e o WTA não sobe', async () => {
    const w = build({
      state: { 'oracle-39': () => ({ state: 'running', health: 'starting' }), 'wta-39': () => ({ state: 'exited' }), 'wsh-39': () => ({ state: 'exited' }) },
      api: () => ({}),
      login: { ok: true }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(false);
    expect(res.failed).toBe('oracle-39');
    expect(res.error).toContain('não ficou pronto');
    expect(w.commands.some((x) => x.includes('docker start wta-39'))).toBe(false);
  });

  it('banco que sai falha na hora, com o fim do log', async () => {
    const w = build({
      state: { 'oracle-39': () => ({ state: 'exited' }), 'wta-39': () => ({ state: 'exited' }) },
      api: () => ({}),
      login: { ok: true },
      log: 'ORA-00845: MEMORY_TARGET not supported'
    });
    const res = await w.service.start({ name: '39' });
    expect(res.failed).toBe('oracle-39');
    expect(res.error).toContain('ORA-00845');
  });

  it('login recusado: WTA no ar, WSH não sobe e explica', async () => {
    const w = build({
      state: { 'oracle-39': up(), 'wta-39': up(), 'wsh-39': () => ({ state: 'exited' }) },
      api: () => ({ root: 200, api: 204 }),
      login: { ok: false, error: 'HTTP 401: Usuário ou senha inválidos' }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(true);
    expect(res.notes.join(' ')).toContain('Usuário ou senha inválidos');
    expect(w.commands.some((x) => x.includes('docker start wsh-39'))).toBe(false);
  });

  it('API do WinThor que não sobe no prazo: sem WSH, com o aviso do /instalador', async () => {
    const w = build({
      state: { 'oracle-39': up(), 'wta-39': up(), 'wsh-39': () => ({ state: 'exited' }) },
      api: () => ({ root: 200, api: 404 }),
      login: { ok: true }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(true);
    expect(res.notes.join(' ')).toContain('/instalador');
    expect(w.commands.some((x) => x.includes('docker start wsh-39'))).toBe(false);
  });

  it('WTA que nunca responde é falha', async () => {
    const w = build({
      state: { 'oracle-39': up(), 'wta-39': up() },
      api: () => ({}),
      login: { ok: true }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(false);
    expect(res.failed).toBe('wta-39');
    expect(res.error).toContain('não respondeu');
  });

  it('sem credenciais do WTA, o WSH sobe com o aviso', async () => {
    const w = build({
      state: { 'oracle-39': up(), 'wta-39': up(), 'wsh-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running' }) },
      api: () => ({ root: 200, api: 204 }),
      login: { ok: false, needsCredentials: true }
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(true);
    expect(res.started).toEqual(['wsh-39']);
    expect(res.notes.join(' ')).toContain('não conferiu');
  });

  it('WSH que reinicia em loop vira falha e aponta a versão exigida', async () => {
    const w = build({
      state: {
        'oracle-39': up(),
        'wta-39': up(),
        'wsh-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running', restarts: Math.floor(s / 10) })
      },
      api: () => ({ root: 200, api: 204 }),
      login: { ok: true },
      log: 'Versão exigida 1.40.2.1, instalada 1.40.0.1'
    });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(false);
    expect(res.failed).toBe('wsh-39');
    expect(res.error).toContain('versão mínima');
  });

  it('Docker travado ao iniciar vira falha do container, não trava a tela', async () => {
    const w = build({ state: { 'oracle-39': () => ({ state: 'exited' }), 'wta-39': () => ({ state: 'exited' }) }, api: () => ({}), login: { ok: true }, dockerError: 'timeout' });
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(false);
    expect(res.failed).toBe('oracle-39');
    expect(res.error).toContain('Falha ao subir oracle-39');
  });

  it('ambiente sem Oracle próprio sobe só WTA e WSH', async () => {
    const semBanco: InfrEnvironment = { name: '39', wta: c('wta-39'), wsh: c('wsh-39') };
    const w = build({ state: { 'wta-39': up(), 'wsh-39': (s) => (s === undefined ? { state: 'exited' } : { state: 'running' }) }, api: () => ({ root: 200, api: 204 }), login: { ok: true } }, semBanco);
    const res = await w.service.start({ name: '39' });
    expect(res.success).toBe(true);
    expect(w.commands.some((x) => x.includes('oracle-39'))).toBe(false);
  });

  it('recusa nome inválido e ambiente que não existe, sem tocar no Docker', async () => {
    const w = build({ state: {}, api: () => ({}), login: { ok: true } });
    expect((await w.service.start({ name: 'a;b' })).success).toBe(false);
    expect((await w.service.start({ name: 'outro' })).error).toContain('wta-outro');
    expect(w.commands).toEqual([]);
  });
});
