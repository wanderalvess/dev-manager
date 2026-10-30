import fs from 'fs';
import type http from 'http';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthLockoutCheckId, AuthLockoutRunResult } from '../../shared/authLockoutTypes';
import { AuthLockoutTestService } from './AuthLockoutTestService';
import type { ConfigService } from './ConfigService';
import { ScenarioHistoryService } from './ScenarioHistoryService';
import { LockoutRun } from './authLockout/lockoutRun';
import { startFakeWta, type FakeWtaOptions } from './authLockout/lockoutFakeWta';

const FAST_CHECKS: AuthLockoutCheckId[] = [
  'threshold',
  'correct-password-while-locked',
  'client-switch',
  'logoff-bypass',
  'per-user',
  'concurrency',
  'api-exceptions',
  'error-exposure',
  'log-correlation',
  'log-sink-failure'
];

let dir: string;
const getConfigFilePath = () => path.join(dir, 'config.json');
let server: http.Server | undefined;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lockout-'));
  fs.mkdirSync(path.join(dir, 'data', 'log'), { recursive: true });
  // A espera pela janela não importa aqui: o WTA falso zera a contagem no login certo
  vi.spyOn(LockoutRun.prototype, 'sleep').mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
  server?.close();
  server = undefined;
  fs.rmSync(dir, { recursive: true, force: true });
});

async function runAgainst(options: FakeWtaOptions, checks = FAST_CHECKS): Promise<AuthLockoutRunResult> {
  const logFile = path.join(dir, 'data', 'log', 'winthor.log');
  fs.writeFileSync(logFile, 'INFO linha antiga do log, antes da execução\n');
  const fake = await startFakeWta(logFile, options);
  server = fake.server;
  const configService = {
    getConfigFilePath,
    getSettings: () => ({ wtaUrl: fake.url, karafPath: dir, wtaLogin: 'ADMIN', wtaPassword: 'admin123' })
  } as unknown as ConfigService;
  const service = new AuthLockoutTestService(configService);
  return service.run({
    userA: { login: 'TESTE_A', password: 'senhaA' },
    userB: { login: 'TESTE_B', password: 'senhaB' },
    checks
  });
}

const statusOf = (result: AuthLockoutRunResult) => Object.fromEntries(result.checks.map((c) => [c.id, c.status]));

