import { describe, expect, it } from 'vitest';
import { findNetstatListeningPid } from './network';

describe('findNetstatListeningPid', () => {
  it('retorna o PID da linha LISTENING mesmo quando há linhas TIME_WAIT ou ESTABLISHED antes', () => {
    const lines = [
      '  TCP    127.0.0.1:8889         127.0.0.1:51920        TIME_WAIT       0',
      '  TCP    127.0.0.1:8889         127.0.0.1:51921        ESTABLISHED     4321',
      '  TCP    0.0.0.0:8889           0.0.0.0:0              LISTENING       9876'
    ];
    expect(findNetstatListeningPid(lines, 8889)).toBe('9876');
  });

  it('retorna undefined quando a porta aparece apenas em TIME_WAIT sem LISTENING', () => {
    const lines = [
      '  TCP    127.0.0.1:5005         127.0.0.1:51920        TIME_WAIT       0',
      '  TCP    0.0.0.0:8889           0.0.0.0:0              LISTENING       1111'
    ];
    expect(findNetstatListeningPid(lines, 5005)).toBeUndefined();
  });

  it('não confunde prefixos de porta como :80 com :8080', () => {
    const lines = [
      '  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       2222',
      '  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       3333'
    ];
    expect(findNetstatListeningPid(lines, 80)).toBe('3333');
    expect(findNetstatListeningPid(lines, 8080)).toBe('2222');
  });

  it('suporta separadores \\t e \\r do netstat no Windows', () => {
    const lines = ['  TCP    [::]:1521\t[::]:0\tLISTENING\t4455\r'];
    expect(findNetstatListeningPid(lines, 1521)).toBe('4455');
  });
});
