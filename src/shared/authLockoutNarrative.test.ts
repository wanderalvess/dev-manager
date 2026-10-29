import { describe, expect, it } from 'vitest';
import { attemptLine, checkPlan, describeResponse, durationProbeOffsets, meetsExpectation, type NarrativeContext } from './authLockoutNarrative';
import { AUTH_LOCKOUT_CHECK_IDS } from './authLockoutCatalog';
import type { AuthLockoutAttempt } from './authLockoutTypes';

const ctx: NarrativeContext = {
  userA: 'wand',
  userB: 'rod',
  threshold: 5,
  windowSeconds: 60,
  lockMinutes: [4, 5],
  concurrency: 3,
  logsUrl: 'http://localhost:81/winthor/ferramenta/servidor/v1/logs',
  logFilePath: 'C:\\pcsist\\winthor.log',
  logoffPath: '/winthor/autenticacao/v1/logoff',
  probeOffsets: durationProbeOffsets([4, 5])
};

function attempt(partial: Partial<AuthLockoutAttempt>): AuthLockoutAttempt {
  return {
    seq: 7,
    at: '2026-10-29T12:00:00.000Z',
    offsetMs: 0,
    checkId: 'threshold',
    label: 'Execução 2 wand: falha 5/5',
    user: 'wand',
    kind: 'login-wrong',
    method: 'POST',
    path: '/winthor/autenticacao/v1/login',
    status: 401,
    outcome: 'rejected',
    durationMs: 12,
    issuedToken: false,
    setSessionCookie: false,
    bodySnippet: '',
    exposure: [],
    ...partial
  };
}

describe('checkPlan', () => {
  it('toda checagem tem explicação', () => {
    for (const id of AUTH_LOCKOUT_CHECK_IDS) expect(checkPlan(id, ctx).length).toBeGreaterThan(40);
  });

  it('fala dos usuários e números desta execução', () => {
    expect(checkPlan('threshold', ctx)).toContain('Erra a senha de wand 4 vezes');
    expect(checkPlan('threshold', ctx)).toContain('espera 65s');
    expect(checkPlan('per-user', ctx)).toContain('rod entra');
    expect(checkPlan('lock-duration', ctx)).toContain('230, 250, 290, 310 e 360s');
    expect(checkPlan('count-window', ctx)).toContain('t=61s');
  });

  it('sem logoff configurado, diz que a checagem é manual', () => {
    expect(checkPlan('logoff-bypass', { ...ctx, logoffPath: undefined })).toContain('à mão');
  });
});

describe('describeResponse', () => {
  it('traduz cada resultado do WTA', () => {
    expect(describeResponse(attempt({}))).toContain('não diz se foi senha errada ou bloqueio');
    expect(describeResponse(attempt({ status: 429, outcome: 'locked' }))).toBe('HTTP 429: recusado como conta bloqueada');
    expect(describeResponse(attempt({ status: 200, outcome: 'authenticated', issuedToken: true }))).toContain('ENTROU (o WTA devolveu token)');
    expect(describeResponse(attempt({ status: 0, outcome: 'error', error: 'ECONNREFUSED' }))).toContain('sem resposta');
  });
});

describe('expectativa da tentativa', () => {
  it('marca ✔ quando bate e ✘ quando não bate', () => {
    expect(attemptLine(attempt({}), 'refuse')).toContain('esperado: recusar ✔');
    expect(attemptLine(attempt({ kind: 'login-correct', status: 200, outcome: 'authenticated', issuedToken: true }), 'refuse')).toContain('esperado: recusar ✘');
  });

  it('5xx ou sem resposta nunca é o esperado; sem expectativa não marca', () => {
    expect(meetsExpectation(attempt({ status: 500, outcome: 'error' }), 'refuse')).toBe(false);
    expect(meetsExpectation(attempt({}), undefined)).toBeUndefined();
    expect(attemptLine(attempt({}), undefined)).not.toContain('esperado');
  });
});
