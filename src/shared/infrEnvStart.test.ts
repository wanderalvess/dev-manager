import { describe, expect, it } from 'vitest';
import { describeEnvironment } from './infrActiveEnv';
import { formatWait, oracleReadiness, startPlan, wshDecision, wshStability, wtaApiState } from './infrEnvStart';

const c = (name: string, state = 'exited', ports = '') => ({ name, image: 'img', state, ports });

describe('startPlan', () => {
  it('Oracle, WTA e WSH nessa ordem', () => {
    const info = describeEnvironment({ name: '39', oracle: c('oracle-39'), wta: c('wta-39'), wsh: c('wsh-39') });
    expect(startPlan(info)).toEqual([
      { role: 'oracle', name: 'oracle-39' },
      { role: 'wta', name: 'wta-39' },
      { role: 'wsh', name: 'wsh-39' }
    ]);
  });

  it('um ambiente que usa o Oracle de outro nome sobe só WTA e WSH', () => {
    const info = describeEnvironment({ name: 'develop', wta: c('wta-develop'), wsh: c('wsh-develop') });
    expect(startPlan(info).map((i) => i.role)).toEqual(['wta', 'wsh']);
  });
});

describe('oracleReadiness', () => {
  it('só está pronto rodando e saudável', () => {
    expect(oracleReadiness('running', 'healthy')).toBe('ready');
    expect(oracleReadiness('running', 'starting')).toBe('waiting');
    expect(oracleReadiness('running', 'unhealthy')).toBe('waiting');
  });

  it('sem healthcheck na imagem, rodando basta', () => {
    expect(oracleReadiness('running', '')).toBe('ready');
    expect(oracleReadiness('running', undefined)).toBe('ready');
  });

  it('container que saiu é falha; reiniciando ainda se espera', () => {
    expect(oracleReadiness('exited', '')).toBe('failed');
    expect(oracleReadiness('dead', '')).toBe('failed');
    expect(oracleReadiness('restarting', '')).toBe('waiting');
  });
});

describe('wtaApiState', () => {
  it('API respondendo (nem 404 nem 5xx) é no ar', () => {
    expect(wtaApiState(200, 204)).toBe('up');
    expect(wtaApiState(200, 401)).toBe('up');
    expect(wtaApiState(200, 405)).toBe('up');
  });

  it('só a raiz respondendo é o Karaf ainda carregando', () => {
    expect(wtaApiState(200, 404)).toBe('booting');
    expect(wtaApiState(200, 503)).toBe('booting');
    expect(wtaApiState(200, undefined)).toBe('booting');
  });

  it('nada respondendo é fora do ar', () => {
    expect(wtaApiState(undefined, undefined)).toBe('down');
    expect(wtaApiState(503, 503)).toBe('down');
  });
});

describe('wshStability', () => {
  it('rodando sem reinício novo é estável', () => {
    expect(wshStability([{ state: 'running', restarts: 0 }, { state: 'running', restarts: 0 }])).toBe('stable');
  });

  it('reinício novo, reiniciando ou saiu: não é estável', () => {
    expect(wshStability([{ state: 'running', restarts: 0 }, { state: 'running', restarts: 1 }])).toBe('restarting');
    expect(wshStability([{ state: 'running', restarts: 0 }, { state: 'restarting', restarts: 0 }])).toBe('restarting');
    expect(wshStability([{ state: 'running', restarts: 0 }, { state: 'exited', restarts: 0 }])).toBe('restarting');
  });

  it('sem leitura não diz nada', () => {
    expect(wshStability([])).toBe('unknown');
  });
});

describe('wshDecision', () => {
  it('sobe com a API no ar e o login entrando', () => {
    expect(wshDecision(true, { ok: true })).toEqual({ start: true });
  });

  it('sem a API não sobe, e explica o motivo', () => {
    const d = wshDecision(false, undefined);
    expect(d.start).toBe(false);
    expect(d.note).toContain('/instalador');
  });

  it('login recusado não sobe e traz o motivo do WTA', () => {
    const d = wshDecision(true, { ok: false, error: 'HTTP 401: Usuário ou senha inválidos' });
    expect(d.start).toBe(false);
    expect(d.note).toContain('Usuário ou senha inválidos');
  });

  it('sem credenciais para conferir, sobe e avisa', () => {
    const d = wshDecision(true, { ok: false, needsCredentials: true });
    expect(d.start).toBe(true);
    expect(d.note).toContain('não conferiu');
  });
});

describe('formatWait', () => {
  it('mm:ss', () => {
    expect(formatWait(75)).toBe('1:15');
    expect(formatWait(5)).toBe('0:05');
  });
});
