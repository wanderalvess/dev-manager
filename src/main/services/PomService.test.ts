import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PomService } from './PomService';

describe('PomService', () => {
  let pomService: PomService;
  let tempDir: string;

  beforeEach(() => {
    pomService = new PomService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pom-service-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const SAMPLE_PARENT_POM = `
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>br.com.pcsist.winthor</groupId>
    <artifactId>winthor-parent</artifactId>
    <version>1.0.0</version>
  </parent>
  <groupId>br.com.pcsist.winthor.venda</groupId>
  <artifactId>winthor-venda</artifactId>
  <version>1.0.0.1-SNAPSHOT</version>
  <packaging>pom</packaging>
  <modules>
    <module>winthor-venda-client</module>
    <module>winthor-venda-service</module>
  </modules>
</project>
`;

  const SAMPLE_CONSUMER_POM = `
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <groupId>br.com.pcsist.winthor.pedido</groupId>
  <artifactId>winthor-pedido-venda</artifactId>
  <version>1.0.0.2-SNAPSHOT</version>
  <dependencies>
    <!-- Dependência de Venda -->
    <dependency>
      <groupId>br.com.pcsist.winthor.venda</groupId>
      <artifactId>winthor-venda-service</artifactId>
      <version>0.39.0</version>
    </dependency>
    <!-- Outra dependência qualquer -->
    <dependency>
      <groupId>org.apache.commons</groupId>
      <artifactId>commons-lang3</artifactId>
      <version>3.12.0</version>
    </dependency>
  </dependencies>
</project>
`;

  it('deve extrair as coordenadas do projeto ignorando o bloco parent', () => {
    const coords = pomService.parseCoordinatesFromXml(SAMPLE_PARENT_POM);
    expect(coords).not.toBeNull();
    expect(coords?.groupId).toBe('br.com.pcsist.winthor.venda');
    expect(coords?.artifactId).toBe('winthor-venda');
    expect(coords?.version).toBe('1.0.0.1-SNAPSHOT');
    expect(coords?.packaging).toBe('pom');
    expect(coords?.modules).toEqual(['winthor-venda-client', 'winthor-venda-service']);
  });

  it('deve listar as dependências declaradas no pom', () => {
    const deps = pomService.extractDependenciesFromXml(SAMPLE_CONSUMER_POM);
    expect(deps).toHaveLength(2);
    expect(deps[0].artifactId).toBe('winthor-venda-service');
    expect(deps[0].version).toBe('0.39.0');
    expect(deps[1].artifactId).toBe('commons-lang3');
  });

  it('deve atualizar cirurgicamente a versão de uma dependência mantendo os comentários e as outras intactas', () => {
    const res = pomService.patchDependencyVersionInXml(SAMPLE_CONSUMER_POM, {
      artifactId: 'winthor-venda-service',
      newVersion: '1.0.0.1-SNAPSHOT'
    });

    expect(res.changed).toBe(true);
    expect(res.oldVersion).toBe('0.39.0');
    expect(res.content).toContain('<version>1.0.0.1-SNAPSHOT</version>');
    expect(res.content).toContain('<!-- Dependência de Venda -->');
    expect(res.content).toContain('<version>3.12.0</version>'); // commons-lang3 inalterado
  });

  it('deve criar arquivo de backup .bak ao atualizar em disco', () => {
    const pomPath = path.join(tempDir, 'pom.xml');
    fs.writeFileSync(pomPath, SAMPLE_CONSUMER_POM, 'utf-8');

    const updateRes = pomService.updateDependencyVersion(
      tempDir,
      { artifactId: 'winthor-venda-service', newVersion: '1.0.0.5-SNAPSHOT' },
      true
    );

    expect(updateRes.success).toBe(true);
    expect(updateRes.backupPath).toBeDefined();
    expect(fs.existsSync(updateRes.backupPath!)).toBe(true);

    const updatedContent = fs.readFileSync(pomPath, 'utf-8');
    expect(updatedContent).toContain('<version>1.0.0.5-SNAPSHOT</version>');

    const backupContent = fs.readFileSync(updateRes.backupPath!, 'utf-8');
    expect(backupContent).toContain('<version>0.39.0</version>');
  });
});
