import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  KarafService,
  parseClauseList,
  parseManifestHeaders,
  parseCapabilitiesWiredBundles,
  filterBenignStderr
} from './KarafService';
import { ConfigService } from './ConfigService';
import * as processUtils from '../utils/process';
import * as networkUtils from '../utils/network';

describe('KarafService', () => {
  let tmpDir: string;
  let configService: ConfigService;
  let karafService: KarafService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'karaf-test-'));
    process.env.CONFIG_DIR = tmpDir;

    configService = new ConfigService();
    karafService = new KarafService(configService);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.CONFIG_DIR;
    vi.restoreAllMocks();
  });

  describe('parseProjectPomOrBat', () => {
    it('retorna null quando o diretório do projeto não existe', () => {
      const nonExistent = path.join(tmpDir, 'inexistente');
      expect(karafService.parseProjectPomOrBat(nonExistent)).toBeNull();
    });

    it('extrai metadados do pom.xml e gera comandos sugeridos padrão', () => {
      const projDir = path.join(tmpDir, 'meu-projeto');
      fs.mkdirSync(projDir, { recursive: true });

      const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <groupId>br.com.totvs.winthor</groupId>
  <artifactId>rotina-faturamento-parent</artifactId>
  <version>1.5.0-SNAPSHOT</version>
  <modules>
    <module>rotina-faturamento-api</module>
    <module>rotina-faturamento-service</module>
  </modules>
</project>`;
      fs.writeFileSync(path.join(projDir, 'pom.xml'), pomContent, 'utf-8');

      const info = karafService.parseProjectPomOrBat(projDir);
      expect(info).not.toBeNull();
      expect(info?.groupId).toBe('br.com.totvs.winthor');
      expect(info?.artifactId).toBe('rotina-faturamento-parent');
      expect(info?.version).toBe('1.5.0-SNAPSHOT');
      expect(info?.modules).toEqual(['rotina-faturamento-api', 'rotina-faturamento-service']);
      expect(info?.suggestedRepoCommand).toBe(
        'feature:repo-add mvn:br.com.totvs.winthor/rotina-faturamento-service/1.5.0-SNAPSHOT/xml/features'
      );
      expect(info?.suggestedInstallCommand).toBe(
        'feature:install -r -u rotina-faturamento/1.5.0-SNAPSHOT'
      );
    });

    it('prioriza comandos customizados extraídos do deploy-local.bat', () => {
      const projDir = path.join(tmpDir, 'meu-projeto-bat');
      fs.mkdirSync(projDir, { recursive: true });

      const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <groupId>br.com.empresa</groupId>
  <artifactId>meu-servico</artifactId>
  <version>2.0.0</version>
</project>`;
      fs.writeFileSync(path.join(projDir, 'pom.xml'), pomContent, 'utf-8');

      const batContent = `@echo off
client.bat "feature:repo-add mvn:br.com.empresa/custom-feature/2.0.0/xml/features"
client.bat "feature:install -r custom-feature/2.0.0"
`;
      fs.writeFileSync(path.join(projDir, 'deploy-local.bat'), batContent, 'utf-8');

      const info = karafService.parseProjectPomOrBat(projDir);
      expect(info).not.toBeNull();
      expect(info?.suggestedRepoCommand).toBe('feature:repo-add mvn:br.com.empresa/custom-feature/2.0.0/xml/features');
      expect(info?.suggestedInstallCommand).toBe('feature:install -r custom-feature/2.0.0');
    });
  });

  describe('getKarafClientExecutable e getKarafServerExecutable', () => {
    it('retorna null se karafPath não estiver configurado', () => {
      configService.saveSettings({ karafPath: '' });
      expect(karafService.getKarafClientExecutable()).toBeNull();
      expect(karafService.getKarafServerExecutable()).toBeNull();
    });

    it('localiza executável do client quando arquivo existe no bin', () => {
      const karafPath = path.join(tmpDir, 'karaf-install');
      const binDir = path.join(karafPath, 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      const clientFile = path.join(binDir, process.platform === 'win32' ? 'client.bat' : 'client');
      fs.writeFileSync(clientFile, 'echo client');

      configService.saveSettings({ karafPath });
      const foundClient = karafService.getKarafClientExecutable();
      expect(foundClient).toBe(clientFile);
    });

    it('localiza executável do server quando arquivo existe no bin', () => {
      const karafPath = path.join(tmpDir, 'karaf-install');
      const binDir = path.join(karafPath, 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      const serverFile = path.join(binDir, process.platform === 'win32' ? 'karaf.bat' : 'karaf');
      fs.writeFileSync(serverFile, 'echo server');

      configService.saveSettings({ karafPath });
      const foundServer = karafService.getKarafServerExecutable();
      expect(foundServer).toBe(serverFile);
    });

    it('localiza executável do server quando winthor.bat existe no bin', () => {
      const karafPath = path.join(tmpDir, 'winthor-install');
      const binDir = path.join(karafPath, 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      const winthorFile = path.join(binDir, 'winthor.bat');
      fs.writeFileSync(winthorFile, '@echo off');

      configService.saveSettings({ karafPath });
      const foundServer = karafService.getKarafServerExecutable();
      expect(foundServer).toBe(winthorFile);
    });
  });

  describe('executeKarafCommand - Validação de segurança', () => {
    it('bloqueia comandos com injeção de shell', async () => {
      const dummyChunk = vi.fn();
      const res = await karafService.executeKarafCommand('bundle:list; rm -rf /', dummyChunk);

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('ERRO DE SEGURANÇA');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('ERRO DE SEGURANÇA'));
    });

    it('informa erro quando o executável do Karaf client não existe', async () => {
      configService.saveSettings({ karafPath: path.join(tmpDir, 'nao-existe') });
      const dummyChunk = vi.fn();
      const res = await karafService.executeKarafCommand('bundle:list', dummyChunk);

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('Executável client do Karaf não encontrado');
    });
  });

  describe('listBundlesParsed', () => {
    it('retorna array vazio quando comando falha ou saída é vazia', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'Error connecting'
      });

      const bundles = await karafService.listBundlesParsed();
      expect(bundles).toEqual([]);
    });

    it('faz parse do formato clássico de colunas separadas por pipe (|)', async () => {
      const rawStdout = [
        'START LEVEL 100 , List Threshold: 50',
        'ID | State    | Lvl | Version        | Name',
        '---+----------+-----+----------------+----------------------------------',
        ' 1 | Active   |  80 | 4.4.6          | Apache Karaf :: OSGi Services',
        ' 2 | Resolved |  80 | 1.2.3          | TOTVS :: WinThor Service Core',
        ' 3 | Installed|  60 | 0.9.0          | Inactive Bundle'
      ].join('\n');

      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: rawStdout,
        stderr: ''
      });

      const bundles = await karafService.listBundlesParsed();
      expect(bundles).toHaveLength(3);

      expect(bundles[0]).toEqual({
        id: '1',
        state: 'Active',
        level: '80',
        version: '4.4.6',
        name: 'Apache Karaf :: OSGi Services',
        symbolicName: 'Apache Karaf :: OSGi Services'
      });

      expect(bundles[1]).toEqual({
        id: '2',
        state: 'Resolved',
        level: '80',
        version: '1.2.3',
        name: 'TOTVS :: WinThor Service Core',
        symbolicName: 'TOTVS :: WinThor Service Core'
      });

      expect(bundles[2]).toEqual({
        id: '3',
        state: 'Installed',
        level: '60',
        version: '0.9.0',
        name: 'Inactive Bundle',
        symbolicName: 'Inactive Bundle'
      });
    });

    it('faz parse de saída no formato com colchetes [ ID ] [ State ]', async () => {
      const rawStdout = [
        '[  10] [Active     ] [            ] [   80] Minha Feature Bundle (1.0.0)',
        '[  11] [Starting   ] [            ] [   80] Iniciando Bundle (2.0.0)'
      ].join('\n');

      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: rawStdout,
        stderr: ''
      });

      const bundles = await karafService.listBundlesParsed();
      expect(bundles).toHaveLength(2);
      expect(bundles[0].id).toBe('10');
      expect(bundles[0].state).toBe('Active');
      expect(bundles[0].level).toBe('80');
      expect(bundles[0].name).toBe('Minha Feature Bundle');
      expect(bundles[0].version).toBe('1.0.0');

      expect(bundles[1].id).toBe('11');
      expect(bundles[1].state).toBe('Starting');
      expect(bundles[1].level).toBe('80');
      expect(bundles[1].name).toBe('Iniciando Bundle');
      expect(bundles[1].version).toBe('2.0.0');
    });
  });

  describe('Utilitários de Parse de Manifesto e Capacidades', () => {
    it('parseClauseList separa pacotes respeitando aspas e version ranges', () => {
      const input = 'javax.annotation, br.com.totvs.core;version="[1.0.0,2.0.0)", org.osgi.framework;version=1.8.0';
      const parsed = parseClauseList(input);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toBe('javax.annotation');
      expect(parsed[1]).toBe('br.com.totvs.core;version="[1.0.0,2.0.0)"');
      expect(parsed[2]).toBe('org.osgi.framework;version=1.8.0');
    });

    it('parseManifestHeaders extrai chaves com quebra de linha e indentação', () => {
      const rawStdout = [
        'WinThor Core Service (150)',
        '--------------------------',
        'Bundle-SymbolicName = br.com.totvs.winthor.core',
        'Bundle-Version = 2.1.0',
        'Bundle-Name = WinThor Core',
        'Export-Package =',
        '\tbr.com.totvs.winthor.core.api;version="2.1.0",',
        '\tbr.com.totvs.winthor.core.dto;version="2.1.0"',
        'Import-Package =',
        '\tjavax.inject,',
        '\torg.slf4j;version="[1.7,2)"'
      ].join('\n');

      const headers = parseManifestHeaders(rawStdout);
      expect(headers['Bundle-SymbolicName']).toBe('br.com.totvs.winthor.core');
      expect(headers['Bundle-Version']).toBe('2.1.0');
      expect(headers['Bundle-Name']).toBe('WinThor Core');
      expect(headers['Export-Package']).toContain('br.com.totvs.winthor.core.api;version="2.1.0"');
      expect(headers['Import-Package']).toContain('org.slf4j;version="[1.7,2)"');
    });

    it('parseCapabilitiesWiredBundles extrai dependentes conectados na seção wired to:', () => {
      const rawStdout = [
        'WinThor Core Service (150)',
        '--------------------------',
        'osgi.wiring.package; br.com.totvs.winthor.core.api 2.1.0',
        '   wired to:',
        '      [ 180] WinThor Faturamento [180]',
        '      [ 190] WinThor Estoque (1.2.0) [190]',
        'osgi.service; br.com.totvs.winthor.core.api.SecurityService'
      ].join('\n');

      const dependents = parseCapabilitiesWiredBundles(rawStdout);
      expect(dependents).toHaveLength(2);
      expect(dependents[0].id).toBe('180');
      expect(dependents[0].name).toBe('WinThor Faturamento');
      expect(dependents[1].id).toBe('190');
      expect(dependents[1].name).toBe('WinThor Estoque');
      expect(dependents[1].version).toBe('1.2.0');
    });
  });

  describe('Inspeção e Verificação de Dependências de Bundles', () => {
    it('getBundleDetails analisa manifesto, capacidades e diagnóstico', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockImplementation(async (cmd) => {
        if (cmd.startsWith('bundle:headers')) {
          return {
            code: 0,
            stdout: [
              'Bundle-SymbolicName = br.com.totvs.winthor.faturamento',
              'Bundle-Version = 1.0.0',
              'Bundle-Name = Rotina Faturamento',
              'Bundle-Update-Location = mvn:br.com.totvs.winthor/rotina-faturamento/1.0.0',
              'Export-Package = br.com.totvs.winthor.faturamento.api;version="1.0.0"',
              'Import-Package = br.com.totvs.winthor.core.api'
            ].join('\n'),
            stderr: ''
          };
        }
        if (cmd.startsWith('bundle:capabilities')) {
          return {
            code: 0,
            stdout: 'osgi.wiring.package; br.com.totvs.winthor.faturamento.api wired to:\n   [200] Rotina Web [200]',
            stderr: ''
          };
        }
        if (cmd.startsWith('bundle:diag')) {
          return { code: 0, stdout: '', stderr: '' };
        }
        return { code: 0, stdout: '', stderr: '' };
      });

      const details = await karafService.getBundleDetails('154');
      expect(details).not.toBeNull();
      expect(details?.id).toBe('154');
      expect(details?.symbolicName).toBe('br.com.totvs.winthor.faturamento');
      expect(details?.name).toBe('Rotina Faturamento');
      expect(details?.version).toBe('1.0.0');
      expect(details?.location).toBe('mvn:br.com.totvs.winthor/rotina-faturamento/1.0.0');
      expect(details?.exportedPackages).toHaveLength(1);
      expect(details?.dependentBundles).toHaveLength(1);
      expect(details?.dependentBundles[0].id).toBe('200');
    });

    it('checkBundleDependencies sinaliza Risco Alto quando há bundles dependentes', async () => {
      vi.spyOn(karafService, 'getBundleDetails').mockResolvedValueOnce({
        id: '154',
        name: 'Rotina Faturamento',
        symbolicName: 'br.com.totvs.winthor.faturamento',
        version: '1.0.0',
        state: 'Active',
        location: '',
        exportedPackages: ['br.com.totvs.api'],
        importedPackages: [],
        requiredBundles: [],
        dependentBundles: [{ id: '200', name: 'Rotina Web', reason: 'osgi.wiring.package' }]
      });

      const check = await karafService.checkBundleDependencies('154');
      expect(check.alreadyInstalled).toBe(true);
      expect(check.riskLevel).toBe('HIGH');
      expect(check.dependentBundles).toHaveLength(1);
      expect(check.warningMessage).toContain('1 bundle(s) dependem diretamente deste módulo');
    });

    it('checkBundleDependencies sinaliza Risco Baixo quando não há dependentes nem pacotes exportados', async () => {
      vi.spyOn(karafService, 'getBundleDetails').mockResolvedValueOnce({
        id: '99',
        name: 'Plugin Isolado',
        symbolicName: 'br.com.totvs.isolado',
        version: '1.0.0',
        state: 'Active',
        location: '',
        exportedPackages: [],
        importedPackages: [],
        requiredBundles: [],
        dependentBundles: []
      });

      const check = await karafService.checkBundleDependencies('99');
      expect(check.riskLevel).toBe('LOW');
      expect(check.warningMessage).toContain('Nenhum bundle dependente detectado');
    });

    it('checkInstallDependencies detecta colisão de versão com bundle existente', async () => {
      vi.spyOn(karafService, 'listBundlesParsed').mockResolvedValueOnce([
        {
          id: '154',
          name: 'rotina-faturamento-service',
          symbolicName: 'br.com.totvs.winthor.faturamento',
          version: '1.0.0',
          state: 'Active'
        }
      ]);

      vi.spyOn(karafService, 'getBundleDetails').mockResolvedValueOnce({
        id: '154',
        name: 'rotina-faturamento-service',
        symbolicName: 'br.com.totvs.winthor.faturamento',
        version: '1.0.0',
        state: 'Active',
        location: '',
        exportedPackages: [],
        importedPackages: [],
        requiredBundles: [],
        dependentBundles: [{ id: '300', name: 'Portal Web', reason: 'osgi.wiring.package' }]
      });

      const check = await karafService.checkInstallDependencies({
        location: 'mvn:br.com.totvs/rotina-faturamento-service/1.5.0',
        version: '1.5.0'
      });

      expect(check.alreadyInstalled).toBe(true);
      expect(check.existingBundle?.id).toBe('154');
      expect(check.existingBundle?.version).toBe('1.0.0');
      expect(check.targetVersion).toBe('1.5.0');
      expect(check.riskLevel).toBe('HIGH');
    });
  });

  describe('Instalação, Reinstalação e Desinstalação de Bundles', () => {
    it('installBundle executa bundle:install com flag -s e extrai novo ID', async () => {
      const executeSpy = vi.spyOn(karafService, 'executeKarafCommand').mockImplementation(async (cmd) => {
        if (cmd.startsWith('bundle:install')) {
          return { code: 0, stdout: 'Bundle ID: 255\r\n', stderr: '' };
        }
        return { code: 0, stdout: '', stderr: '' };
      });

      const res = await karafService.installBundle({
        location: 'mvn:br.com.totvs.winthor/modulo-teste/2.0.0',
        startImmediately: true
      });

      expect(res.success).toBe(true);
      expect(res.bundleId).toBe('255');
      expect(executeSpy).toHaveBeenCalledWith(
        expect.stringContaining('bundle:install -s "mvn:br.com.totvs.winthor/modulo-teste/2.0.0"'),
        expect.any(Function),
        undefined
      );
    });

    it('uninstallBundle executa bundle:uninstall e bundle:refresh', async () => {
      const executeSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const res = await karafService.uninstallBundle('255');
      expect(res.success).toBe(true);
      expect(executeSpy).toHaveBeenCalledWith('bundle:uninstall 255', expect.any(Function), undefined);
      expect(executeSpy).toHaveBeenCalledWith('bundle:refresh', expect.any(Function), undefined);
    });

    it('reinstallBundle executa bundle:update, refresh e start', async () => {
      const executeSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const res = await karafService.reinstallBundle({
        bundleId: '255',
        location: 'mvn:br.com.totvs.winthor/modulo-teste/2.0.0'
      });

      expect(res.success).toBe(true);
      expect(executeSpy).toHaveBeenCalledWith(
        'bundle:update 255 "mvn:br.com.totvs.winthor/modulo-teste/2.0.0"',
        expect.any(Function),
        undefined
      );
      expect(executeSpy).toHaveBeenCalledWith('bundle:refresh 255', expect.any(Function), undefined);
      expect(executeSpy).toHaveBeenCalledWith('bundle:start 255', expect.any(Function), undefined);
    });

    it('reinstallBundle e updateBundleVersion falham quando o bundle:start falha', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockImplementation(async (cmd) =>
        cmd.startsWith('bundle:start') ? { code: 1, stdout: '', stderr: 'não resolvido' } : { code: 0, stdout: '', stderr: '' }
      );

      const reinstall = await karafService.reinstallBundle({ bundleId: '255', location: 'mvn:a/b/1' });
      const update = await karafService.updateBundleVersion({ bundleId: '255', newVersionOrLocation: 'mvn:a/b/2' });

      expect(reinstall.success).toBe(false);
      expect(reinstall.output).toContain('não iniciou');
      expect(update.success).toBe(false);
    });

    it('manageBundle com uninstall também executa bundle:refresh', async () => {
      const commands: string[] = [];
      vi.spyOn(karafService, 'executeKarafCommand').mockImplementation(async (cmd) => {
        commands.push(cmd);
        return { code: 0, stdout: '', stderr: '' };
      });

      const res = await karafService.manageBundle('uninstall', '255');
      expect(res.success).toBe(true);
      expect(commands).toEqual(['bundle:uninstall 255', 'bundle:refresh']);
    });
  });

  describe('getResolvedJavaEnv', () => {
    it('preserva System32 e unifica Path/PATH no Windows sem perder executáveis do sistema', () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        // Força jdkPath vazio: getSettings() detecta automaticamente um JDK real instalado na
        // máquina (detectDefaultJdkPath), o que tornaria este teste dependente do ambiente onde
        // roda (diferente no dev local vs. CI) se não fosse isolado explicitamente aqui.
        vi.spyOn(configService, 'getSettings').mockReturnValue({ ...configService.getSettings(), jdkPath: '' });
        process.env.JAVA_HOME = 'C:\\Java\\jdk1.8.0_202';
        delete process.env.PATH;
        process.env.Path = 'C:\\Program Files\\Something;C:\\Windows\\System32';

        const env = karafService.getResolvedJavaEnv();

        expect(env.JAVA_HOME).toBe('C:\\Java\\jdk1.8.0_202');
        expect(env.PATH).toBeDefined();
        expect(env.Path).toBeDefined();
        expect(env.PATH).toBe(env.Path);
        expect(env.PATH).toContain('C:\\Java\\jdk1.8.0_202\\bin');
        expect(env.PATH).toContain('System32');
        expect(env.SystemRoot).toBeDefined();
        expect(env.ComSpec).toBeDefined();
        expect(env.COLUMNS).toBe('300');
        expect(env.LINES).toBe('1000');
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });

    it('NÃO anexa o agente OpenTelemetry por padrão, mesmo com o jar presente no karafPath', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'opentelemetry-javaagent.jar'), 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir
      });

      expect(karafService.getResolvedJavaEnv().JAVA_TOOL_OPTIONS).not.toContain('opentelemetry-javaagent.jar');
    });

    it('NÃO anexa o agente OpenTelemetry quando apmInstrumentationEnabled está explicitamente falso', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'opentelemetry-javaagent.jar'), 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir,
        apmInstrumentationEnabled: false
      });

      expect(karafService.getResolvedJavaEnv().JAVA_TOOL_OPTIONS).not.toContain('opentelemetry-javaagent.jar');
    });

    it('anexa o agente OpenTelemetry em JAVA_TOOL_OPTIONS quando apmInstrumentationEnabled está ligado', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      const agentPath = path.join(binDir, 'opentelemetry-javaagent.jar');
      fs.writeFileSync(agentPath, 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir,
        apmInstrumentationEnabled: true
      });

      const env = karafService.getResolvedJavaEnv();
      expect(env.JAVA_TOOL_OPTIONS).toContain('-javaagent:');
      expect(env.JAVA_TOOL_OPTIONS).toContain('opentelemetry-javaagent.jar');
      expect(env.JAVA_TOOL_OPTIONS).toContain('-Dotel.exporter.otlp.endpoint=http://127.0.0.1:4318');
      expect(env.JAVA_TOOL_OPTIONS).toContain('-Dotel.exporter.otlp.protocol=http/protobuf');
      expect(env.JAVA_TOOL_OPTIONS).toContain('-Dotel.service.name=karaf-app');
    });

    it('usa o nome de serviço configurado em apmServiceName no lugar do padrão', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'opentelemetry-javaagent.jar'), 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir,
        apmInstrumentationEnabled: true,
        apmServiceName: 'minha-empresa-erp'
      });

      expect(karafService.getResolvedJavaEnv().JAVA_TOOL_OPTIONS).toContain('-Dotel.service.name=minha-empresa-erp');
    });

    it('exporta para a porta do receptor APM configurada nas configurações', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'opentelemetry-javaagent.jar'), 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir,
        apmInstrumentationEnabled: true,
        apmReceiverPort: 4418
      });

      expect(karafService.getResolvedJavaEnv().JAVA_TOOL_OPTIONS).toContain('-Dotel.exporter.otlp.endpoint=http://127.0.0.1:4418');
    });

    it('não anexa o agente OpenTelemetry e remove resíduos de javaagent/debug quando isClient for true', () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'opentelemetry-javaagent.jar'), 'mock-agent');

      vi.spyOn(configService, 'getSettings').mockReturnValue({
        ...configService.getSettings(),
        karafPath: tmpDir
      });

      const env = karafService.getResolvedJavaEnv(undefined, true);
      expect(env.JAVA_TOOL_OPTIONS).not.toContain('opentelemetry-javaagent.jar');
      expect(env.JAVA_TOOL_OPTIONS).not.toContain('-Dotel.');
      expect(env.JAVA_DEBUG_PORT).toBeUndefined();
      expect(env.JAVA_DEBUG_OPTS).toBeUndefined();
    });
  });

  describe('filterBenignStderr', () => {
    it('remove linhas de ruído conhecidas da JVM, client.bat e OpenTelemetry', () => {
      const noise = [
        'Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8',
        'client.bat: Ignoring predefined value for KARAF_HOME',
        '[otel.javaagent 2026-09-25 10:48:32:649 -0300] [main] INFO io.opentelemetry.javaagent.tooling.VersionLogger - opentelemetry-javaagent - version: 2.31.1'
      ].join('\r\n');

      expect(filterBenignStderr(noise)).toBe('');
    });

    it('preserva mensagens de erro reais e falhas de comando', () => {
      const mixed = [
        'Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8',
        'client.bat: Ignoring predefined value for KARAF_HOME',
        'Error executing command: No matching features for my-feat/1.0',
        'Caused by: java.io.FileNotFoundException'
      ].join('\r\n');

      const cleaned = filterBenignStderr(mixed);
      expect(cleaned).toContain('Error executing command: No matching features');
      expect(cleaned).toContain('Caused by: java.io.FileNotFoundException');
      expect(cleaned).not.toContain('Picked up JAVA_TOOL_OPTIONS');
      expect(cleaned).not.toContain('client.bat: Ignoring predefined value');
    });
  });

  describe('isKarafRunning', () => {
    it('retorna true quando checkPortOpen resolve true', async () => {
      vi.spyOn(networkUtils, 'checkPortOpen').mockResolvedValueOnce(true);
      const running = await karafService.isKarafRunning(8101);
      expect(running).toBe(true);
    });

    it('retorna false quando checkPortOpen resolve false', async () => {
      vi.spyOn(networkUtils, 'checkPortOpen').mockResolvedValueOnce(false);
      const running = await karafService.isKarafRunning(8101);
      expect(running).toBe(false);
    });
  });

  describe('executeKarafCommand', () => {
    beforeEach(() => {
      vi.spyOn(karafService, 'getKarafClientExecutable').mockReturnValue(path.join(tmpDir, 'bin', 'client.bat'));
      vi.spyOn(karafService, 'isKarafRunning').mockResolvedValue(true);
    });

    it('aborta execução com código 1 quando Karaf OSGi está offline', async () => {
      vi.spyOn(karafService, 'isKarafRunning').mockResolvedValueOnce(false);

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('bundle:list', (c) => chunks.push(c));

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('Karaf OSGi offline');
      expect(chunks.some((c) => c.includes('não está em execução'))).toBe(true);
      expect(chunks.some((c) => c.includes('💡 [DICA]'))).toBe(true);
    });

    it('detecta falha quando client.bat retorna exit code 0 com "Failed to get the session."', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: [
          'client.bat: Ignoring predefined value for KARAF_HOME',
          'Failed to get the session.',
          'Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8'
        ].join('\r\n'),
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('feature:repo-add mvn:com.br.com.pcsist/matcon/1.0/xml/features', (c) => chunks.push(c));

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('Failed to get the session.');
      expect(chunks.some((c) => c.includes('💡 [DICA] O cliente Karaf não conseguiu estabelecer sessão'))).toBe(true);
    });

    it('aplica timeout estendido de 300000ms para comandos pesados como feature:install e 60000ms para comandos normais', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      const runProcSpy = vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: 'Done',
        stderr: ''
      });

      await karafService.executeKarafCommand('feature:install -r winthor-integracao-matcon/1.39.23.45', () => {});
      expect(runProcSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(Function),
        300000
      );

      await karafService.executeKarafCommand('bundle:list', () => {});
      expect(runProcSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(Function),
        60000
      );
    });

    it('bloqueia comandos com caracteres perigosos (isSafeKarafCommand)', async () => {
      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('feature:list; rm -rf /', (c) => chunks.push(c));
      expect(res.code).toBe(1);
      expect(chunks.some((c) => c.includes('ERRO DE SEGURANÇA'))).toBe(true);
    });

    it('emite confirmação quando log:clear executa com sucesso sem retorno no stdout', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('log:clear', (c) => chunks.push(c));

      expect(res.code).toBe(0);
      expect(chunks.some((c) => c.includes('Buffer de logs em memória do Karaf (log:clear) limpo com sucesso'))).toBe(true);
      expect(res.stdout).toContain('[ OK ]');
    });

    it('faz fallback para winthor.log quando log:display retorna stdout vazio', async () => {
      const binDir = path.join(tmpDir, 'bin');
      const logDir = path.join(tmpDir, 'data', 'log');
      fs.mkdirSync(binDir, { recursive: true });
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');
      fs.writeFileSync(path.join(logDir, 'winthor.log'), 'Linha 1 do log\nLinha 2 do log\n', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('log:display -n 10', (c) => chunks.push(c));

      expect(res.code).toBe(0);
      expect(chunks.some((c) => c.includes('Buffer em memória vazio. Exibindo últimas'))).toBe(true);
      expect(chunks.some((c) => c.includes('Linha 2 do log'))).toBe(true);
    });

    it('informa que o buffer está vazio quando log:display não tem arquivo de log disponível', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('log:display -n 50', (c) => chunks.push(c));

      expect(res.code).toBe(0);
      expect(chunks.some((c) => c.includes('O buffer de logs em memória do Karaf está vazio'))).toBe(true);
    });

    it('emite feedback de sucesso quando um comando genérico finaliza com código 0 e sem saída', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('custom:command', (c) => chunks.push(c));

      expect(res.code).toBe(0);
      expect(chunks.some((c) => c.includes('executado com sucesso no Karaf (sem saída no console)'))).toBe(true);
    });

    it('detecta falha do Karaf com código 0 e ANSI escape codes no stdout (No matching features)', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: 'client.bat: Ignoring predefined value for KARAF_HOME\r\n \x1b[31mError executing command: No matching features for hub-carga-dados/0.0.1.SNAPSHOT \x1b[39m\r\nPicked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8\r\n',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand(
        'feature:install -r -u hub-carga-dados/0.0.1-SNAPSHOT',
        (c) => chunks.push(c)
      );

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('Error executing command: No matching features for hub-carga-dados/0.0.1.SNAPSHOT');
      expect(chunks.some((c) => c.includes('💡 [DICA] O Karaf não encontrou a feature no repositório'))).toBe(true);
    });

    it('detecta Command not found com código 0 como erro', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: 'Command not found: inexistente:cmd\r\n',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('inexistente:cmd', (c) => chunks.push(c));

      expect(res.code).toBe(1);
      expect(res.stderr).toContain('Command not found: inexistente:cmd');
    });

    it('não confunde logs de aplicação em log:display com erro de comando do shell', async () => {
      const binDir = path.join(tmpDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'client.bat'), '@echo off', 'utf-8');

      configService.saveSettings({ karafPath: tmpDir });

      vi.spyOn(processUtils, 'runCapturedProcess').mockResolvedValue({
        code: 0,
        stdout: '2026-09-18 10:00:00,123 | ERROR | pool-1-thread-1 | SomeService | Error executing command: falha em sub-tarefa antiga\r\n',
        stderr: ''
      });

      const chunks: string[] = [];
      const res = await karafService.executeKarafCommand('log:display -n 10', (c) => chunks.push(c));

      expect(res.code).toBe(0);
      expect(res.stderr).toBe('');
    });
  });

  describe('Gerenciamento de Bundles em Lote (manageBundlesBatch)', () => {
    it('retorna erro se nenhum ID numérico válido for fornecido', async () => {
      const res = await karafService.manageBundlesBatch('restart', ['abc', '']);
      expect(res.success).toBe(false);
      expect(res.output).toContain('Nenhum ID de bundle válido informado');
      expect(res.processedCount).toBe(0);
    });

    it('executa comando agrupado no Karaf para múltiplos bundles', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: '',
        stderr: ''
      });

      const res = await karafService.manageBundlesBatch('restart', ['10', '15', '20']);
      expect(res.success).toBe(true);
      expect(res.processedCount).toBe(3);
      expect(execSpy).toHaveBeenCalledWith(
        'bundle:restart 10 15 20',
        expect.any(Function),
        undefined
      );
    });

    it('executa bundle:refresh após desinstalação em lote bem-sucedida', async () => {
      const commandsExecuted: string[] = [];
      vi.spyOn(karafService, 'executeKarafCommand').mockImplementation(async (cmd) => {
        commandsExecuted.push(cmd);
        return { code: 0, stdout: '', stderr: '' };
      });

      const res = await karafService.manageBundlesBatch('uninstall', ['101', '102']);
      expect(res.success).toBe(true);
      expect(commandsExecuted).toEqual([
        'bundle:uninstall 101 102',
        'bundle:refresh'
      ]);
    });
  });

  describe('getResolvedJavaEnv e correção de caracteres VT100/setas no console', () => {
    it('remove a variável TERM no Windows para impedir que JLine instancie UnixTerminal', () => {
      try {
        // Simular ambiente com TERM preexistente
        process.env.TERM = 'xterm-256color';
        const env = karafService.getResolvedJavaEnv();

        if (process.platform === 'win32') {
          expect(env.TERM).toBeUndefined();
        } else {
          expect(env.TERM).toBe('xterm-256color');
        }
      } finally {
        delete process.env.TERM;
      }
    });

    it('injeta encoding UTF-8 nas variáveis de ambiente do Karaf', () => {
      const env = karafService.getResolvedJavaEnv();
      expect(env.JAVA_TOOL_OPTIONS).toContain('-Dfile.encoding=UTF-8');
      expect(env.COLUMNS).toBe('300');
      expect(env.LINES).toBe('1000');
    });
  });

  describe('Gerenciamento de Features Karaf (listInstalledFeatures, uninstallFeature, installFeature)', () => {
    it('listInstalledFeatures analisa a tabela de feature:list -i corretamente', async () => {
      const sampleOutput = `
Name                     │ Version        │ Required │ State   │ Repository             │ Description
─────────────────────────┼────────────────┼──────────┼─────────┼────────────────────────┼────────────────────────────────────────────────────────────
standard                 │ 4.4.6          │ x        │ Started │ standard-4.4.6         │ Karaf standard feature
winthor-integracao-varejo│ 1.0.0-SNAPSHOT │ x        │ Started │ hub-carga-dados        │ Rotina de integração de varejo WinThor
totvs-pdv-sync           │ 2.3.1          │          │ Started │ totvs-repo             │ Sincronização PDV
`;
      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: sampleOutput,
        stderr: ''
      });

      const features = await karafService.listInstalledFeatures();
      expect(features).toHaveLength(3);

      expect(features[0]).toEqual({
        name: 'standard',
        version: '4.4.6',
        required: true,
        state: 'Started',
        repository: 'standard-4.4.6',
        description: 'Karaf standard feature',
        isWinthor: false,
        installed: true
      });

      expect(features[1]).toEqual({
        name: 'winthor-integracao-varejo',
        version: '1.0.0-SNAPSHOT',
        required: true,
        state: 'Started',
        repository: 'hub-carga-dados',
        description: 'Rotina de integração de varejo WinThor',
        isWinthor: true,
        installed: true
      });

      expect(features[2].isWinthor).toBe(true);
      expect(features[2].required).toBe(false);
      expect(features[2].installed).toBe(true);
    });

    it('uninstallFeature executa comando feature:uninstall -r com nome e versão', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: 'Uninstalled feature winthor-integracao-varejo/1.0.0-SNAPSHOT',
        stderr: ''
      });

      const res = await karafService.uninstallFeature('winthor-integracao-varejo', '1.0.0-SNAPSHOT');
      expect(res.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith(
        'feature:uninstall -r winthor-integracao-varejo/1.0.0-SNAPSHOT',
        expect.any(Function),
        undefined
      );
    });

    it('uninstallFeature executa comando feature:uninstall -r apenas com nome quando versão omitida', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: 'Uninstalled feature winthor-integracao-varejo',
        stderr: ''
      });

      const res = await karafService.uninstallFeature('winthor-integracao-varejo');
      expect(res.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith(
        'feature:uninstall -r winthor-integracao-varejo',
        expect.any(Function),
        undefined
      );
    });

    it('uninstallFeature rejeita comandos com caracteres inseguros', async () => {
      const res = await karafService.uninstallFeature('winthor; rm -rf /');
      expect(res.success).toBe(false);
      expect(res.output).toContain('inválido ou não seguro');
    });

    it('installFeature executa comando feature:install -r -u', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: 'Installed feature hub-carga-dados/0.0.1-SNAPSHOT',
        stderr: ''
      });

      const res = await karafService.installFeature('hub-carga-dados', '0.0.1-SNAPSHOT');
      expect(res.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith(
        'feature:install -r -u hub-carga-dados/0.0.1-SNAPSHOT',
        expect.any(Function),
        undefined
      );
    });
  });

  describe('Monitor de Memória JVM (JMX e info)', () => {
    it('lança erro se o Karaf estiver offline ao buscar métricas de memória', async () => {
      vi.spyOn(karafService, 'isKarafRunning').mockResolvedValueOnce(false);
      await expect(karafService.getJvmMemoryMetrics()).rejects.toThrow('Karaf OSGi offline');
    });

    it('obtém métricas de memória Heap e Non-Heap via JMX com sucesso', async () => {
      vi.spyOn(karafService, 'isKarafRunning').mockResolvedValueOnce(true);

      vi.spyOn(karafService, 'executeKarafCommand')
        .mockResolvedValueOnce({
          code: 0,
          stdout: 'init = 268435456\nused = 536870912\ncommitted = 1073741824\nmax = 2147483648\n',
          stderr: ''
        })
        .mockResolvedValueOnce({
          code: 0,
          stdout: 'init = 2555904\nused = 67108864\ncommitted = 134217728\nmax = -1\n',
          stderr: ''
        })
        .mockResolvedValueOnce({
          code: 0,
          stdout: 'Threads\n  Live threads 50\n  Peak live threads 60\nUptime 5 hours\n',
          stderr: ''
        });

      const metrics = await karafService.getJvmMemoryMetrics();
      expect(metrics.source).toBe('jmx');
      expect(metrics.heapUsedMb).toBe(512);
      expect(metrics.heapMaxMb).toBe(2048);
      expect(metrics.nonHeapUsedMb).toBe(64);
      expect(metrics.liveThreads).toBe(50);
      expect(metrics.isNearOom).toBe(false);
    });

    it('faz fallback para "info" quando JMX não estiver disponível', async () => {
      vi.spyOn(karafService, 'isKarafRunning').mockResolvedValueOnce(true);

      vi.spyOn(karafService, 'executeKarafCommand')
        // JMX falha
        .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'MBean not found' })
        // Fallback info
        .mockResolvedValueOnce({
          code: 0,
          stdout: `
Memory
  Current heap size           524,288 kbytes
  Maximum heap size           1,048,576 kbytes
  Committed heap size         1,048,576 kbytes
Threads
  Live threads                35
Classes
  Current classes loaded      8,000
Uptime                        10 hours
`,
          stderr: ''
        });

      const metrics = await karafService.getJvmMemoryMetrics();
      expect(metrics.source).toBe('info');
      expect(metrics.heapUsedMb).toBe(512);
      expect(metrics.heapMaxMb).toBe(1024);
      expect(metrics.liveThreads).toBe(35);
      expect(metrics.classesLoaded).toBe(8000);
      expect(metrics.heapUsagePercent).toBe(50.0);
    });

    it('triggerGarbageCollection dispara jmx:run gc ou system:gc', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: 'Garbage collection completed',
        stderr: ''
      });

      const res = await karafService.triggerGarbageCollection();
      expect(res.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith('jmx:run java.lang:type=Memory gc', expect.any(Function), undefined, 15000);
    });
  });

  describe('Repositórios de Features Maven / Karaf', () => {
    it('listFeatureRepositories lista repositórios registrados', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: `
Repository | URL
standard-4.2.16 | mvn:org.apache.karaf.features/standard/4.2.16/xml/features
winthor-repo | mvn:br.com.totvs.winthor/features/1.0.0/xml/features
`,
        stderr: ''
      });

      const repos = await karafService.listFeatureRepositories();
      expect(repos.length).toBe(2);
      expect(repos[0].name).toBe('standard-4.2.16');
      expect(repos[1].isWinthor).toBe(true);
    });

    it('addFeatureRepository executa feature:repo-add', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 0,
        stdout: 'Adding feature repository',
        stderr: ''
      });

      const res = await karafService.addFeatureRepository('mvn:com.my/repo/1.0/xml/features');
      expect(res.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith(
        'feature:repo-add "mvn:com.my/repo/1.0/xml/features"',
        expect.any(Function),
        undefined,
        120000
      );
    });

    it('removeFeatureRepository e refreshFeatureRepository executam com sucesso', async () => {
      const execSpy = vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValue({
        code: 0,
        stdout: 'OK',
        stderr: ''
      });

      const remRes = await karafService.removeFeatureRepository('my-repo');
      expect(remRes.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith('feature:repo-remove "my-repo"', expect.any(Function), undefined);

      const refRes = await karafService.refreshFeatureRepository('my-repo');
      expect(refRes.success).toBe(true);
      expect(execSpy).toHaveBeenCalledWith('feature:repo-refresh "my-repo"', expect.any(Function), undefined, 60000);
    });
  });

  describe('Log Analyzer em KarafService', () => {
    it('analisa erros e exceções críticas em texto de log', () => {
      const log = '2026-09-29 [ERROR] ORA-00942: table or view does not exist\n[FATAL] java.lang.NullPointerException';
      const summary = karafService.analyzeLogText(log);
      expect(summary.totalErrors).toBe(2);
      expect(summary.oraErrorsCount).toBe(1);
      expect(summary.npeCount).toBe(1);
    });
  });
});


