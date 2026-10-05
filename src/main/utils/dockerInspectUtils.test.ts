import { describe, expect, it } from 'vitest';
import { buildContainerInspect, parseInspectMounts, parseInspectPorts, redactEnv } from './dockerInspectUtils';

describe('redactEnv', () => {
  it('mascara chaves sensíveis e preserva as demais', () => {
    expect(redactEnv(['ORACLE_PASSWORD=x', 'MY_API-KEY=y', 'db_pwd=z', 'PATH=/usr/bin', 'SEMIGUAL'])).toEqual([
      'ORACLE_PASSWORD=***REDACTED***',
      'MY_API-KEY=***REDACTED***',
      'db_pwd=***REDACTED***',
      'PATH=/usr/bin',
      'SEMIGUAL'
    ]);
  });

  it('retorna lista vazia quando não é array', () => {
    expect(redactEnv(undefined)).toEqual([]);
    expect(redactEnv(null)).toEqual([]);
  });
});

describe('parseInspectPorts / parseInspectMounts', () => {
  it('normaliza bindings de portas e portas não publicadas', () => {
    const ports = parseInspectPorts({
      NetworkSettings: { Ports: { '1521/tcp': [{ HostPort: '1521' }], '80/tcp': null } }
    });
    expect(ports).toEqual({ '1521/tcp': [{ hostIp: '0.0.0.0', hostPort: '1521' }], '80/tcp': null });
  });

  it('aplica padrões nos mounts', () => {
    expect(parseInspectMounts({ Mounts: [{ Destination: '/data' }] })).toEqual([
      { type: 'volume', name: undefined, source: '', destination: '/data', driver: undefined, mode: '', rw: true, propagation: undefined }
    ]);
    expect(parseInspectMounts({})).toEqual([]);
  });
});

describe('buildContainerInspect', () => {
  it('monta o modelo mínimo com padrões e remove a barra inicial do nome', () => {
    const result = buildContainerInspect({ Name: '/db', Config: { Cmd: ['a', 'b'], Env: ['TOKEN=1'] }, State: {} }, 'fallback-id');
    expect(result.id).toBe('fallback-id');
    expect(result.name).toBe('db');
    expect(result.command).toBe('a b');
    expect(result.env).toEqual(['TOKEN=***REDACTED***']);
    expect(result.state).toMatchObject({ status: 'unknown', running: false, exitCode: 0, health: undefined });
    expect(result.restartPolicy).toBeUndefined();
  });

  it('preserva health e restart policy quando presentes', () => {
    const result = buildContainerInspect(
      {
        Id: 'abc',
        State: { Running: true, Health: { Status: 'healthy', FailingStreak: 0 } },
        HostConfig: { RestartPolicy: { Name: '', MaximumRetryCount: 3 } }
      },
      'x'
    );
    expect(result.id).toBe('abc');
    expect(result.state.health).toEqual({ status: 'healthy', failingStreak: 0 });
    expect(result.restartPolicy).toEqual({ name: 'no', maximumRetryCount: 3 });
  });
});
