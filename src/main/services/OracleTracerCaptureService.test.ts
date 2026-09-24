import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OracleTracerCaptureService } from './OracleTracerCaptureService';
import { DatabaseConnectionConfig, OracleActiveSession, OracleRecentStatement } from '../../shared/types';

const ORACLE_CONFIG: DatabaseConnectionConfig = {
  id: 'conn-1',
  name: 'Oracle Test',
  type: 'oracle',
  host: 'localhost',
  port: 1521,
  database: 'XEPDB1',
  user: 'system'
};

function makeSession(overrides: Partial<OracleActiveSession> = {}): OracleActiveSession {
  return {
    sid: 1,
    serialNum: 100,
    username: 'APP_USER',
    program: 'JDBC Thin Client',
    machine: 'karaf-host',
    module: null,
    action: null,
    clientIdentifier: null,
    status: 'ACTIVE',
    lastCallEt: 0,
    sqlId: 'sql-a',
    sqlText: 'SELECT 1 FROM DUAL',
    ...overrides
  };
}

function makeStatement(overrides: Partial<OracleRecentStatement> = {}): OracleRecentStatement {
  return {
    sqlId: 'sql-a',
    sqlText: 'SELECT 1 FROM DUAL',
    parsingSchemaName: 'APP_USER',
    module: null,
    action: null,
    executions: 1,
    firstLoadTime: '2026-09-24 10:00:00',
    lastActiveTime: '2026-09-24 10:00:00',
    ...overrides
  };
}

describe('OracleTracerCaptureService', () => {
  let databaseService: {
    getOracleActiveSessions: ReturnType<typeof vi.fn>;
    getOracleRecentStatements: ReturnType<typeof vi.fn>;
  };
  let service: OracleTracerCaptureService;

  beforeEach(() => {
    vi.useFakeTimers();
    databaseService = {
      getOracleActiveSessions: vi.fn().mockResolvedValue({ success: true, sessions: [], executionTimeMs: 1 }),
      getOracleRecentStatements: vi.fn().mockResolvedValue({ success: true, statements: [], executionTimeMs: 1 })
    };
    service = new OracleTracerCaptureService(databaseService as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recusa iniciar captura para conexões não-Oracle', () => {
    expect(() => service.startCapture({ ...ORACLE_CONFIG, type: 'postgres' }, { intervalMs: 5000 })).toThrow(
      /apenas para conexões Oracle/
    );
  });

  it('aplica o piso mínimo de intervalo mesmo se um valor menor for pedido', async () => {
    const state = service.startCapture(ORACLE_CONFIG, { intervalMs: 100 });
    expect(state.intervalMs).toBe(2000);
    await vi.advanceTimersByTimeAsync(0);
  });

  it('faz uma consulta imediata ao iniciar, sem esperar o primeiro intervalo', async () => {
    service.startCapture(ORACLE_CONFIG, { intervalMs: 5000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(databaseService.getOracleActiveSessions).toHaveBeenCalledTimes(1);
    expect(databaseService.getOracleRecentStatements).toHaveBeenCalledTimes(1);
  });

  it('deduplica instruções por SQL_ID, mantendo a versão mais recente', async () => {
    databaseService.getOracleRecentStatements
      .mockResolvedValueOnce({ success: true, statements: [makeStatement({ executions: 1 })], executionTimeMs: 1 })
      .mockResolvedValueOnce({ success: true, statements: [makeStatement({ executions: 5 })], executionTimeMs: 1 });

    service.startCapture(ORACLE_CONFIG, { intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);

    const state = service.getCaptureState(ORACLE_CONFIG.id);
    expect(state.statements).toHaveLength(1);
    expect(state.statements[0].executions).toBe(5);
  });

  it('só registra um novo evento na linha do tempo quando o SQL_ID da sessão muda', async () => {
    databaseService.getOracleActiveSessions
      .mockResolvedValueOnce({ success: true, sessions: [makeSession({ sqlId: 'sql-a' })], executionTimeMs: 1 })
      .mockResolvedValueOnce({ success: true, sessions: [makeSession({ sqlId: 'sql-a' })], executionTimeMs: 1 })
      .mockResolvedValueOnce({ success: true, sessions: [makeSession({ sqlId: 'sql-b' })], executionTimeMs: 1 });

    service.startCapture(ORACLE_CONFIG, { intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);

    const state = service.getCaptureState(ORACLE_CONFIG.id);
    expect(state.sessionEvents).toHaveLength(2);
    expect(state.sessionEvents[0].sqlId).toBe('sql-b');
    expect(state.sessionEvents[1].sqlId).toBe('sql-a');
  });

  it('para a captura mas mantém os dados já coletados', async () => {
    databaseService.getOracleRecentStatements.mockResolvedValue({
      success: true,
      statements: [makeStatement()],
      executionTimeMs: 1
    });

    service.startCapture(ORACLE_CONFIG, { intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);

    const stopped = service.stopCapture(ORACLE_CONFIG.id);
    expect(stopped.isCapturing).toBe(false);
    expect(stopped.statements).toHaveLength(1);

    const pollsBeforeAdvance = databaseService.getOracleRecentStatements.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(databaseService.getOracleRecentStatements.mock.calls.length).toBe(pollsBeforeAdvance);
  });

  it('limpa todos os dados e reseta o estado da conexão', async () => {
    databaseService.getOracleRecentStatements.mockResolvedValue({
      success: true,
      statements: [makeStatement()],
      executionTimeMs: 1
    });
    service.startCapture(ORACLE_CONFIG, { intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);

    const cleared = service.clearCapture(ORACLE_CONFIG.id);
    expect(cleared.isCapturing).toBe(false);
    expect(cleared.statements).toEqual([]);
    expect(cleared.pollCount).toBe(0);
  });

  it('reporta erro da consulta sem derrubar a captura', async () => {
    databaseService.getOracleRecentStatements.mockResolvedValue({
      success: false,
      statements: [],
      executionTimeMs: 1,
      error: 'ORA-00942: table or view does not exist'
    });

    service.startCapture(ORACLE_CONFIG, { intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);

    const state = service.getCaptureState(ORACLE_CONFIG.id);
    expect(state.isCapturing).toBe(true);
    expect(state.lastError).toContain('ORA-00942');
  });

  it('retorna estado vazio para uma conexão que nunca foi capturada', () => {
    const state = service.getCaptureState('never-started');
    expect(state).toEqual({
      isCapturing: false,
      startedAt: null,
      intervalMs: 0,
      pollCount: 0,
      lastPolledAt: null,
      lastError: null,
      statements: [],
      sessionEvents: []
    });
  });
});
