import { describe, expect, it } from 'vitest';
import {
  checkRequiredFeatures,
  compareWshVersions,
  envValue,
  isSafeWshJarPath,
  isValidWshVersion,
  mountedJarSource,
  parseJarManifest,
  wshInstallerUrl,
  wshJarBackupPath,
  WSH_JAR_MOUNT_DEST
} from './wshUpdate';

describe('wshUpdate', () => {
  it('valida a versão e monta o endereço do instalador', () => {
    expect(isValidWshVersion('1.39.22.31')).toBe(true);
    expect(isValidWshVersion('1.39.22')).toBe(true);
    expect(isValidWshVersion(' 1.39.22.31 ')).toBe(true);
    for (const bad of ['', '1', 'latest', '1.39.22.31/../x', '1.39.22.31;ls', '../1.2.3', undefined]) expect(isValidWshVersion(bad)).toBe(false);
    expect(wshInstallerUrl('1.39.22.31')).toBe('https://storage.googleapis.com/artefatos-winthor/WSH/winthor-integracao-core-1.39.22.31.exe');
  });

  it('só aceita jar em /opt, sem caracteres de shell nem ..', () => {
    expect(isSafeWshJarPath('/opt/wsh/40/winthor-integracao-core.jar')).toBe(true);
    for (const bad of ['/etc/x.jar', '/opt/../etc/x.jar', "/opt/a'b.jar", '/opt/a b.jar', '/opt/a;rm.jar', '/opt/x.sh', '/opt/$(id).jar']) expect(isSafeWshJarPath(bad)).toBe(false);
  });

  it('lê o manifest juntando as linhas continuadas', () => {
    const text = 'Manifest-Version: 1.0\r\nImplementation-Version: 1.39.22.31\r\nStart-Class: br.com.totvs.integracao.winthosmarthube.WinthorSmartHubeA\r\n pplication\r\nSpring-Boot-Version: 2.5.4\r\n';
    expect(parseJarManifest(text)).toEqual({ version: '1.39.22.31', springBootVersion: '2.5.4', startClass: 'br.com.totvs.integracao.winthosmarthube.WinthorSmartHubeApplication' });
    expect(parseJarManifest('')).toEqual({ version: undefined, springBootVersion: undefined, startClass: undefined });
  });

  it('acha o jar montado no container e ignora outros volumes', () => {
    const mounts = `/var/lib/docker/volumes/wsh-logs/_data|/opt/winthor-integracao-core/logs\n/opt/wsh/40/winthor-integracao-core.jar|${WSH_JAR_MOUNT_DEST}\n/opt/Winthor.ini|/tmp/Winthor.ini`;
    expect(mountedJarSource(mounts)).toBe('/opt/wsh/40/winthor-integracao-core.jar');
    expect(mountedJarSource('/tmp/x.jar|' + WSH_JAR_MOUNT_DEST)).toBeNull();
    expect(mountedJarSource('')).toBeNull();
  });

  it('lê uma variável de ambiente do container', () => {
    expect(envValue('A=1\nWTA_CONTAINER=wta-40\nDB_PASSWORD=a=b', 'WTA_CONTAINER')).toBe('wta-40');
    expect(envValue('DB_PASSWORD=a=b', 'DB_PASSWORD')).toBe('a=b');
    expect(envValue('A=1', 'WTA_CONTAINER')).toBeUndefined();
  });

  it('confere o que o jar exige contra as features do WTA', () => {
    const required = [{ service: 'winthor-integracao-config', version: '1.39.27.17' }];
    expect(checkRequiredFeatures(required, [{ name: 'winthor-integracao-config', version: '1.39.27.17' }])[0].ok).toBe(true);
    expect(checkRequiredFeatures(required, [{ name: 'winthor-integracao-config', version: '1.40.0.1' }])[0].ok).toBe(true);
    const low = checkRequiredFeatures(required, [{ name: 'winthor-integracao-config', version: '1.38.17.48' }])[0];
    expect(low.ok).toBe(false);
    expect(low.found).toBe('1.38.17.48');
    expect(checkRequiredFeatures(required, [])[0]).toMatchObject({ ok: false, found: undefined });
  });

  it('compara a versão nova com a atual', () => {
    expect(compareWshVersions('1.38.14.57', '1.39.22.31')).toBe('newer');
    expect(compareWshVersions('1.39.22.31', '1.39.22.31')).toBe('same');
    expect(compareWshVersions('1.40.0.1', '1.39.22.31')).toBe('older');
    expect(compareWshVersions(undefined, '1.39.22.31')).toBe('unknown');
  });

  it('nomeia o backup com a versão que estava em uso', () => {
    expect(wshJarBackupPath('/opt/wsh/winthor-integracao-core.jar', '1.38.14.57')).toBe('/opt/wsh/winthor-integracao-core.jar.bak-1.38.14.57');
    expect(wshJarBackupPath('/opt/a.jar', undefined)).toBe('/opt/a.jar.bak-anterior');
    expect(wshJarBackupPath('/opt/a.jar', "1.0'; rm -rf /")).not.toContain("'");
  });
});
