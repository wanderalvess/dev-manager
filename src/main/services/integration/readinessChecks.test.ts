import { describe, expect, it, vi } from 'vitest';
import { runPlannedCheck, type ReadinessDeps } from './readinessChecks';

const makeDeps = (overrides: Partial<ReadinessDeps> = {}): ReadinessDeps => ({
  getServiceState: vi.fn(async () => 'RUNNING' as const),
  isProcessRunning: vi.fn(async () => true),
  isPortOpen: vi.fn(async () => true),
  checkHealth: vi.fn(async (url: string) => ({ url, reachable: true, isHealthy: true, statusCode: 200, timeMs: 40, responseTimeMs: 40 })),
  testDb: vi.fn(async () => ({ success: true, message: 'ok', version: 'PostgreSQL 15' })),
  loginWinthor: vi.fn(async () => ({ success: true, accessToken: 'segredo-do-token', statusCode: 200, durationMs: 300 })),
  statLog: vi.fn(async () => ({ exists: true, modifiedAt: 1_700_000_000_000, sizeBytes: 4096 })),
  ...overrides
});

describe('runPlannedCheck', () => {
  it('serviço em execução é ok e parado é falha com o estado em português', async () => {
    const running = await runPlannedCheck({ kind: 'service', label: 'Serviço X', name: 'X' }, makeDeps());
    expect(running).toMatchObject({ label: 'Serviço X', status: 'ok', detail: 'em execução' });

    const stopped = await runPlannedCheck({ kind: 'service', label: 'Serviço X', name: 'X' }, makeDeps({ getServiceState: async () => 'STOPPED' }));
    expect(stopped).toMatchObject({ status: 'failed', detail: 'Serviço parado.' });

    const missing = await runPlannedCheck({ kind: 'service', label: 'Serviço X', name: 'X' }, makeDeps({ getServiceState: async () => 'NOT_INSTALLED' }));
    expect(missing.detail).toBe('Serviço não instalado.');
  });

  it('processo e porta', async () => {
    expect((await runPlannedCheck({ kind: 'process', label: 'P', name: 'pdv.exe' }, makeDeps())).status).toBe('ok');
    expect((await runPlannedCheck({ kind: 'process', label: 'P', name: 'pdv.exe' }, makeDeps({ isProcessRunning: async () => false }))).detail).toBe('Processo não encontrado.');
    const closed = await runPlannedCheck({ kind: 'port', label: 'Porta 9000', host: '127.0.0.1', port: 9000 }, makeDeps({ isPortOpen: async () => false }));
    expect(closed).toMatchObject({ status: 'failed', detail: 'Nada escutando em 127.0.0.1:9000.' });
  });

  it('health ok mostra status e latência; erro HTTP e falta de resposta viram falha', async () => {
    const good = await runPlannedCheck({ kind: 'health', label: 'Health HTTP', url: 'http://x/h' }, makeDeps());
    expect(good).toMatchObject({ status: 'ok', detail: 'HTTP 200 · 40 ms' });

    const bad = await runPlannedCheck(
      { kind: 'health', label: 'Health HTTP', url: 'http://x/h' },
      makeDeps({ checkHealth: async (url) => ({ url, reachable: false, isHealthy: false, statusCode: 503, statusText: 'Service Unavailable', timeMs: 5 }) })
    );
    expect(bad).toMatchObject({ status: 'failed', detail: 'HTTP 503 Service Unavailable' });

    const down = await runPlannedCheck(
      { kind: 'health', label: 'Health HTTP', url: 'http://x/h' },
      makeDeps({ checkHealth: async (url) => ({ url, reachable: false, timeMs: 5, error: 'ECONNREFUSED' }) })
    );
    expect(down.detail).toBe('ECONNREFUSED');
  });

  it('banco: conectado, recusado e conexão removida', async () => {
    expect(await runPlannedCheck({ kind: 'db', label: 'Banco', connectionId: 'a' }, makeDeps())).toMatchObject({ status: 'ok', detail: 'Conectado · PostgreSQL 15' });
    expect(await runPlannedCheck({ kind: 'db', label: 'Banco', connectionId: 'a' }, makeDeps({ testDb: async () => ({ success: false, message: 'senha inválida' }) }))).toMatchObject({ status: 'failed', detail: 'senha inválida' });
    expect((await runPlannedCheck({ kind: 'db', label: 'Banco', connectionId: 'a' }, makeDeps({ testDb: async () => null }))).detail).toContain('não encontrada');
  });

  it('login WinThor nunca expõe o token no resultado', async () => {
    const result = await runPlannedCheck({ kind: 'winthor-login', label: 'Login WinThor', url: 'http://x/login', user: 'u', password: 'p' }, makeDeps());
    expect(result).toMatchObject({ status: 'ok', detail: 'HTTP 200 · token obtido · 300 ms' });
    expect(JSON.stringify(result)).not.toContain('segredo-do-token');

    const denied = await runPlannedCheck(
      { kind: 'winthor-login', label: 'Login WinThor', url: 'http://x/login', user: 'u', password: 'p' },
      makeDeps({ loginWinthor: async () => ({ success: false, error: 'Usuário ou senha inválidos' }) })
    );
    expect(denied).toMatchObject({ status: 'failed', detail: 'Usuário ou senha inválidos' });
  });

  it('log existente é ok; inexistente é aviso, não falha', async () => {
    expect((await runPlannedCheck({ kind: 'log', label: 'Log', path: 'C:\\a.log' }, makeDeps())).status).toBe('ok');
    const missing = await runPlannedCheck({ kind: 'log', label: 'Log', path: 'C:\\a.log' }, makeDeps({ statLog: async () => ({ exists: false }) }));
    expect(missing.status).toBe('skipped');
  });

  it('verificação estática devolve o que o plano já decidiu', async () => {
    expect(await runPlannedCheck({ kind: 'static', label: 'URL base', status: 'failed', detail: 'inválida' }, makeDeps())).toMatchObject({ status: 'failed', detail: 'inválida' });
  });

  it('exceção vira falha e estouro de tempo não trava o pré-voo', async () => {
    const thrown = await runPlannedCheck({ kind: 'port', label: 'P', host: 'h', port: 1 }, makeDeps({ isPortOpen: async () => { throw new Error('boom'); } }));
    expect(thrown).toMatchObject({ status: 'failed', detail: 'boom' });

    const slow = await runPlannedCheck({ kind: 'port', label: 'P', host: 'h', port: 1 }, makeDeps({ isPortOpen: () => new Promise(() => undefined) }), 20);
    expect(slow.status).toBe('failed');
    expect(slow.detail).toContain('Tempo esgotado');
    expect(slow.durationMs).toBeGreaterThanOrEqual(0);
  });
});
