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
    expect(execFileAsync).toHaveBeenCalledTimes(2); // containers e o log do build
    expect(httpRequest).toHaveBeenCalledWith('http://localhost:8087/', expect.objectContaining({ method: 'GET' }));
    expect(res.summary?.status).toBe('ok');
  });

  // O roteiro do log vai em base64 (o wsl.exe expande o $): o fake enxerga o texto decodificado
  const scriptOf = (arg: string) => {
    const b64 = /^echo (\S+) \| base64 -d/.exec(arg)?.[1];
    return b64 ? Buffer.from(b64, 'base64').toString() : arg;
  };
  const NO_CONTAINERS = '@@c oracle-a\nMISSING\n@@ports\n@@logs\n@@c wta-a\nMISSING\n@@c wsh-a\nMISSING\n';

  it('sem container e com o log do build falhando, o resumo é a causa do build', async () => {
    execFileAsync.mockImplementation(async (_c: string, args: string[]) => {
      const script = scriptOf(args.at(-1) as string);
      if (script.includes('hub-nova-versao-a.log')) return { stdout: '@@tail\n==> Montando a imagem\nError executing command: Unable to resolve root: missing requirement [root] x\n@@causa\n@@erros\n0\n@@falhas\n' };
      return { stdout: NO_CONTAINERS };
    });
    const res = await service.check(undefined, 'a');
    expect(res.summary).toMatchObject({ status: 'fail', title: 'O build falhou antes de criar os containers' });
    expect(res.summary?.detail).toContain('Unable to resolve root');
    expect(res.buildLog?.path).toBe('/tmp/hub-nova-versao-a.log');
  });

  it('o resumo traz a primeira falha de resolução do arquivo inteiro, não o sintoma do fim do log', async () => {
    const cause =
      '#8 100.1 [09:00:01] [ERRO] winthor-hub-carga-dados/1.39.6.1: Error executing command: Unable to resolve root: missing requirement [root] osgi.identity; osgi.identity=winthor-hub-carga-dados; type=karaf.feature; version="[1.39.6.1,1.39.6.1]"; filter:="(&(osgi.identity=winthor-hub-carga-dados)(type=karaf.feature)(version>=1.39.6.1)(version<=1.39.6.1))" [caused by: Unable to resolve winthor-hub-carga-dados/1.39.6.1: missing requirement [winthor-hub-carga-dados] osgi.wiring.package; (&(osgi.wiring.package=br.com.pcsist.winthor.core.data)(version>=1.40.0)(!(version>=2.0.0)))]';
    execFileAsync.mockImplementation(async (_c: string, args: string[]) => {
      const script = scriptOf(args.at(-1) as string);
      if (script.includes('hub-nova-versao-a.log')) {
        return { stdout: `@@tail\n#8 444.2 [09:04:02] [ERRO] winthor-integracao-2650/1.40.1.2: nao ficou instalada\n@@causa\n${cause}\n@@erros\n151\n@@falhas\n#8 441.0 [09:04:00] 151 falha(s) ao aplicar /opt/winthor-version.features\n` };
      }
      return { stdout: NO_CONTAINERS };
    });
    const res = await service.check(undefined, 'a');
    const d = res.summary?.detail ?? '';
    expect(d).toContain('Não resolveu feature winthor-hub-carga-dados na versão [1.39.6.1,1.39.6.1]');
    expect(d).toContain('151 falhas no log, mas só a primeira é a causa');
    expect(d).not.toMatch(/…|Unable to resolve w$/);
    expect(res.buildLog?.cause?.requirements).toContain('pacote br.com.pcsist.winthor.core.data em [1.40.0, 2.0.0)');
  });

  it('o roteiro do log não leva $ nem aspas soltas para o wsl.exe: vai em base64 e só olha o arquivo do ambiente', async () => {
    execFileAsync.mockImplementation(async (_c: string, args: string[]) => ((args.at(-1) as string).includes('base64') ? { stdout: '@@semlog\n' } : { stdout: NO_CONTAINERS }));
    await service.check(undefined, 'a');
    const raw = execFileAsync.mock.calls.map((c) => c[1].at(-1) as string).find((s) => s.includes('base64')) ?? '';
    expect(raw).not.toContain('$');
    expect(scriptOf(raw)).toContain("f='/tmp/hub-nova-versao-a.log'");
  });

  it('sem arquivo de log do build, não inventa relatório', async () => {
    execFileAsync.mockImplementation(async (_c: string, args: string[]) => (scriptOf(args.at(-1) as string).includes('hub-nova-versao') ? { stdout: '@@semlog\n' } : { stdout: '' }));
    expect((await service.check(undefined, 'a')).buildLog).toBeUndefined();
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
