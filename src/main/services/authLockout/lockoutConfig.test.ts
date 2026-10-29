import { describe, expect, it } from 'vitest';
import { authLockoutDefaults, normalizeLockoutRequest } from './lockoutConfig';
import { durationProbeOffsets } from '../../../shared/authLockoutNarrative';

const settings = { wtaUrl: 'localhost:81/', karafPath: '/opt/karaf' };
const userA = { login: 'TESTE_A', password: 'senhaA' };

function config(request: Parameters<typeof normalizeLockoutRequest>[0]) {
  const result = normalizeLockoutRequest(request, settings);
  if ('error' in result) throw new Error(result.error);
  return result.config;
}

describe('authLockoutDefaults', () => {
  it('parte da URL do WTA e do winthor.log da pasta do Karaf', () => {
    const d = authLockoutDefaults(settings);
    expect(d.baseUrl).toBe('http://localhost:81');
    expect(d.logsUrl).toBe('http://localhost:81/winthor/ferramenta/servidor/v1/logs');
    expect(d.logFilePath?.replace(/\\/g, '/')).toBe('/opt/karaf/data/log/winthor.log');
    expect(d.threshold).toBe(5);
    expect(d.lockMinutesCandidates).toEqual([4, 5]);
  });
});

describe('normalizeLockoutRequest', () => {
  it('completa com os padrões e roda todas as checagens quando nenhuma é escolhida', () => {
    const c = config({ userA });
    expect(c.loginUrl).toBe('http://localhost:81/winthor/autenticacao/v1/login');
    expect(c.checks.size).toBe(12);
    expect(c.userB).toBeUndefined();
  });

  it('aceita URL completa de logs e caminho relativo de login', () => {
    const c = config({ userA, logsUrl: 'http://outro:82/winthor/ferramenta/servidor/v1/logs', loginPath: 'auth/login' });
    expect(c.logsUrl).toBe('http://outro:82/winthor/ferramenta/servidor/v1/logs');
    expect(c.loginUrl).toBe('http://localhost:81/auth/login');
  });

  it('limita números fora da faixa e ordena as durações candidatas', () => {
    const c = config({ userA, threshold: 999, windowSeconds: 1, concurrency: 500, lockMinutesCandidates: [5, 4, 5, 99] });
    expect(c.threshold).toBe(20);
    expect(c.windowSeconds).toBe(10);
    expect(c.concurrency).toBe(10);
    expect(c.lockMinutesCandidates).toEqual([4, 5, 30]);
  });

  it('logoff vazio desliga a chamada', () => {
    expect(config({ userA, logoffPath: '' }).logoffUrl).toBeUndefined();
  });

  it('recusa usuário sem senha, A igual a B, URL de metadados e arquivo que não é log', () => {
    expect(normalizeLockoutRequest({ userA: { login: 'x', password: '' } }, settings)).toEqual({ error: expect.stringContaining('usuário de teste A') });
    expect(normalizeLockoutRequest({ userA, userB: { login: 'teste_a', password: 'y' } }, settings)).toEqual({ error: expect.stringContaining('diferentes') });
    expect(normalizeLockoutRequest({ userA, baseUrl: 'http://169.254.169.254' }, settings)).toEqual({ error: expect.stringContaining('URL') });
    expect(normalizeLockoutRequest({ userA, logFilePath: '/etc/passwd' }, settings)).toEqual({ error: expect.stringContaining('log') });
  });

  it('ignora ids de checagem desconhecidos', () => {
    const c = config({ userA, checks: ['threshold', 'nao-existe' as never] });
    expect([...c.checks]).toEqual(['threshold']);
  });
});

describe('durationProbeOffsets', () => {
  it('sonda antes e depois de cada candidata e mais uma depois da maior', () => {
    expect(durationProbeOffsets([4, 5])).toEqual([230, 250, 290, 310, 360]);
  });
});
