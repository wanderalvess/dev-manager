import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  KarafService,
  parseClauseList,
  parseManifestHeaders,
  parseCapabilitiesWiredBundles
} from './KarafService';
import { ConfigService } from './ConfigService';

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
  });
});

