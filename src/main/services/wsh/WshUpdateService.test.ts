import { beforeEach, describe, expect, it, vi } from 'vitest';

const execWsl = vi.fn();
vi.mock('../../utils/wslExec', () => ({ execWsl: (...a: unknown[]) => execWsl(...a) }));

import { WshUpdateService } from './WshUpdateService';
import { WSH_JAR_MOUNT_DEST } from '../../../shared/wshUpdate';

const service = () => new WshUpdateService(async () => 'ubuntu-test', 'D:/nao-usado');

const inspectJson = (mounts: { Source: string; Destination: string }[], env: string[] = ['WTA_CONTAINER=wta-40']) =>
  JSON.stringify([{ State: { Running: true }, Mounts: mounts, Config: { Env: env } }]);
const jarInfo = JSON.stringify({ m: 'Implementation-Version: 1.38.14.57\n', d: '[{"service":"winthor-integracao-config","version":"1.38.17.48"}]', b: ['winthor-integracao-core.jar.bak-1.37.0.1'] });

describe('WshUpdateService', () => {
  beforeEach(() => execWsl.mockReset());

  it('lê versão, exigências, WTA e backups do container', async () => {
    execWsl
      .mockResolvedValueOnce({ stdout: inspectJson([{ Source: '/opt/wsh/40/winthor-integracao-core.jar', Destination: WSH_JAR_MOUNT_DEST }]), stderr: '' })
      .mockResolvedValueOnce({ stdout: jarInfo, stderr: '' });
    const r = await service().inspect({ container: 'wsh-40' });
    expect(r).toMatchObject({ success: true, running: true, jarPath: '/opt/wsh/40/winthor-integracao-core.jar', version: '1.38.14.57', wtaContainer: 'wta-40' });
    expect(r.requires).toEqual([{ service: 'winthor-integracao-config', version: '1.38.17.48' }]);
    expect(r.backups).toEqual(['winthor-integracao-core.jar.bak-1.37.0.1']);
    // docker inspect sem passar pelo shell
    expect(execWsl.mock.calls[0][0]).toEqual(['-d', 'ubuntu-test', '--', 'docker', 'inspect', 'wsh-40']);
  });

  it('explica quando o container não monta o jar do WSH', async () => {
    execWsl.mockResolvedValueOnce({ stdout: inspectJson([{ Source: '/opt/Winthor.ini', Destination: '/tmp/Winthor.ini' }]), stderr: '' });
    const r = await service().inspect({ container: 'wsh-40' });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/não monta o jar/);
  });

  it('recusa nome de container e versão com caracteres perigosos antes de qualquer comando', async () => {
    const s = service();
    expect((await s.inspect({ container: 'wsh; rm -rf /' })).success).toBe(false);
    expect((await s.prepare({ container: 'wsh-40', version: '1.39/../x' })).success).toBe(false);
    expect((await s.apply({ container: 'wsh-40', version: 'x' })).success).toBe(false);
    expect((await s.probe('latest')).success).toBe(false);
    expect(execWsl).not.toHaveBeenCalled();
  });

  it('não troca o jar sem ter preparado a versão', async () => {
    const r = await service().apply({ container: 'wsh-40', version: '1.39.22.31' });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Baixar e conferir/);
    expect(execWsl).not.toHaveBeenCalled();
  });

  it('só restaura backup que existe ao lado do jar', async () => {
    execWsl
      .mockResolvedValueOnce({ stdout: inspectJson([{ Source: '/opt/wsh/40/winthor-integracao-core.jar', Destination: WSH_JAR_MOUNT_DEST }]), stderr: '' })
      .mockResolvedValueOnce({ stdout: jarInfo, stderr: '' });
    const r = await service().rollback({ container: 'wsh-40', backup: '../../etc/passwd' });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Não há backup/);
    expect(execWsl).toHaveBeenCalledTimes(2);
  });
});
