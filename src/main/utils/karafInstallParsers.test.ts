import { describe, expect, it } from 'vitest';
import { javaHomeFromBat, logFileFromPaxLogging, parseProperties, resolveKarafVars, serviceFromWrapperConf, toPort } from './karafInstallParsers';

describe('leitura dos arquivos de configuração do Karaf', () => {
  it('lê .cfg com espaços, comentários, continuação de linha e barras escapadas', () => {
    const props = parseProperties(
      [
        '# comentário',
        'sshPort = 8101',
        'sshHost=0.0.0.0',
        '! outro comentário',
        'javax.servlet.context.tempdir =C:\\\\pcsist\\\\produtos\\\\winthor\\\\data',
        'org.ops4j.pax.url.mvn.defaultRepositories=\\',
        '    file:${karaf.home}/system@id=system, \\',
        '    file:${karaf.data}/kar@id=kar'
      ].join('\r\n')
    );
    expect(props.sshPort).toBe('8101');
    expect(props.sshHost).toBe('0.0.0.0');
    expect(props['javax.servlet.context.tempdir']).toBe('C:\\pcsist\\produtos\\winthor\\data');
    expect(props['org.ops4j.pax.url.mvn.defaultRepositories']).toBe('file:${karaf.home}/system@id=system, file:${karaf.data}/kar@id=kar');
  });

  it('resolve as variáveis do Karaf e acha o log principal (log4j2 e log4j 1)', () => {
    expect(resolveKarafVars('${karaf.data}/log/winthor.log', 'C:\\pcsist\\produtos\\winthor')).toBe('C:\\pcsist\\produtos\\winthor\\data\\log\\winthor.log');
    expect(resolveKarafVars('${karaf.data}/log/karaf.log', '/opt/karaf')).toBe('/opt/karaf/data/log/karaf.log');
    expect(logFileFromPaxLogging({ 'log4j2.appender.rolling.fileName': '${karaf.data}/log/winthor.log' }, '/k')).toBe('/k/data/log/winthor.log');
    expect(logFileFromPaxLogging({ 'log4j.appender.out.file': '${karaf.data}/log/karaf.log' }, '/k')).toBe('/k/data/log/karaf.log');
    expect(logFileFromPaxLogging({}, '/k')).toBeUndefined();
  });

  it('JAVA_HOME fixo no .bat, serviço do yajsw e portas válidas', () => {
    expect(javaHomeFromBat('@echo off\r\nsetlocal\r\nset JAVA_HOME=C:\\pcsist\\produtos\\winthor-jdk\r\n')).toBe('C:\\pcsist\\produtos\\winthor-jdk');
    expect(javaHomeFromBat('set JAVA_HOME=%~dp0..\\jdk')).toBeUndefined();
    expect(serviceFromWrapperConf({ 'wrapper.ntservice.name': 'WinThor', 'wrapper.ntservice.displayname': 'WinThor Anywhere' })).toEqual({
      name: 'WinThor',
      displayName: 'WinThor Anywhere'
    });
    expect(serviceFromWrapperConf({})).toBeUndefined();
    expect([toPort('8889'), toPort('0'), toPort('abc'), toPort(undefined)]).toEqual([8889, undefined, undefined, undefined]);
  });
});
