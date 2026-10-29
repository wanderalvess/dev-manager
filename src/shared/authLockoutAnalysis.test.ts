import { describe, expect, it } from 'vitest';
import {
  classifyLoginResponse,
  compileLockedPattern,
  countLoginFailureMentions,
  detectExposure,
  evaluateLockDuration,
  evaluateMentions,
  hasSessionCookie,
  interpretCountWindow,
  maskSecrets,
  worstStatus
} from './authLockoutAnalysis';

const LOCKED = /bloquead|locked/i;
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0ZTEyMyJ9.c2lnbmF0dXJhMTIzNDU2';

describe('classifyLoginResponse', () => {
  it('token no corpo é autenticado', () => {
    expect(classifyLoginResponse({ status: 200, body: `{"accessToken":"${JWT}"}` }, LOCKED)).toEqual({
      outcome: 'authenticated',
      issuedToken: true,
      setSessionCookie: false
    });
  });

  it('cookie de sessão sem token também é autenticado', () => {
    const r = classifyLoginResponse({ status: 200, body: '{}', headers: { 'set-cookie': ['suukie=abc123; Path=/'] } }, LOCKED);
    expect(r.outcome).toBe('authenticated');
    expect(r.setSessionCookie).toBe(true);
  });

  it('401 com mensagem de bloqueio é locked; sem ela é rejected', () => {
    expect(classifyLoginResponse({ status: 401, body: '{"message":"Usuário bloqueado"}' }, LOCKED).outcome).toBe('locked');
    expect(classifyLoginResponse({ status: 401, body: '{"message":"Senha inválida"}' }, LOCKED).outcome).toBe('rejected');
  });

  it('423 e 429 são bloqueio; 5xx e sem resposta são erro', () => {
    expect(classifyLoginResponse({ status: 423, body: '' }, LOCKED).outcome).toBe('locked');
    expect(classifyLoginResponse({ status: 429, body: '' }, LOCKED).outcome).toBe('locked');
    expect(classifyLoginResponse({ status: 500, body: '' }, LOCKED).outcome).toBe('error');
    expect(classifyLoginResponse({ status: 0, body: '' }, LOCKED).outcome).toBe('error');
  });

  it('200 sem token nem cookie é recusa', () => {
    expect(classifyLoginResponse({ status: 200, body: '{"erro":"credenciais"}' }, LOCKED).outcome).toBe('rejected');
  });
});

describe('hasSessionCookie', () => {
  it('cookie que só apaga não conta', () => {
    expect(hasSessionCookie({ 'set-cookie': 'suukie=; Max-Age=0' })).toBe(false);
    expect(hasSessionCookie({ 'set-cookie': 'tema=escuro' })).toBe(false);
  });
});

describe('compileLockedPattern', () => {
  it('regex inválida volta ao padrão', () => {
    expect(compileLockedPattern('(', 'bloque').test('Conta BLOQUEADA')).toBe(true);
  });
});

describe('detectExposure', () => {
  it('acha stack trace Java, senha, token, string de conexão e erro Oracle', () => {
    const body = `java.lang.NullPointerException: x\n\tat br.com.Foo.bar(Foo.java:42) senha=Segredo123 ${JWT} jdbc:oracle:thin:@//db:1521/XE ORA-00942`;
    expect(detectExposure({ body, secrets: ['Segredo123'] }).sort()).toEqual(['connection-string', 'password', 'sql-error', 'stack-trace', 'token']);
  });

  it('token em login bem-sucedido não é exposição; versão no cabeçalho é', () => {
    const found = detectExposure({ body: `{"accessToken":"${JWT}"}`, headers: { server: 'Jetty/9.4.51' }, secrets: [], allowToken: true });
    expect(found).toEqual(['server-version']);
  });

  it('erro limpo não expõe nada', () => {
    expect(detectExposure({ body: '{"message":"Usuário ou senha inválidos"}', secrets: ['Errada#1'] })).toEqual([]);
  });
});

describe('maskSecrets', () => {
  it('mascara senha, JWT e o valor do campo token e corta o texto', () => {
    const masked = maskSecrets(`{"accessToken":"${JWT}","senha":"Segredo123"}`, ['Segredo123']);
    expect(masked).not.toContain('Segredo123');
    expect(masked).not.toContain(JWT);
    expect(maskSecrets('x'.repeat(400), [], 10)).toBe(`${'x'.repeat(10)}…`);
  });
});

describe('evaluateLockDuration', () => {
  it('liberou entre 4min-10s e 4min+10s: passa e diz 4 min', () => {
    const v = evaluateLockDuration(
      [
        { offsetSeconds: 230, blocked: true },
        { offsetSeconds: 250, blocked: false }
      ],
      [4, 5],
      10
    );
    expect(v.status).toBe('passed');
    expect(v.summary).toContain('4 min');
  });

  it('liberou entre as sondas de 5 min: compatível com 5 min', () => {
    const v = evaluateLockDuration(
      [
        { offsetSeconds: 230, blocked: true },
        { offsetSeconds: 250, blocked: true },
        { offsetSeconds: 290, blocked: true },
        { offsetSeconds: 310, blocked: false }
      ],
      [4, 5],
      10
    );
    expect(v.summary).toContain('compatível com 5 min');
  });

  it('liberou antes da menor duração: falha', () => {
    expect(evaluateLockDuration([{ offsetSeconds: 120, blocked: false }], [4, 5], 10).status).toBe('failed');
  });

  it('continua bloqueada depois da maior duração: falha e avisa da renovação', () => {
    const v = evaluateLockDuration([{ offsetSeconds: 360, blocked: true }], [4, 5], 10);
    expect(v.status).toBe('failed');
    expect(v.summary).toContain('renovando');
  });
});

describe('interpretCountWindow', () => {
  const base = { windowSeconds: 60, threshold: 5 };
  it('sem bloqueio: janela fixa', () => {
    expect(interpretCountWindow({ ...base, blockedAtEnd: false, lockedRightAfterWindow: false }).summary).toContain('janela fixa');
  });
  it('bloqueio só no fim: janela deslizante', () => {
    expect(interpretCountWindow({ ...base, blockedAtEnd: true, lockedRightAfterWindow: false }).summary).toContain('deslizante');
  });
  it('bloqueio logo depois do limite: acumulada', () => {
    expect(interpretCountWindow({ ...base, blockedAtEnd: true, lockedRightAfterWindow: true }).summary).toContain('acumulada');
  });
});

describe('correlação de logs', () => {
  const lines = [
    '2026-10-29 10:00:01 WARN Falha de autenticação para o usuário TESTE_A',
    '2026-10-29 10:00:02 INFO usuário TESTE_A abriu a rotina 316',
    '2026-10-29 10:00:03 WARN Senha inválida: teste_a'
  ];
  it('conta só as linhas com o login e palavra de falha', () => {
    expect(countLoginFailureMentions(lines, 'TESTE_A')).toBe(2);
    expect(countLoginFailureMentions(lines, '')).toBe(0);
  });
  it('menos linhas que falhas reprova; nenhuma linha só avisa', () => {
    expect(evaluateMentions('log', 5, 5).status).toBe('passed');
    expect(evaluateMentions('log', 2, 5).status).toBe('failed');
    expect(evaluateMentions('log', 0, 5).status).toBe('warning');
  });
});

describe('worstStatus', () => {
  it('falha vence aviso, que vence ok', () => {
    expect(worstStatus(['passed', 'warning', 'failed'])).toBe('failed');
    expect(worstStatus(['passed', 'info'])).toBe('info');
    expect(worstStatus([])).toBe('skipped');
  });
});
