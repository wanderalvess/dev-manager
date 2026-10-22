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
    expect(res.previousValue).toBe('0.39.0');
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
  describe('versão declarada por propriedade', () => {
    const POM_WITH_PROPERTY = `<project>
  <properties>
    <matcon.version>1.39.23.45</matcon.version>
    <outra.version>2.0.0</outra.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>br.com.pcsist</groupId>
      <artifactId>winthor-integracao-matcon-service</artifactId>
      <version>\${matcon.version}</version>
    </dependency>
  </dependencies>
</project>`;

    it('altera a propriedade e mantém a referência na dependência', () => {
      const res = pomService.patchDependencyVersionInXml(POM_WITH_PROPERTY, {
        artifactId: 'winthor-integracao-matcon-service',
        newVersion: '0.0.1-SNAPSHOT'
      });
      expect(res.changed).toBe(true);
      expect(res.viaProperty).toBe('matcon.version');
      expect(res.previousValue).toBe('1.39.23.45');
      expect(res.oldVersion).toBe('${matcon.version}');
      expect(res.content).toContain('<matcon.version>0.0.1-SNAPSHOT</matcon.version>');
      expect(res.content).toContain('<version>${matcon.version}</version>');
      expect(res.content).toContain('<outra.version>2.0.0</outra.version>');
    });

    it('não altera nada quando a propriedade não está neste pom (vem do pai)', () => {
      const xml = POM_WITH_PROPERTY.replace('<matcon.version>1.39.23.45</matcon.version>', '');
      const res = pomService.patchDependencyVersionInXml(xml, {
        artifactId: 'winthor-integracao-matcon-service',
        newVersion: '0.0.1-SNAPSHOT'
      });
      expect(res.changed).toBe(false);
      expect(res.propertyNotInPom).toBe(true);
      expect(res.content).toBe(xml);
    });

    it('não mexe em ${project.version}', () => {
      const xml = POM_WITH_PROPERTY.replace('${matcon.version}', '${project.version}');
      const res = pomService.patchDependencyVersionInXml(xml, {
        artifactId: 'winthor-integracao-matcon-service',
        newVersion: '0.0.1-SNAPSHOT'
      });
      expect(res.changed).toBe(false);
      expect(res.propertyNotInPom).toBe(true);
    });
  });

  it('recusa versão com caracteres que poderiam quebrar o XML', () => {
    const pomPath = path.join(tempDir, 'pom.xml');
    fs.writeFileSync(pomPath, SAMPLE_CONSUMER_POM, 'utf-8');
    const res = pomService.updateDependencyVersion(
      tempDir,
      { artifactId: 'winthor-venda-service', newVersion: '1.0</version><x>' },
      false
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('Versão inválida');
    expect(fs.readFileSync(pomPath, 'utf-8')).toBe(SAMPLE_CONSUMER_POM);
  });
});
