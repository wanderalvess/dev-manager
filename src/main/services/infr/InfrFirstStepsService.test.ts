import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
const httpRequest = vi.fn();
const spawn = vi.fn((..._args: unknown[]) => ({ on: vi.fn(), unref: vi.fn() }));
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));
vi.mock('../../utils/httpRequest', () => ({ httpRequest }));
vi.mock('child_process', async (orig) => ({ ...(await orig<object>()), spawn }));

const { InfrFirstStepsService, parseWslVersion } = await import('./InfrFirstStepsService');
const { InfrFirstStepsActions } = await import('./InfrFirstStepsActions');

/** Responde cada execFile pelo comando: wsl --version, git, git rev-parse e o script da distro. */
function answer(map: { wslVersion?: string | Error; git?: boolean; branch?: string; distro?: string }) {
  execFileAsync.mockImplementation(async (cmd: string, args: string[]) => {
    if (cmd === 'wsl.exe' && args[0] === '--version') {
      if (map.wslVersion instanceof Error || map.wslVersion === undefined) throw map.wslVersion ?? new Error('não instalado');
      return { stdout: Buffer.from(map.wslVersion, 'utf16le') };
    }
    if (cmd === 'git' && args[0] === '--version') {
      if (!map.git) throw new Error('ENOENT');
      return { stdout: 'git version 2.47' };
    }
    if (cmd === 'git') return { stdout: `${map.branch ?? 'main'}\n` };
    if (cmd === 'wsl.exe') return { stdout: map.distro ?? '' };
    throw new Error(`inesperado: ${cmd}`);
  });
}

describe('InfrFirstStepsService', () => {
  let dir: string;
  const testWtaLogin = vi.fn();
  let distros: string[];
  const service = () =>
    new InfrFirstStepsService(
      { listDistros: async () => distros.map((name) => ({ name, state: 'Running', version: 2, isDefault: false })), resolveInfrPaths: () => ({ windows: dir, wsl: '/mnt/c/x' }) } as any,
      { testWtaLogin } as any
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-fs-'));
    distros = [];
    execFileAsync.mockReset();
    httpRequest.mockReset();
    testWtaLogin.mockReset();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('lê a versão do wsl --version em UTF-16LE, em português ou inglês', () => {
    expect(parseWslVersion(Buffer.from('Versão do WSL: 2.4.13.0\r\nVersão do kernel: 5.15', 'utf16le'))).toBe('2.4.13');
    expect(parseWslVersion('WSL version: 2.1.5.0')).toBe('2.1.5');
  });

  it('máquina zerada: sem WSL, sem distro e sem o clone', async () => {
    fs.rmSync(dir, { recursive: true, force: true });
    answer({ git: true });
    const res = await service().check({ version: '39' });
    expect(res.success).toBe(true);
    expect(res.steps.map((s) => s.status)).toEqual(['fail', 'blocked', 'blocked', 'fail', 'blocked', 'blocked', 'blocked', 'blocked']);
    // Sem distro, nada roda dentro do WSL além do --version
    expect(execFileAsync.mock.calls.filter(([c, a]) => c === 'wsl.exe' && a[0] === '-d')).toHaveLength(0);
  });

  it('WSL antigo sem --version, mas com a distro: conta como instalado', async () => {
    distros = ['ubuntu2604-winthor'];
    answer({ git: true, distro: '' });
    const res = await service().check({ version: '39' });
    expect(res.steps[0].status).toBe('ok');
    expect(res.steps[1].status).toBe('ok');
    expect(res.steps[2].status).toBe('fail');
  });

  it('distro com Docker, clone no branch certo e o WTA no ar: confere o login na porta publicada', async () => {
    distros = ['Ubuntu', 'ubuntu2604-winthor'];
    fs.mkdirSync(path.join(dir, '.git'));
    for (const f of ['oracle-winthor/oracle_setup.sh', 'linux-winthor/scripts/wta_setup.sh', 'linux-winthor/scripts/build_version.sh', 'linux-winthor/scripts/export_features.sh', 'linux-winthor/scripts/new_version_env.sh', 'wsh-winthor/wsh_setup.sh', 'linux-winthor/utils/pcsist.tar.gz', 'linux-winthor/wta.env.39']) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), '');
    }
    const distro = ['27.3.1', 'yes', 'loja.dmp', 'yes', 'winthor-integracao-core.jar', 'oracle|running\nwta|running\nwsh|', '0.0.0.0:8039'].join('\n@@\n');
    answer({ wslVersion: 'WSL version: 2.4.13.0', git: true, branch: 'feature/imagem-por-versao', distro });
    httpRequest.mockResolvedValue({ status: 200 });
    testWtaLogin.mockResolvedValue({ ok: false, error: 'HTTP 401' });

    const res = await service().check({ version: '39' });
    expect(res.probe?.distro).toBe('ubuntu2604-winthor');
    expect(res.probe?.envFiles).toEqual({ wta: true, wsh: false });
    expect(testWtaLogin).toHaveBeenCalledWith('http://localhost:8039');
    expect(res.steps.map((s) => s.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'waiting', 'blocked']);
    const script = execFileAsync.mock.calls.find(([c, a]) => c === 'wsl.exe' && a[0] === '-d')?.[1][5] as string;
    expect(script).toContain('timeout 8 docker port wta-39 8080');
    expect(script).toContain('[ -n "$V" ]');
  });

  it('recusa versão e distro inválidas sem rodar nada', async () => {
    expect((await service().check({ version: '3;9' })).success).toBe(false);
    expect((await service().check({ version: '39', distro: 'a;b' })).success).toBe(false);
    expect(execFileAsync).not.toHaveBeenCalled();
  });
});

