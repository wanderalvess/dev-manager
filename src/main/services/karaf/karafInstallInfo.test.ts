import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { karafSettingsMismatches } from '../../../shared/karafInstall';
import { readKarafInstallInfo } from './karafInstallInfo';

let root: string;

const write = (relative: string, content: string) => {
  const file = path.join(root, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'karaf-install-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('leitura da instalação do Karaf', () => {
  it('distribuição do WinThor: portas, log, JDK do winthor.bat e serviço do yajsw', () => {
    write('etc/org.apache.karaf.shell.cfg', 'sshPort = 8102\nsshHost = 0.0.0.0\n');
    write('etc/org.ops4j.pax.web.cfg', 'org.osgi.service.http.port = 8889\n');
    write('etc/org.ops4j.pax.logging.cfg', 'log4j2.appender.rolling.fileName = ${karaf.data}/log/winthor.log\n');
    write('etc/system.properties', 'karaf.name = prod\n');
    write('etc/distribution.info', 'karafVersion=4.1.5\n');
    write('etc/users.properties', 'winthor = segredo,_g_:admingroup\n');
    write('bin/winthor.bat', '@echo off\r\nset JAVA_HOME=C:\\pcsist\\produtos\\winthor-jdk\r\n');
    write('bin/yajsw/conf/windows-wrapper.conf', 'wrapper.ntservice.name=WinThor\nwrapper.ntservice.displayname=WinThor Anywhere\n');

    const info = readKarafInstallInfo(root);

    expect(info).toMatchObject({
      found: true,
      karafVersion: '4.1.5',
      instanceName: 'prod',
      sshPort: 8102,
      httpPort: 8889,
      logFile: path.join(root, 'data', 'log', 'winthor.log'),
      javaHome: 'C:\\pcsist\\produtos\\winthor-jdk',
      startScript: 'bin/winthor.bat',
      service: { name: 'WinThor', displayName: 'WinThor Anywhere' }
    });
    expect(JSON.stringify(info)).not.toContain('segredo');
  });

  it('pasta sem etc/ ou vazia explica o que falta', () => {
    expect(readKarafInstallInfo(root)).toMatchObject({ found: false, note: expect.stringContaining('etc/') });
    expect(readKarafInstallInfo('  ')).toMatchObject({ found: false });
  });

  it('aponta o que o app tem diferente da instalação (porta vazia no app vale 8101)', () => {
    const info = { root, found: true, sshPort: 8102, httpPort: 8889, javaHome: 'C:\\pcsist\\produtos\\winthor-jdk' };
    expect(karafSettingsMismatches(info, { wtaUrl: 'http://localhost:8181', jdkPath: 'C:/pcsist/produtos/winthor-jdk/' }).map((m) => m.field)).toEqual([
      'karafSshPort',
      'wtaUrl'
    ]);
    expect(karafSettingsMismatches(info, { karafSshPort: 8102, wtaUrl: 'http://localhost:8889', jdkPath: 'C:\\outro-jdk' }).map((m) => m.field)).toEqual(['jdkPath']);
  });
});
