import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileSync = vi.fn();
vi.mock('child_process', async (importOriginal) => ({ ...(await importOriginal<typeof import('child_process')>()), execFileSync }));

const { parseExcludedPortRanges, parseListeningPorts, pickFreeDebugPort } = await import('./karafDebugPort');

const EXCLUDED = `
Protocolo tcp Intervalos de Exclusão de Porta

Porta Inicial    Porta Final
----------    --------
      2869        2869
      5000        5010
     50000       50059     *
`;

const NETSTAT = `
Conexões ativas

  Proto  Endereço local          Endereço externo        Estado           PID
  TCP    0.0.0.0:135            0.0.0.0:0               LISTENING       1020
  TCP    [::]:5005              [::]:0                  LISTENING       4321
  TCP    127.0.0.1:8101         0.0.0.0:0               ESCUTANDO       777
  TCP    127.0.0.1:50321        127.0.0.1:5005          ESTABLISHED     999
`;

function mockSystem(excluded: string, netstat: string, tasklist = '"java.exe","4321","Console","1","200.000 K"') {
  execFileSync.mockImplementation((cmd: string) => {
    if (cmd === 'netsh.exe') return excluded;
    if (cmd === 'netstat.exe') return netstat;
    if (cmd === 'tasklist.exe') return tasklist;
    throw new Error(`comando inesperado ${cmd}`);
  });
}

beforeEach(() => {
  execFileSync.mockReset();
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
});

describe('parse das saídas do Windows', () => {
  it('lê os intervalos reservados, inclusive os administrados (*)', () => {
    expect(parseExcludedPortRanges(EXCLUDED)).toEqual([[2869, 2869], [5000, 5010], [50000, 50059]]);
  });

  it('lê só portas em LISTENING/ESCUTANDO (IPv4 e IPv6) com o PID, ignorando conexões estabelecidas', () => {
    const ports = parseListeningPorts(NETSTAT);
    expect(ports.get(135)).toBe(1020);
    expect(ports.get(5005)).toBe(4321);
    expect(ports.get(8101)).toBe(777);
    expect(ports.has(50321)).toBe(false);
  });
});

describe('pickFreeDebugPort', () => {
  it('mantém a porta quando está livre', () => {
    mockSystem(EXCLUDED, NETSTAT);
    expect(pickFreeDebugPort(5100)).toEqual({ port: 5100 });
  });

  it('porta em uso: devolve a próxima livre, o PID e o nome do processo', () => {
    mockSystem('', NETSTAT);
    expect(pickFreeDebugPort(5005)).toEqual({ port: 5006, reason: 'in-use', owner: { pid: 4321, name: 'java.exe' } });
  });

  it('porta reservada pelo Windows: pula o intervalo inteiro e informa o motivo', () => {
    mockSystem(EXCLUDED, '');
    expect(pickFreeDebugPort(5005)).toEqual({ port: 5011, reason: 'reserved', owner: undefined });
  });

  it('sem conseguir ler o sistema, mantém a porta configurada', () => {
    execFileSync.mockImplementation(() => {
      throw new Error('falhou');
    });
    expect(pickFreeDebugPort(5005)).toEqual({ port: 5005 });
  });

  it('fora do Windows não consulta nada', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    expect(pickFreeDebugPort(5005)).toEqual({ port: 5005 });
    expect(execFileSync).not.toHaveBeenCalled();
  });
});