describe('InfrFirstStepsActions', () => {
  let dir: string;
  const actions = () => new InfrFirstStepsActions({ resolveInfrPaths: () => ({ windows: dir, wsl: '/mnt/c/x' }), findDockerWslDistro: async () => 'ubuntu2604-winthor' } as any);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-act-'));
    spawn.mockClear();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('cria o wta.env da versão a partir do modelo, sem sobrescrever', async () => {
    fs.mkdirSync(path.join(dir, 'linux-winthor', 'common'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'linux-winthor/common/wta.env.example'), 'DB_HOST=oracle-master\nDB_PASSWORD=\n');
    const first = await actions().run({ id: 'create-env', version: '39', which: 'wta' });
    expect(first.success).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'linux-winthor/wta.env.39'), 'utf8')).toBe('DB_HOST=oracle-39\nDB_PASSWORD=\n');
    const again = await actions().run({ id: 'create-env', version: '39', which: 'wta' });
    expect(again.success).toBe(false);
    expect(again.output).toContain('não sobrescreve');
  });

  it('import do dump: valida antes e a senha fica no terminal', async () => {
    const bad = await actions().run({ id: 'import-dump', dump: { version: '39', file: 'x.dmp', schema: 'A;B', codclipc: '1' } });
    expect(bad.success).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    const ok = await actions().run({ id: 'import-dump', dump: { version: '39', file: 'loja.dmp', schema: 'local', codclipc: '9999' } });
    expect(ok.success).toBe(true);
    const args = spawn.mock.calls[0][1] as string[];
    expect(args.join(' ')).toContain('read -r -s -p');
    expect(args.join(' ')).not.toContain('pcinfo"');
  });

  it('clone recusa uma pasta que já existe', async () => {
    const res = await actions().run({ id: 'clone' });
    expect(res.success).toBe(false);
    expect(res.output).toContain('já existe');
  });

  it('instalar o WSL pede administrador pelo Windows', async () => {
    const res = await actions().run({ id: 'wsl-install' });
    expect(res.success).toBe(true);
    expect((spawn.mock.calls[0][1] as string[]).join(' ')).toContain("-Verb RunAs -ArgumentList '-NoExit','-Command','wsl --install --no-distribution'");
  });
});
