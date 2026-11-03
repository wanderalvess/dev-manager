import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commandFailureDetail } from '../../shared/infrNewVersionScripts';

const execFileAsync = vi.fn();
vi.mock('./security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));

const { decodeWslOutput, execWsl } = await import('./wslExec');

const utf16 = (s: string) => Buffer.from(s, 'utf16le');

describe('decodeWslOutput', () => {
  it('lê a mensagem do próprio wsl.exe (UTF-16) com os acentos', () => {
    const msg = 'Não há distribuição com o nome fornecido.\r\nCódigo de erro: Wsl/Service/WSL_E_DISTRO_NOT_FOUND\r\n';
    expect(decodeWslOutput(utf16(msg))).toBe(msg);
  });

  it('tira a marca de ordem de bytes do UTF-16', () => {
    expect(decodeWslOutput(Buffer.concat([Buffer.from([0xff, 0xfe]), utf16('Falha ao iniciar')]))).toBe('Falha ao iniciar');
  });

  it('o que o comando da distro imprime é UTF-8 e segue como está', () => {
    expect(decodeWslOutput(Buffer.from('Versão exigida 1.40.2.1\n', 'utf8'))).toBe('Versão exigida 1.40.2.1\n');
  });

  it('texto que já veio lido como UTF-8 perde os nulos, sem travar', () => {
    expect(decodeWslOutput('N\u0000�\u0000o\u0000')).toBe('N�o');
  });

  it('vazio e ausente viram texto vazio', () => {
    expect(decodeWslOutput(undefined)).toBe('');
    expect(decodeWslOutput(null)).toBe('');
    expect(decodeWslOutput(Buffer.alloc(0))).toBe('');
  });
});

describe('execWsl', () => {
  beforeEach(() => {
    execFileAsync.mockReset();
  });

  it('chama o wsl.exe pedindo a saída crua e devolve o texto decodificado', async () => {
    execFileAsync.mockResolvedValue({ stdout: Buffer.from('27.3.1\n'), stderr: Buffer.alloc(0) });
    expect(await execWsl(['-d', 'ubuntu', '--', 'docker', 'version'], { timeout: 5000 })).toEqual({ stdout: '27.3.1\n', stderr: '' });
    expect(execFileAsync).toHaveBeenCalledWith('wsl.exe', ['-d', 'ubuntu', '--', 'docker', 'version'], { timeout: 5000, windowsHide: true, encoding: 'buffer' });
  });

  it('o erro do wsl.exe chega legível ao commandFailureDetail, sem o texto embaralhado', async () => {
    const err: any = new Error('Command failed: wsl.exe -d x -- true\nN\u0000�\u0000o\u0000');
    err.code = 4294967295;
    err.stdout = utf16('Não há distribuição com o nome fornecido.\r\nCódigo de erro: Wsl/Service/WSL_E_DISTRO_NOT_FOUND\r\n');
    err.stderr = Buffer.alloc(0);
    execFileAsync.mockRejectedValue(err);
    const caught = await execWsl(['-d', 'x', '--', 'true'], { timeout: 5000 }).catch((e) => e);
    expect(caught.message).toBe('Command failed: wsl.exe -d x -- true');
    expect(commandFailureDetail(caught)).toBe('Não há distribuição com o nome fornecido. · Código de erro: Wsl/Service/WSL_E_DISTRO_NOT_FOUND');
  });

  it('falha sem saída nenhuma mantém a mensagem do Node', async () => {
    execFileAsync.mockRejectedValue(new Error('spawn wsl.exe ENOENT'));
    const caught = await execWsl(['--version'], { timeout: 1000 }).catch((e) => e);
    expect(commandFailureDetail(caught)).toBe('spawn wsl.exe ENOENT');
  });
});
