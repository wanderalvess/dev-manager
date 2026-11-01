import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
vi.mock('./security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));

const {
  KARAF_CONTAINER_CLIENT,
  buildDockerClientArgs,
  dockerKarafLabel,
  isDockerKaraf,
  karafDockerContainer,
  publishedKarafSshPort,
  stripSshPort
} = await import('./karafDockerUtils');

describe('karafDockerContainer / isDockerKaraf', () => {
  it('usa o container informado', () => {
    expect(karafDockerContainer({ karafDockerContainer: 'wta-develop' })).toBe('wta-develop');
  });

  it('sem container informado, usa o wta do ambiente ativo', () => {
    expect(karafDockerContainer({ activeEnvironment: '39' })).toBe('wta-39');
    expect(karafDockerContainer({ karafDockerContainer: '  ', activeEnvironment: 'suporte_38' })).toBe('wta-suporte_38');
  });

  it('o informado vence o ambiente ativo', () => {
    expect(karafDockerContainer({ karafDockerContainer: 'wta-master', activeEnvironment: '39' })).toBe('wta-master');
  });

  it('recusa nome com metacaracteres e fica vazio sem nada', () => {
    expect(karafDockerContainer({ karafDockerContainer: 'wta; rm -rf /' })).toBe('');
    expect(karafDockerContainer({ karafDockerContainer: '$(x)' })).toBe('');
    expect(karafDockerContainer({})).toBe('');
  });

  it('só é container quando o ambiente do Karaf é docker e há um nome seguro', () => {
    expect(isDockerKaraf({ karafEnvironment: 'docker', activeEnvironment: '39' })).toBe(true);
    expect(isDockerKaraf({ karafEnvironment: 'docker' })).toBe(false);
    expect(isDockerKaraf({ karafEnvironment: 'local', activeEnvironment: '39' })).toBe(false);
    expect(isDockerKaraf({ karafEnvironment: 'wsl', karafWslDistro: 'Ubuntu', activeEnvironment: '39' })).toBe(false);
  });
});

describe('stripSshPort', () => {
  it('tira o -a <porta> e mantém o resto', () => {
    expect(stripSshPort(['-u', 'karaf', '-p', 'karaf', '-a', '8187', 'bundle:list'])).toEqual(['-u', 'karaf', '-p', 'karaf', 'bundle:list']);
  });

  it('não mexe em quem não tem porta, nem num -a que faz parte do comando', () => {
    expect(stripSshPort(['-u', 'karaf', 'bundle:list'])).toEqual(['-u', 'karaf', 'bundle:list']);
    expect(stripSshPort(['-u', 'karaf', '-p', 'x', 'log:display', '-a', 'abc'])).toEqual(['-u', 'karaf', '-p', 'x', 'log:display', '-a', 'abc']);
  });
});

describe('buildDockerClientArgs', () => {
  it('roda o cliente do Karaf dentro do container pela distro, sem a porta do host', () => {
    expect(buildDockerClientArgs('ubuntu2604-winthor', 'wta-develop', ['-u', 'karaf', '-p', 'karaf', '-a', '8187', 'bundle:list'])).toEqual({
      command: 'wsl.exe',
      args: ['-d', 'ubuntu2604-winthor', '--', 'docker', 'exec', 'wta-develop', KARAF_CONTAINER_CLIENT, '-u', 'karaf', '-p', 'karaf', 'bundle:list']
    });
  });

  it('o cliente é o do Karaf do WTA (/opt/pcsist/produtos/winthor), o mesmo da instalação no Windows', () => {
    expect(KARAF_CONTAINER_CLIENT).toBe('/opt/pcsist/produtos/winthor/bin/client');
  });

  it('o rótulo mostrado no lugar do caminho do cliente', () => {
    expect(dockerKarafLabel('wta-39')).toBe('docker:wta-39');
  });
});

describe('publishedKarafSshPort', () => {
  // Sem retornar o mock: o vitest trataria a função devolvida como limpeza e a chamaria no fim do teste
  beforeEach(() => {
    execFileAsync.mockReset();
  });

  it('lê a porta do host publicada para o 8101 do container', async () => {
    execFileAsync.mockResolvedValue({ stdout: '0.0.0.0:8187\n[::]:8187\n' });
    expect(await publishedKarafSshPort('d', 'wta-a')).toBe(8187);
    expect(execFileAsync.mock.calls[0][1]).toEqual(['-d', 'd', '--', 'docker', 'port', 'wta-a', '8101']);
  });

  it('guarda por 15 s: cada comando do Karaf passa por aqui', async () => {
    execFileAsync.mockResolvedValue({ stdout: '0.0.0.0:8287\n' });
    await publishedKarafSshPort('d', 'wta-b');
    await publishedKarafSshPort('d', 'wta-b');
    expect(execFileAsync).toHaveBeenCalledTimes(1);
  });

  it('Docker travado ou container sem a porta: não dá porta, sem lançar erro', async () => {
    execFileAsync.mockRejectedValue(new Error('timeout'));
    expect(await publishedKarafSshPort('d', 'wta-c')).toBeUndefined();
  });
});