describe('AuthLockoutTestService contra um WTA falso', () => {
  it('servidor correto: as checagens rápidas passam e a de destino de logs fica manual', async () => {
    const result = await runAgainst({});
    expect(result.success).toBe(true);
    expect(statusOf(result)).toMatchObject({
      threshold: 'passed',
      'correct-password-while-locked': 'passed',
      'client-switch': 'passed',
      'logoff-bypass': 'passed',
      'per-user': 'passed',
      concurrency: 'passed',
      'api-exceptions': 'passed',
      'error-exposure': 'passed',
      'log-correlation': 'passed',
      'log-sink-failure': 'manual',
      'lock-duration': 'skipped',
      'count-window': 'skipped'
    });
    expect(result.markdown).toContain('Limiar de bloqueio');
    // Passo a passo: cada checagem abre explicada, cada tentativa diz o esperado e o fim traz o placar
    const messages = result.log.map((l) => l.message);
    expect(messages).toContain('▶ Limiar de bloqueio');
    expect(result.log.find((l) => l.message === '▶ Limiar de bloqueio')?.detail).toContain('Erra a senha de TESTE_A 4 vezes');
    expect(messages.some((m) => m.includes('senha certa após 5 falhas') && m.includes('esperado: recusar ✔'))).toBe(true);
    expect(result.log.filter((l) => l.level === 'attempt' && l.asExpected === false)).toEqual([]);
    expect(messages.some((m) => m.startsWith('■ Fim do teste'))).toBe(true);
    expect(result.checks.find((c) => c.id === 'threshold')?.plan).toContain('TESTE_A');
    expect(result.markdown).toContain('_Como foi testado:_');
    expect(result.markdown).toContain('### Passo a passo');
    // Nenhuma senha nem token sai no resultado
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('senhaA');
    expect(serialized).not.toContain('admin123');
    expect(serialized).not.toMatch(/assinatura\d+xyz/);
    // A execução entra no histórico, também sem senha
    const runs = await new ScenarioHistoryService({ getConfigFilePath }).list('auth-lockout');
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ kind: 'auth-lockout', name: 'Bloqueio de Login (TESTE_A, TESTE_B)', verdict: 'warning' });
    expect(fs.readFileSync(path.join(dir, 'scenario-runs', `${runs[0].id}.json`), 'utf-8')).not.toContain('senhaA');
  });

  it('bloqueio por origem reprova o bloqueio por usuário, mesmo com o logoff limpando o bloqueio', async () => {
    const result = await runAgainst({ lockScope: 'origin', logoffClears: true }, ['threshold', 'logoff-bypass', 'per-user']);
    expect(statusOf(result)).toMatchObject({ threshold: 'passed', 'logoff-bypass': 'failed', 'per-user': 'failed' });
  });

  it('logoff que limpa o bloqueio rebloqueia A antes de medir a duração', async () => {
    const failTimes = vi.spyOn(LockoutRun.prototype, 'failTimes');
    const result = await runAgainst({ logoffClears: true }, ['logoff-bypass', 'lock-duration']);
    expect(statusOf(result)['logoff-bypass']).toBe('failed');
    // Um bloqueio para o logoff e outro depois que ele limpou
    expect(failTimes).toHaveBeenCalledTimes(2);
  });

  it('log com a senha digitada e API de logs aberta reprovam a correlação de logs', async () => {
    const result = await runAgainst({ logsPassword: true, openLogs: true }, ['threshold', 'log-correlation']);
    const check = result.checks.find((c) => c.id === 'log-correlation')!;
    expect(check.status).toBe('failed');
    expect(check.summary).toContain('sem autenticação');
    expect(check.summary).toContain('segredo');
  });

  it('usuário A com senha errada interrompe antes de qualquer falha', async () => {
    const logFile = path.join(dir, 'data', 'log', 'winthor.log');
    fs.writeFileSync(logFile, '');
    const fake = await startFakeWta(logFile);
    server = fake.server;
    const service = new AuthLockoutTestService({ getConfigFilePath, getSettings: () => ({ wtaUrl: fake.url }) } as unknown as ConfigService);
    const result = await service.run({ userA: { login: 'TESTE_A', password: 'errada' }, checks: ['threshold'] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('não entrou');
    // A resposta do WTA vai junto para a pessoa saber se é senha errada ou conta bloqueada
    expect(result.error).toContain('HTTP 401, resposta do WTA: {"message":"Usuário ou senha inválidos"}');
    expect(result.error).toContain('Confira login e senha');
    expect(result.attempts).toHaveLength(1);
  });

  it('senha em texto puro é recusada pelo WTA, que só aceita o MD5', async () => {
    const logFile = path.join(dir, 'data', 'log', 'winthor.log');
    fs.writeFileSync(logFile, '');
    const fake = await startFakeWta(logFile);
    server = fake.server;
    const service = new AuthLockoutTestService({ getConfigFilePath, getSettings: () => ({ wtaUrl: fake.url }) } as unknown as ConfigService);
    const plain = await service.run({ userA: { login: 'TESTE_A', password: 'senhaA' }, passwordEncoding: 'plain', checks: ['threshold'] });
    expect(plain.error).toContain('HTTP 401');
  });

  it('recusa uma segunda execução enquanto a primeira roda', async () => {
    const logFile = path.join(dir, 'data', 'log', 'winthor.log');
    fs.writeFileSync(logFile, '');
    const fake = await startFakeWta(logFile);
    server = fake.server;
    const service = new AuthLockoutTestService({ getConfigFilePath, getSettings: () => ({ wtaUrl: fake.url }) } as unknown as ConfigService);
    const first = service.run({ userA: { login: 'TESTE_A', password: 'senhaA' }, checks: ['api-exceptions'] });
    const second = await service.run({ userA: { login: 'TESTE_A', password: 'senhaA' } });
    expect(second.error).toContain('em execução');
    expect((await first).success).toBe(true);
  });
});

describe('checagens de tempo, com relógio virtual', () => {
  beforeEach(() => {
    // Só o Date é falso: o servidor HTTP continua com timers reais, e cada espera do teste avança o relógio
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.spyOn(LockoutRun.prototype, 'sleep').mockImplementation(async (ms: number) => {
      vi.setSystemTime(Date.now() + Math.max(0, ms));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mede a duração do bloqueio entre as sondas de 4 min', async () => {
    const result = await runAgainst({ lockMinutes: 4 }, ['threshold', 'lock-duration']);
    const check = result.checks.find((c) => c.id === 'lock-duration')!;
    expect(check.status).toBe('passed');
    expect(check.summary).toContain('compatível com 4 min');
  });

  it('bloqueio de 5 min também é reconhecido', async () => {
    const check = (await runAgainst({ lockMinutes: 5 }, ['threshold', 'lock-duration'])).checks.find((c) => c.id === 'lock-duration')!;
    expect(check.summary).toContain('compatível com 5 min');
  });

  it('janela deslizante bloqueia no fim da sequência', async () => {
    const check = (await runAgainst({ windowMode: 'sliding' }, ['count-window'])).checks.find((c) => c.id === 'count-window')!;
    expect(check.status).toBe('info');
    expect(check.summary).toContain('deslizante');
  });

  it('janela fixa a partir da primeira falha não bloqueia', async () => {
    const check = (await runAgainst({ windowMode: 'fixed' }, ['count-window'])).checks.find((c) => c.id === 'count-window')!;
    expect(check.summary).toContain('janela fixa');
  });
});
