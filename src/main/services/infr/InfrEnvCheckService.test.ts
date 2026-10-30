import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
const spawn = vi.fn(() => ({ on: vi.fn(), unref: vi.fn() }));
const httpRequest = vi.fn();
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));
vi.mock('child_process', async (orig) => ({ ...(await orig<object>()), spawn }));
vi.mock('../../utils/httpRequest', () => ({ httpRequest }));

const { InfrEnvCheckService } = await import('./InfrEnvCheckService');

describe('InfrEnvCheckService', () => {
  const service = new InfrEnvCheckService({ findDockerWslDistro: async () => 'ubuntu2604-winthor' } as any);
  beforeEach(() => {
    execFileAsync.mockReset();
    spawn.mockClear();
    httpRequest.mockReset();
  });

  it('lê os três containers numa chamada e confere o WTA pela porta publicada', async () => {
    execFileAsync.mockResolvedValue({
      stdout: '@@c oracle-a\nrunning|healthy|0|t|img\n@@ports\n@@logs\n@@c wta-a\nrunning||0|t|img\n@@ports\n8080/tcp -> 0.0.0.0:8087\n@@logs\n@@c wsh-a\nrunning||0|t|img\n@@ports\n@@logs\n'
    });
    httpRequest.mockResolvedValue({ status: 200 });
    const res = await service.check(undefined, 'a');
    expect(execFileAsync).toHaveBeenCalledTimes(1);
    expect(httpRequest).toHaveBeenCalledWith('http://localhost:8087/', expect.objectContaining({ method: 'GET' }));
    expect(res.summary?.status).toBe('ok');
  });

  it('nome inválido não roda nada', async () => {
    const res = await service.check(undefined, 'a; rm -rf /');
    expect(res.success).toBe(false);
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it('Executar monta o comando pelo id, com o ; escapado para o Windows Terminal', async () => {
    const res = await service.openCheckTerminal(undefined, 'a', 'logs-wta');
    expect(res.success).toBe(true);
    const args = (spawn.mock.calls[0] as any[])[1] as string[];
    expect(args.at(-1)).toBe("docker logs --tail 200 -f wta-a\\; echo ''\\; echo 'Pressione Enter para fechar...'\\; read -r");
    expect((await service.openCheckTerminal(undefined, 'a', 'rm' as any)).success).toBe(false);
  });
});
