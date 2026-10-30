import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));

const { InfrVersionService } = await import('./InfrVersionService');
const { INFR_NEW_VERSION_SCRIPTS } = await import('../../../shared/infrNewVersionScripts');

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
    fs.mkdirSync(path.join(dir, 'linux-winthor', 'scripts'), { recursive: true });
    for (const s of INFR_NEW_VERSION_SCRIPTS) fs.writeFileSync(path.join(dir, s), '#!/bin/bash\n');
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

  it('pasta do INFR-Docker sem os scripts da Nova versão diz qual branch usar, sem rodar nada', async () => {
    fs.rmSync(path.join(dir, 'linux-winthor', 'scripts', 'export_features.sh'));
    execFileAsync.mockClear();
    const res = await service().preview({ fromEnv: 'master', targetVersion: '40' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('export_features.sh');
    expect(res.error).toContain('git checkout feature/imagem-por-versao');
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it('leitura da origem que falha mostra o que o script disse, não só o comando', async () => {
    execFileAsync.mockImplementation(async (_cmd: string, args: string[]) => {
      if (String(args.at(-1)).includes('export_features.sh')) {
        throw Object.assign(new Error('Command failed: wsl.exe -d x -- bash -c ...'), {
          stdout: '',
          stderr: 'Error response from daemon: No such container: wta-master\n'
        });
      }
      return { stdout: '' };
    });
    const res = await service().preview({ fromEnv: 'master', targetVersion: '40' });
    expect(res.error).toContain('No such container: wta-master');
    expect(res.error).not.toContain('Command failed');
  });

  it('catálogo da 801 recusado por falta de login diz onde configurar o usuário do WTA', async () => {
    routine801.fetchUpdates.mockRejectedValueOnce(new Error('Falha ao obter lista de atualizações (HTTP 403): Forbidden'));
    const res = await service().preview({ fromEnv: 'master', targetVersion: '40' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Como resolver');
    expect(res.error).toContain('Usuário WTA (Login Automático)');
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

  it('configuração: senha não vai para a tela; ao gravar, vazia mantém a da origem e o ambiente novo manda no banco', async () => {
    execFileAsync.mockImplementation(async (_cmd: string, args: string[]) => {
      const script = String(args.at(-1));
      if (script.includes('wta-master') && script.includes('.Config.Env')) {
        return { stdout: 'DB_HOST=oracle-master\nDB_USER=LOCAL\nDB_PASSWORD=SEGREDO\nWTA_JAVA_OPTS=-Xms1g -Xmx4g\nPATH=/bin\n' };
      }
      if (script.includes('wsh-master') && script.includes('.Config.Env')) return { stdout: 'DB_PASSWORD=54B4\nJVM_XMX=3072m\n' };
      if (script.includes('.Mounts')) return { stdout: '/opt/Winthor.ini\n' };
      return { stdout: '' };
    });
    const t = await service().envTemplate(undefined, 'master');
    expect(t.wta.find((f) => f.key === 'DB_PASSWORD')).toMatchObject({ value: '', hasValue: true });
    expect(JSON.stringify(t)).not.toContain('SEGREDO');
    expect(t.wsh.find((f) => f.key === 'WINTHOR_INI')?.value).toBe('/opt/Winthor.ini');

    fs.mkdirSync(path.join(dir, 'linux-winthor'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'wsh-winthor'), { recursive: true });
    const res = await service().saveEnvFiles({
      version: '40',
      name: 'develop',
      from: 'master',
      wshJar: '/opt/wsh/40/winthor-integracao-core.jar',
      wtaEdits: { DB_PASSWORD: '', WTA_JAVA_OPTS: '-Xms512m -Xmx2g' },
      wshEdits: { JVM_XMX: '1536m' }
    });
    expect(res.success).toBe(true);
    const wta = fs.readFileSync(path.join(dir, 'linux-winthor', 'wta.env.40'), 'utf-8');
    expect(wta).toContain('DB_PASSWORD=SEGREDO');
    expect(wta).toContain('WTA_JAVA_OPTS=-Xms512m -Xmx2g');
    expect(wta).toContain('DB_HOST=oracle-develop');
    expect(wta).not.toContain('PATH=');
    const wsh = fs.readFileSync(path.join(dir, 'wsh-winthor', '.env.40'), 'utf-8');
    expect(wsh).toContain('JVM_XMX=1536m');
    expect(wsh).toContain('WTA_HOST=wta-develop');
    expect(wsh).toContain('SERVER_PORT=9040');
    expect(wsh).toContain('WINTHOR_INI=/opt/Winthor.ini');
  });

  it('grava o manifesto em versions/<versão>.features com LF', () => {
    fs.mkdirSync(path.join(dir, 'linux-winthor', 'versions'), { recursive: true });
    const res = service().saveManifest({ targetVersion: '40', manifestText: 'feature a 1.40.0.1\r\n' });
    expect(res.success).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'linux-winthor', 'versions', '40.features'), 'utf-8')).toBe('feature a 1.40.0.1\n');
    expect(service().saveManifest({ targetVersion: '40', manifestText: '# vazio' }).success).toBe(false);

    // Manifesto existente só é substituído quando o usuário escolhe
    const again = service().saveManifest({ targetVersion: '40', manifestText: 'feature a 1.39.0.1\n' });
    expect(again).toMatchObject({ success: false });
    expect(again.error).toContain('já existe');
    expect(fs.readFileSync(path.join(dir, 'linux-winthor', 'versions', '40.features'), 'utf-8')).toBe('feature a 1.40.0.1\n');
    expect(service().saveManifest({ targetVersion: '40', manifestText: 'feature a 1.39.0.1\n', overwrite: true }).success).toBe(true);
  });

  it('prévia aponta o manifesto que já existe da versão, comparado e conferido contra o WSH', async () => {
    const versions = path.join(dir, 'linux-winthor', 'versions');
    fs.mkdirSync(versions, { recursive: true });
    fs.writeFileSync(path.join(versions, '40.features'), 'feature winthor-core-data 1.40.1.0\nfeature winthor-integracao-config 1.40.2.5\n');
    const res = await service().preview({ fromEnv: 'master', targetVersion: '40', wshJar: '/opt/wsh/winthor-integracao-core.jar' });
    expect(res.existing).toMatchObject({ count: 2, comparison: { newer: 0, older: 2, onlyExisting: 0, onlyPreview: 0 } });
    expect(res.existing?.wshCheck).toEqual([{ service: 'winthor-integracao-config', version: '1.40.2.1', found: '1.40.2.5', ok: true }]);
  });
});
