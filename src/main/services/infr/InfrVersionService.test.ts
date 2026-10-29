import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));

const { InfrVersionService } = await import('./InfrVersionService');

const ORIGIN = `repo mvn:g/winthor-core-features/1.39.0.1/xml/features
feature winthor-core-data 1.39.0.1
feature winthor-integracao-config 1.39.20.3
`;
const DEPS = JSON.stringify([{ service: 'winthor-integracao-config', version: '1.40.2.1' }]);

describe('InfrVersionService: versão nova a partir de outro ambiente', () => {
  let dir: string;
  const wsl = {
    findDockerWslDistro: vi.fn(async () => 'ubuntu2604-winthor'),
    resolveInfrPaths: vi.fn(() => ({ windows: dir, wsl: '/mnt/c/projetos/INFR-Docker' }))
  };
  const routine801 = {
    fetchUpdates: vi.fn(async () => ({
      repositorios: [],
      funcionalidades: [
        { nome: 'winthor-core-data', versao: '1.40.0.3', codigoRotina: 0, codigoModulo: 0, tipoProjeto: 'SERVICO', descricao: '', status: 'LIBERADO', featureMavenUrl: 'mvn:g/winthor-core-features/1.40.0.3/xml/features' }
      ]
    }))
  };
  const service = () => new InfrVersionService(wsl as any, routine801 as any);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-'));
    execFileAsync.mockImplementation(async (_cmd: string, args: string[]) => {
      const script = args[args.length - 1];
      if (script.startsWith('cat ')) return { stdout: ORIGIN };
      if (script.startsWith('docker port')) return { stdout: '0.0.0.0:8086\n' };
      if (script.startsWith('python3')) return { stdout: DEPS };
      return { stdout: '[OK] Manifesto gerado' };
    });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('lê a origem, sobe pelo catálogo da 801 e aponta o que o WSH da versão ainda cobraria', async () => {
    const res = await service().preview({ fromEnv: 'master', targetVersion: '40', wshJar: '/opt/wsh/40/winthor-integracao-core.jar' });
    expect(res.success).toBe(true);
    expect(res.originWtaUrl).toBe('http://localhost:8086');
    expect(routine801.fetchUpdates).toHaveBeenCalledWith('http://localhost:8086');
    expect(res.upgrade?.changes).toEqual([{ name: 'winthor-core-data', from: '1.39.0.1', to: '1.40.0.3' }]);
    expect(res.upgrade?.behind.map((f) => f.name)).toEqual(['winthor-integracao-config']);
    expect(res.wshCheck).toEqual([{ service: 'winthor-integracao-config', version: '1.40.2.1', found: '1.39.20.3', ok: false }]);
    expect(res.manifestText).toContain('feature winthor-core-data 1.40.0.3');
    const exportCall = execFileAsync.mock.calls.find((c) => String(c[1].at(-1)).includes('export_features.sh'));
    expect(exportCall?.[1].at(-1)).toContain('--container wta-master --out /tmp/hub-origem-master.features');
  });

  it('lista os ambientes da distro e os jars do WSH em /opt', async () => {
    execFileAsync.mockImplementation(async (_cmd: string, args: string[]) => {
      const script = args[args.length - 1];
      if (script.startsWith('docker ps')) return { stdout: 'oracle-master|oracle-winthor:11.2.0.2-xe|running|\nwta-master|linux-winthor:1.9.3-debian|running|\n' };
      return { stdout: '/opt/winthor-integracao-core.jar\n/opt/wsh/40/winthor-integracao-core.jar\n' };
    });
    const res = await service().listEnvironments();
    expect(res.environments.map((e) => e.name)).toEqual(['master']);
    expect(res.wshJars).toEqual(['/opt/winthor-integracao-core.jar', '/opt/wsh/40/winthor-integracao-core.jar']);
  });

  it('recusa entrada perigosa antes de rodar qualquer comando', async () => {
    execFileAsync.mockClear();
    expect((await service().preview({ fromEnv: 'master; rm -rf /', targetVersion: '40' })).success).toBe(false);
    expect((await service().preview({ fromEnv: 'master', targetVersion: '4x' })).success).toBe(false);
    expect((await service().preview({ fromEnv: 'master', targetVersion: '40', wshJar: "/opt/a.jar' ; x" })).success).toBe(false);
    expect((await service().preview({ fromEnv: 'master', targetVersion: '40', originWtaUrl: 'http://x:1/$(id)' })).success).toBe(false);
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it('grava o manifesto em versions/<versão>.features com LF', () => {
    fs.mkdirSync(path.join(dir, 'linux-winthor', 'versions'), { recursive: true });
    const res = service().saveManifest({ targetVersion: '40', manifestText: 'feature a 1.40.0.1\r\n' });
    expect(res.success).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'linux-winthor', 'versions', '40.features'), 'utf-8')).toBe('feature a 1.40.0.1\n');
    expect(service().saveManifest({ targetVersion: '40', manifestText: '# vazio' }).success).toBe(false);
  });
});
